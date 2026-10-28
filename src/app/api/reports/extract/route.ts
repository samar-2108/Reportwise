import { NextRequest, NextResponse } from "next/server";
import { getLLMProvider, LLMFile, QuotaExceededError } from "@/lib/llm";
import { EXTRACTION_SYSTEM_PROMPT } from "@/prompts/extraction";
import { userDailyCapLimiter } from "@/lib/rate-limit/daily-cap";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ExtractionResultSchema } from "@/lib/schemas/extraction";
import { reportCache, computeFilesSha256 } from "@/lib/cache/report-cache";
import { usageTracker } from "@/lib/usage/tracker";
import {
  validateUploadedFiles,
  UploadValidationError,
} from "@/lib/security/upload-validation";

export async function POST(request: NextRequest) {
  const storagePaths: string[] = [];
  let serverSupabaseInstance: Awaited<ReturnType<typeof getSupabaseServerClient>> | null = null;

  try {
    const formData = await request.formData();
    const rawFiles = formData.getAll("files") as File[];

    // 1. Validate files against size limits and magic byte signatures
    const validatedFiles = await validateUploadedFiles(rawFiles);

    // 2. Authenticate user using user-scoped client
    const serverSupabase = await getSupabaseServerClient();
    serverSupabaseInstance = serverSupabase;
    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in with Google to upload and analyze your lab report." },
        { status: 401 }
      );
    }

    const userId = user.id;
    const env = getServerEnv();

    // 3. Check rate limits (burst + daily atomic caps)
    const burstCheck = await consumeRateLimit(userId, "extract:burst", 5, 60);
    if (!burstCheck.allowed) {
      return NextResponse.json(
        { error: "Too many upload requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const dailyCheck = await consumeRateLimit(
      userId,
      "analyses:daily",
      env.MAX_ANALYSES_PER_USER_PER_DAY,
      86400
    );
    if (!dailyCheck.allowed) {
      return NextResponse.json(
        {
          error: `Daily limit reached (${env.MAX_ANALYSES_PER_USER_PER_DAY} analyses/day). Please try again tomorrow.`,
        },
        { status: 429 }
      );
    }

    userDailyCapLimiter.increment(userId);

    // 4. Convert files to LLMFile buffers and upload to user storage folder
    const llmFiles: LLMFile[] = [];
    const reportId = crypto.randomUUID();

    for (let i = 0; i < validatedFiles.length; i++) {
      const f = validatedFiles[i];

      llmFiles.push({
        mimeType: f.mimeType,
        data: f.buffer,
      });

      // Strict server-generated filename prevents path traversal
      const safeFilePath = `${userId}/${reportId}/page-${i + 1}.${f.extension}`;

      const { error: uploadError } = await serverSupabase.storage
        .from("reports")
        .upload(safeFilePath, f.buffer, {
          contentType: f.mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.warn(`Storage upload error for page ${i + 1}:`, uploadError.message);
      } else {
        storagePaths.push(safeFilePath);
      }
    }

    // 5. Create reports table row with status "processing" via user-scoped client
    try {
      await serverSupabase.from("profiles").upsert(
        {
          id: userId,
          email: user.email ?? null,
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Patient",
          language: "en",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (profileErr) {
      console.warn("Could not upsert profile:", profileErr);
    }

    const { error: insertError } = await serverSupabase.from("reports").insert({
      id: reportId,
      user_id: userId,
      title: "Lab Report",
      status: "processing",
      storage_file_paths: storagePaths,
    });

    if (insertError) {
      console.error("Supabase insert report error in /api/reports/extract:", insertError.message);
    }

    // 6. Check SHA-256 cache or invoke LLM Pass 1 Extraction
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

    // 7. Update database row with extracted result
    const { error: updateError } = await serverSupabase
      .from("reports")
      .update({
        status: "extracted",
        report_type: "report_type" in validated ? validated.report_type : null,
        extracted_data: JSON.parse(JSON.stringify(validated)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Supabase update report error in /api/reports/extract:", updateError.message);
    }

    return NextResponse.json({
      reportId,
      ...validated,
    });
  } catch (error: unknown) {
    // Auto-clean uploaded files on extraction failure
    if (serverSupabaseInstance && storagePaths.length > 0) {
      try {
        await serverSupabaseInstance.storage.from("reports").remove(storagePaths);
      } catch (cleanupErr) {
        console.warn("Failed to clean up files on extraction error:", cleanupErr);
      }
    }

    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    console.error("API /api/reports/extract error:", error);
    return NextResponse.json(
      { error: "Failed to extract values from report. Please verify your file and try again." },
      { status: 500 }
    );
  }
}
