import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";

const FeedbackSchema = z.object({
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  category: z.enum([
    "general",
    "bug_report",
    "parsing_issue",
    "medical_accuracy",
    "feature_request",
  ]),
  rating: z.enum(["1", "2", "3", "4", "5"]).optional(),
  message: z.string().min(5, "Please enter at least 5 characters of feedback").max(2000),
});

const DEFAULT_RECIPIENT_EMAIL = "samarmehta845@gmail.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = FeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid feedback data" },
        { status: 400 }
      );
    }

    const { email, category, rating, message } = parsed.data;

    // Check authenticated user if available
    let userId: string | null = null;
    let senderEmail = email || null;

    try {
      const supabase = await getSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
        if (!senderEmail) {
          senderEmail = user.email ?? null;
        }
      }
    } catch {
      // Unauthenticated visitor feedback
    }

    // Rate limiting: 5 feedback submissions per hour per user / IP
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous-client";
    const rateLimitKey = userId || `ip:${clientIp}`;

    const limitCheck = await consumeRateLimit(rateLimitKey, "feedback:hour", 5, 3600);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: "Too many feedback submissions. Please try again in an hour." },
        { status: 429 }
      );
    }

    const recipientEmail = process.env.FEEDBACK_RECIPIENT_EMAIL || DEFAULT_RECIPIENT_EMAIL;

    // Save feedback to database if available
    try {
      const supabase = await getSupabaseServerClient();
      await supabase.from("feedback").insert({
        user_id: userId,
        user_email: senderEmail,
        category,
        rating: rating || null,
        message,
        recipient_email: recipientEmail,
        status: "new",
      });
    } catch (dbErr) {
      console.warn("Could not persist feedback to database:", dbErr);
    }

    // Construct mailto link
    const categoryLabels: Record<string, string> = {
      general: "General Feedback",
      bug_report: "Bug Report",
      parsing_issue: "Report Parsing Issue",
      medical_accuracy: "Medical Explanation Feedback",
      feature_request: "Feature Request",
    };

    const subject = encodeURIComponent(
      `[ReportWise Feedback] ${categoryLabels[category] || "User Feedback"}${
        rating ? ` (${rating}★)` : ""
      }`
    );

    const bodyContent = encodeURIComponent(
      `From: ${senderEmail || "Anonymous User"}\nCategory: ${
        categoryLabels[category] || category
      }\nRating: ${rating ? `${rating} / 5 Stars` : "Not provided"}\n\nFeedback:\n${message}\n\n---\nSent via ReportWise Web App`
    );

    const mailtoUrl = `mailto:${recipientEmail}?subject=${subject}&body=${bodyContent}`;

    return NextResponse.json({
      success: true,
      mailtoUrl,
      message: "Your feedback has been received and forwarded to our team.",
    });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "Failed to process feedback. Please try again." },
      { status: 500 }
    );
  }
}
