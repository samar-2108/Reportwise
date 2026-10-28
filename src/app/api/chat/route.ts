import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getLLMProvider } from "@/lib/llm";
import { QuotaExceededError } from "@/lib/llm/types";
import { userDailyCapLimiter } from "@/lib/rate-limit/daily-cap";
import { consumeRateLimit } from "@/lib/rate-limit";
import { buildChatSystemPrompt } from "@/prompts/chat";
import { buildReportsContext, resolveNaturalLanguageReport } from "@/lib/chat/context-builder";
import { ConfirmedItem } from "@/types/report";
import { ReportRow } from "@/types/database";
import { safeErrorResponse } from "@/lib/security/safe-error";

const ChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1, "Message cannot be empty").max(500, "Message exceeds 500 characters limit"),
  attachedReportIds: z.array(z.string().uuid()).max(3, "Maximum 3 reports can be attached").optional().default([]),
});

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to ask ReportWise." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const { message, attachedReportIds } = parsed.data;
    let conversationId = parsed.data.conversationId;
    const userId = user.id;

    // Chat rate limiting (burst 10/min, daily cap 50/day)
    const burstCheck = await consumeRateLimit(userId, "chat:burst", 10, 60);
    if (!burstCheck.allowed) {
      return NextResponse.json(
        { error: "Too many messages sent. Please slow down and try again in a minute." },
        { status: 429 }
      );
    }

    const dayCheck = await consumeRateLimit(userId, "chat:day", 50, 86400);
    if (!dayCheck.allowed) {
      return NextResponse.json(
        {
          error: "Daily health question quota reached. Please try again tomorrow.",
          quotaExceeded: true,
        },
        { status: 429 }
      );
    }

    // 1. Validate or Create Conversation
    let conversationTitle = "New Chat";
    if (conversationId) {
      const { data: conv } = await supabase
        .from("chat_conversations")
        .select("id, title")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!conv) {
        // Fallback: create fresh conversation if not found
        conversationId = undefined;
      } else {
        conversationTitle = conv.title;
      }
    }

    if (!conversationId) {
      // Auto-title locally from the first user message (truncate locally, no extra LLM call)
      conversationTitle = message.length > 36 ? `${message.slice(0, 36).trim()}...` : message;
      const { data: newConv, error: convError } = await supabase
        .from("chat_conversations")
        .insert({
          user_id: userId,
          title: conversationTitle,
        })
        .select("id, title")
        .single();

      if (convError || !newConv) {
        console.error("Failed to create conversation:", convError);
        return NextResponse.json({ error: "Failed to initialize conversation" }, { status: 500 });
      }
      conversationId = newConv.id;
    }

    // 2. Fetch User's Reports for Context & Ownership Verification
    const { data: userReportsData } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId);

    const userReports: ReportRow[] = userReportsData || [];

    // Check natural language auto-attachment (e.g. "my latest report")
    let autoAttachedReport: ReportRow | null = null;
    const finalAttachedIds = [...attachedReportIds];

    if (finalAttachedIds.length === 0 || /latest|last|recent/i.test(message)) {
      const resolved = resolveNaturalLanguageReport(message, userReports);
      if (resolved && !finalAttachedIds.includes(resolved.id)) {
        if (finalAttachedIds.length < 3) {
          finalAttachedIds.push(resolved.id);
          autoAttachedReport = resolved;
        }
      }
    }

    // Strict ownership verification: only include reports that strictly belong to this user
    const matchedReports = userReports.filter((r) => finalAttachedIds.includes(r.id));

    // 3. Fetch User Profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    // 4. Fetch Conversation History (last 10 messages window to preserve tokens)
    const { data: historyData } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const history = (historyData || []).reverse();

    // Check if assistant already reminded to attach reports in this conversation
    const hasRemindedToAttach = history.some(
      (m) => m.role === "assistant" && m.content.toLowerCase().includes("attach your lab report")
    );

    // 5. Build Context and System Prompt
    const hasAttachedReports = matchedReports.length > 0;
    const attachedReportsContext = hasAttachedReports
      ? buildReportsContext(matchedReports, profile)
      : undefined;

    const systemPrompt = buildChatSystemPrompt({
      attachedReportsContext,
      hasAttachedReports,
      userProfile: profile || undefined,
      language: profile?.language === "hi" ? "hi" : "en",
      hasRemindedToAttach,
    });

    // 6. Format Messages for Gemini LLM
    const llmMessages = [
      ...history.map((h) => ({
        role: h.role as "user" | "assistant" | "system",
        content: h.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    // 7. Invoke LLM Provider with Backoff & Error Handling
    const llm = getLLMProvider();
    let assistantReply = "";

    try {
      assistantReply = await llm.generateChatResponse(llmMessages, systemPrompt);
    } catch (err: unknown) {
      if (err instanceof QuotaExceededError) {
        return NextResponse.json(
          {
            error: "Our AI service capacity is currently full. Please try again shortly.",
            quotaExceeded: true,
          },
          { status: 429 }
        );
      }
      console.error("Chat generation error:", err);
      return NextResponse.json(
        { error: "Failed to generate health guidance. Please try again." },
        { status: 500 }
      );
    }

    // Increment user daily limiter
    userDailyCapLimiter.increment(userId);

    // 8. Save User Message and Assistant Message in DB
    const { data: savedUserMsg } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "user",
        content: message,
      })
      .select("id, created_at")
      .single();

    const { data: savedAssistantMsg } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "assistant",
        content: assistantReply,
      })
      .select("id, created_at")
      .single();

    // Update conversation timestamp
    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Prepare response
    const autoAttachedSummary = autoAttachedReport
      ? {
          id: autoAttachedReport.id,
          title: autoAttachedReport.report_type || autoAttachedReport.title || "Lab Report",
          reportDate: autoAttachedReport.report_date || undefined,
          tests: (autoAttachedReport.confirmed_data ||
            (autoAttachedReport.extracted_data as { tests?: ConfirmedItem[] })?.tests ||
            []) as ConfirmedItem[],
        }
      : undefined;

    return NextResponse.json({
      conversationId,
      conversationTitle,
      userMessage: {
        id: savedUserMsg?.id || crypto.randomUUID(),
        role: "user",
        content: message,
        createdAt: savedUserMsg?.created_at || new Date().toISOString(),
      },
      message: {
        id: savedAssistantMsg?.id || crypto.randomUUID(),
        role: "assistant",
        content: assistantReply,
        createdAt: savedAssistantMsg?.created_at || new Date().toISOString(),
      },
      autoAttachedReport: autoAttachedSummary,
    });
  } catch (error: unknown) {
    return safeErrorResponse(
      error,
      "An unexpected error occurred while processing your message. Please try again.",
      500
    );
  }
}
