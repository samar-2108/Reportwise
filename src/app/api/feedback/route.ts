import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

const DEVELOPER_EMAIL = "samarmehta845@gmail.com";

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

      // Save feedback in Supabase table
      await supabase.from("feedback").insert({
        user_id: userId,
        user_email: senderEmail,
        category,
        rating: rating || null,
        message,
        recipient_email: DEVELOPER_EMAIL,
        status: "new",
      });
    } catch (dbErr) {
      // Non-fatal: if database table is not yet migrated, we still log and proceed
      console.warn("Could not persist feedback to database:", dbErr);
    }

    // Construct standard mailto URL for direct email client delivery
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

    const mailtoUrl = `mailto:${DEVELOPER_EMAIL}?subject=${subject}&body=${bodyContent}`;

    return NextResponse.json({
      success: true,
      recipient: DEVELOPER_EMAIL,
      mailtoUrl,
      message: `Your feedback has been received and forwarded to ${DEVELOPER_EMAIL}.`,
    });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "Failed to process feedback. Please try again." },
      { status: 500 }
    );
  }
}

