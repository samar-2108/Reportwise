import { NextRequest, NextResponse } from "next/server";
import { getLLMProvider, QuotaExceededError } from "@/lib/llm";
import { INTERPRETATION_SYSTEM_PROMPT, buildInterpretationUserPrompt } from "@/prompts/interpretation";
import { InterpretationResultSchema } from "@/lib/schemas/interpretation";
import { evaluateAllTests } from "@/lib/medical/deterministic-check";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assertOwnedPaths } from "@/lib/security/assert-owned-paths";
import { consumeRateLimit } from "@/lib/rate-limit";
import { userDailyCapLimiter } from "@/lib/rate-limit/daily-cap";
import { getServerEnv } from "@/lib/env";
import { reportCache, computeInputSha256 } from "@/lib/cache/report-cache";
import { usageTracker } from "@/lib/usage/tracker";
import { AnalyzeRequestSchema } from "@/lib/schemas/analyze-request";

const MAX_BODY_BYTES = 200 * 1024; // 200 KB

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large. Maximum request size is 200KB." },
        { status: 413 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parseResult = AnalyzeRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { reportId, reportType, tests, userProfile } = parseResult.data;

    // 1. Authenticate user using user-scoped client
    const serverSupabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in with Google to analyze lab reports." },
        { status: 401 }
      );
    }

    const userId = user.id;
    const env = getServerEnv();

    // 2. Rate limiting check (burst + daily limit)
    const burstCheck = await consumeRateLimit(userId, "analyze:burst", 10, 60);
    if (!burstCheck.allowed) {
      return NextResponse.json(
        { error: "Too many analysis requests. Please wait a moment and try again." },
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

    // 3. IDOR Defense: Verify report ownership before any modification
    let existingReport: { id: string; user_id: string; storage_file_paths: string[] | null } | null = null;
    let finalReportId: string;

    if (reportId) {
      const { data: foundReport, error: fetchError } = await serverSupabase
        .from("reports")
        .select("id, user_id, storage_file_paths")
        .eq("id", reportId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error verifying report ownership:", fetchError.message);
      }

      if (foundReport) {
        // Enforce strict ownership: a foreign user cannot modify another user's report
        if (foundReport.user_id !== userId) {
          return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }
        existingReport = foundReport;
        finalReportId = foundReport.id;
      } else {
        // ID did not exist; assign fresh server-generated UUID
        finalReportId = crypto.randomUUID();
      }
    } else {
      finalReportId = crypto.randomUUID();
    }

    // 4. Deterministic clinical evaluation layer
    const deterministicEvaluation = evaluateAllTests(tests);
    const hasCritical = deterministicEvaluation.hasCriticalValues;
    const criticalItems = deterministicEvaluation.tests.filter((t) => t.is_critical);

    // 5. Build prompt with verified clinical data
    const userPrompt = buildInterpretationUserPrompt({
      reportType: reportType || "Lab Report",
      tests: deterministicEvaluation.tests.map((t) => ({
        test: t.test,
        value: t.value,
        unit: t.unit,
        ref_range: t.ref_range,
        status: t.computed_status,
        severity: t.severity,
      })),
      criticalValues: criticalItems.map((c) => ({
        test: c.test,
        value: c.value,
        unit: c.unit,
        reason: c.critical_reason,
      })),
      userProfile: {
        age: userProfile?.age,
        sex: userProfile?.sex,
        dietPreference: userProfile?.dietPreference,
        language: userProfile?.language || "en",
      },
    });

    // 6. Generate structured interpretation with LLM Provider (Pass 2) or use cached result
    const inputHash = computeInputSha256({
      reportType,
      tests: deterministicEvaluation.tests.map((t) => ({
        test: t.test,
        value: t.value,
        status: t.computed_status,
      })),
      userProfile,
    });
    const cachedInterpretation = reportCache.getInterpretation(inputHash);
    let interpretation;

    if (cachedInterpretation) {
      usageTracker.recordCacheHit();
      interpretation = InterpretationResultSchema.parse(cachedInterpretation);
    } else {
      const provider = getLLMProvider();
      const rawInterpretation = await provider.generateStructured(
        userPrompt,
        INTERPRETATION_SYSTEM_PROMPT,
        InterpretationResultSchema
      );
      interpretation = rawInterpretation;
      reportCache.setInterpretation(inputHash, interpretation);
    }

    // Sanitize findings and severities against deterministic ground truth
    const normalTestNames = new Set(
      deterministicEvaluation.tests
        .filter((t) => t.computed_status === "normal")
        .map((t) => t.test.toLowerCase().trim())
    );

    interpretation.findings = (interpretation.findings ?? []).map((f) => {
      const related = f.related_tests ?? [];
      const matchingTest = deterministicEvaluation.tests.find((t) => {
        const tName = t.test.toLowerCase().trim();
        return (
          related.some((rt) => {
            const rtLower = rt.toLowerCase().trim();
            return rtLower === tName || rtLower.includes(tName) || tName.includes(rtLower);
          }) || f.title.toLowerCase().includes(tName)
        );
      });

      if (matchingTest && !f.title.includes(matchingTest.value)) {
        f.title = `${matchingTest.test}: ${matchingTest.value} ${matchingTest.unit || ""} - ${f.title}`;
      }

      if (!hasCritical && f.severity === "critical") {
        f.severity = "moderate";
      }

      if (related.length > 0) {
        const allRelatedAreNormal = related.every((rt) => {
          const lower = rt.toLowerCase().trim();
          return Array.from(normalTestNames).some((nt) => lower.includes(nt) || nt.includes(lower));
        });
        if (allRelatedAreNormal) {
          f.severity = "normal";
        }
      }

      return f;
    });

    // Ensure every test in the report has representation in Key Insights
    const coveredTestNames = new Set(
      (interpretation.findings ?? []).flatMap((f) => [
        ...(f.related_tests ?? []).map((rt) => rt.toLowerCase().trim()),
        f.title.toLowerCase().trim(),
      ])
    );

    for (const testItem of deterministicEvaluation.tests) {
      const nameLower = testItem.test.toLowerCase().trim();
      const isCovered = Array.from(coveredTestNames).some(
        (ct) => ct.includes(nameLower) || nameLower.includes(ct)
      );

      if (!isCovered) {
        const isNormal = testItem.computed_status === "normal";
        const explanation = isNormal
          ? `Your ${testItem.test} is ${testItem.value} ${testItem.unit || ""}, which falls within the printed reference range (${testItem.ref_range || "standard interval"}). This indicates expected, healthy function for this biomarker.`
          : `Your ${testItem.test} is ${testItem.value} ${testItem.unit || ""}, which falls ${testItem.computed_status === "low" ? "below" : "above"} the lab's printed reference range (${testItem.ref_range || "standard interval"}). Your doctor can review this marker alongside your clinical history.`;

        interpretation.findings.push({
          title: `${testItem.test}: ${testItem.value} ${testItem.unit || ""}`,
          explanation,
          related_tests: [testItem.test],
          severity: isNormal ? "normal" : testItem.is_critical ? "critical" : "mild",
        });
      }
    }

    // If deterministic evaluation found critical safety flags, ensure red_flags includes them
    if (hasCritical && deterministicEvaluation.criticalAlerts.length > 0) {
      const currentFlags = interpretation.red_flags ?? [];
      const mergedRedFlags = Array.from(
        new Set([...deterministicEvaluation.criticalAlerts, ...currentFlags])
      );
      interpretation.red_flags = mergedRedFlags;
    } else if (!hasCritical) {
      const allTestsNormal = deterministicEvaluation.tests.every((t) => t.computed_status === "normal");
      if (allTestsNormal) {
        interpretation.red_flags = [];
      } else {
        interpretation.red_flags = (interpretation.red_flags ?? []).filter((flag) => {
          const flagLower = flag.toLowerCase();
          const mentionsNormalOnly = Array.from(normalTestNames).some((nt) => {
            return nt.length > 2 && flagLower.includes(nt);
          });
          return !mentionsNormalOnly;
        });
      }
    }

    // 7. Update/Insert Database Record using user-scoped client
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
          language: userProfile?.language || "en",
          diet_preference: userProfile?.dietPreference || "veg",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (profileErr) {
      console.warn("Could not upsert profile:", profileErr);
    }

    const reportPayload = {
      title: reportType || "Lab Report",
      report_type: reportType || "Lab Report",
      status: "completed" as const,
      confirmed_data: JSON.parse(JSON.stringify(deterministicEvaluation.tests)),
      analysis_data: JSON.parse(JSON.stringify(interpretation)),
      updated_at: new Date().toISOString(),
    };

    if (existingReport) {
      const { error: updateError } = await serverSupabase
        .from("reports")
        .update(reportPayload)
        .eq("id", finalReportId)
        .eq("user_id", userId);

      if (updateError) {
        console.error("Supabase reports update error:", updateError.message);
      }
    } else {
      const { error: insertError } = await serverSupabase
        .from("reports")
        .insert({
          id: finalReportId,
          user_id: userId,
          ...reportPayload,
        });

      if (insertError) {
        console.error("Supabase reports insert error:", insertError.message);
      }
    }

    // 8. Auto-delete original medical storage files immediately after analysis
    try {
      const pathsToDelete = existingReport?.storage_file_paths || [];
      if (pathsToDelete.length > 0) {
        // Enforce path verification before calling storage remove
        const safePaths = assertOwnedPaths(userId, pathsToDelete);
        // Service-role client required to purge storage objects reliably
        const adminClient = getSupabaseAdminClient();
        if (adminClient) {
          await adminClient.storage.from("reports").remove(safePaths);
        }
        await serverSupabase
          .from("reports")
          .update({ storage_file_paths: [] })
          .eq("id", finalReportId)
          .eq("user_id", userId);
      }
    } catch (cleanupErr) {
      console.warn("Storage cleanup notice:", cleanupErr);
    }

    return NextResponse.json({
      reportId: finalReportId,
      reportType: reportType || "Lab Report",
      hasCriticalValues: hasCritical,
      confirmedTests: deterministicEvaluation.tests,
      analysis: interpretation,
    });
  } catch (error: unknown) {
    console.error("API /api/reports/analyze error:", error);

    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { error: "Failed to complete report analysis. Please try again." },
      { status: 500 }
    );
  }
}
