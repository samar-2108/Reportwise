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

function getSafeFileExtension(file: File): string {
  const mime = file.type?.toLowerCase() || "";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic")) return "heic";
  return "jpg";
}

export async function POST(request: NextRequest) {
  const storagePaths: string[] = [];
  let serverSupabaseInstance: Awaited<ReturnType<typeof getSupabaseServerClient>> | null = null;

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files were uploaded" }, { status: 400 });
    }

    if (files.length > 5) {
      return NextResponse.json({ error: "Maximum 5 pages allowed per report" }, { status: 400 });
    }

    // 1. Authenticate user using user-scoped client
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

    // 2. Check rate limits (burst + daily atomic caps)
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

    // Mirror to in-memory limiter for diagnostics
    userDailyCapLimiter.increment(userId);

    // 3. Convert files to LLMFile buffers and upload to user storage folder
    const llmFiles: LLMFile[] = [];
    const reportId = crypto.randomUUID();

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const buffer = Buffer.from(await f.arrayBuffer());
      const ext = getSafeFileExtension(f);

      llmFiles.push({
        mimeType: f.type || "image/jpeg",
        data: buffer,
      });

      // Strict server-generated filename prevents path traversal
      const safeFilePath = `${userId}/${reportId}/page-${i + 1}.${ext}`;

      const { error: uploadError } = await serverSupabase.storage
        .from("reports")
        .upload(safeFilePath, buffer, {
          contentType: f.type || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.warn(`Storage upload error for page ${i + 1}:`, uploadError.message);
      } else {
        storagePaths.push(safeFilePath);
      }
    }

    // 4. Create reports table row with status "processing" via user-scoped client
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
    console.error("API /api/reports/extract error:", error);

    // Auto-clean uploaded files on extraction failure
    if (serverSupabaseInstance && storagePaths.length > 0) {
      try {
        await serverSupabaseInstance.storage.from("reports").remove(storagePaths);
      } catch (cleanupErr) {
        console.warn("Failed to clean up files on extraction error:", cleanupErr);
      }
    }

    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { error: "Failed to extract values from report. Please verify your file and try again." },
      { status: 500 }
    );
  }
}
