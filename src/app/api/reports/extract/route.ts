import { NextRequest, NextResponse } from "next/server";
import { getLLMProvider, LLMFile, QuotaExceededError } from "@/lib/llm";
import { EXTRACTION_SYSTEM_PROMPT } from "@/prompts/extraction";
import { userDailyCapLimiter } from "@/lib/rate-limit/daily-cap";
import { getSupabaseAdminClient, DEBUG_USER_ID, ensureDebugUser } from "@/lib/supabase/admin";
import { ExtractionResultSchema } from "@/lib/schemas/extraction";
import { reportCache, computeFilesSha256 } from "@/lib/cache/report-cache";
import { usageTracker } from "@/lib/usage/tracker";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files were uploaded" }, { status: 400 });
    }

    if (files.length > 5) {
      return NextResponse.json({ error: "Maximum 5 pages allowed per report" }, { status: 400 });
    }

    // 1. Debug mode: authentication bypassed using provisioned debug user UUID
    const userId = DEBUG_USER_ID;
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      await ensureDebugUser(supabase);
    }

    // 2. Check per-user daily quota limit
    const limitCheck = userDailyCapLimiter.checkLimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: `Daily limit reached (${limitCheck.limit} analyses/day). Please try again tomorrow.`,
        },
        { status: 429 }
      );
    }

    // 3. Convert files to LLMFile buffers
    const llmFiles: LLMFile[] = [];
    const storagePaths: string[] = [];
    const reportId = crypto.randomUUID();

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const buffer = Buffer.from(await f.arrayBuffer());
      llmFiles.push({
        mimeType: f.type || "image/jpeg",
        data: buffer,
      });

      // Upload to private Supabase storage bucket if configured
      if (supabase) {
        const filePath = `${userId}/${reportId}/page-${i + 1}-${f.name}`;
        const { error: uploadError } = await supabase.storage
          .from("reports")
          .upload(filePath, buffer, {
            contentType: f.type || "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          console.warn(`Supabase storage upload error for page ${i + 1}:`, uploadError);
        } else {
          storagePaths.push(filePath);
        }
      }
    }

    // 4. Create reports table row with status "processing"
    if (supabase) {
      try {
        await supabase.from("profiles").upsert(
          {
            id: userId,
            full_name: "Debug User",
            language: "en",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      } catch (profileErr) {
        console.warn("Could not upsert debug profile:", profileErr);
      }

      const { error: insertError } = await supabase.from("reports").insert({
        id: reportId,
        user_id: userId,
        title: "Lab Report",
        status: "processing",
        storage_file_paths: storagePaths,
      });

      if (insertError) {
        console.error("Supabase insert report error in /api/reports/extract:", insertError);
      } else {
        console.log(`Report row ${reportId} created in 'processing' status`);
      }
    }

    // 5. Check SHA-256 cache or invoke LLM Pass 1 Extraction
    const fileHash = computeFilesSha256(llmFiles);
    const cachedExtraction = reportCache.getExtraction(fileHash);
    let validated;

    if (cachedExtraction) {
      usageTracker.recordCacheHit();
      validated = ExtractionResultSchema.parse(cachedExtraction);
    } else {
      const provider = getLLMProvider();
      const rawResult = await provider.extractFromFiles(llmFiles, EXTRACTION_SYSTEM_PROMPT);
      validated = ExtractionResultSchema.parse(rawResult);
      reportCache.setExtraction(fileHash, validated);
    }

    // 6. Update database row with extracted result
    if (supabase) {
      const { error: updateError } = await supabase
        .from("reports")
        .update({
          status: "extracted",
          report_type: "report_type" in validated ? validated.report_type : null,
          extracted_data: JSON.parse(JSON.stringify(validated)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (updateError) {
        console.error("Supabase update report error in /api/reports/extract:", updateError);
      }
    }

    return NextResponse.json({
      reportId,
      ...validated,
    });
  } catch (error: unknown) {
    console.error("API /api/reports/extract error:", error);

    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract values from report" },
      { status: 500 }
    );
  }
}
