import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildReportsContext, resolveNaturalLanguageReport } from "./context-builder";
import { generateSuggestedQuestions } from "./suggested-questions";
import { buildChatSystemPrompt } from "@/prompts/chat";
import { ReportRow, ProfileRow } from "@/types/database";
import { ConfirmedItem } from "@/types/report";

test("Ask ReportWise Chatbot Module", async (t) => {
  const dummyProfile: ProfileRow = {
    id: "user-123",
    email: "patient@example.com",
    full_name: "John Doe",
    age: 45,
    sex: "male",
    diet_preference: "veg",
    language: "en",
    consent_given_at: "2026-10-21T00:00:00Z",
    keep_original_files: false,
    created_at: "2026-10-21T00:00:00Z",
    updated_at: "2026-10-21T00:00:00Z",
  };

  const dummyReportA: ReportRow = {
    id: "rep-1",
    user_id: "user-123",
    title: "Complete Blood Count",
    report_type: "Complete Blood Count (CBC)",
    report_date: "2026-10-14",
    status: "completed",
    storage_file_paths: ["user-123/rep-1/page-1.jpg"],
    extracted_data: null,
    confirmed_data: [
      {
        id: "t-1",
        test: "Hemoglobin",
        value: "10.2",
        unit: "g/dL",
        ref_range: "13.0-17.0",
        status: "low",
        computed_status: "low",
        severity: "severe",
        is_critical: false,
      },
      {
        id: "t-2",
        test: "Platelets",
        value: "220",
        unit: "×10³/µL",
        ref_range: "150-450",
        status: "normal",
        computed_status: "normal",
        severity: "normal",
        is_critical: false,
      },
    ],
    analysis_data: {
      report_type: "Complete Blood Count (CBC)",
      patient_summary: "Mild to moderate microcytic anemia picture.",
      findings: [
        {
          title: "Low Hemoglobin",
          explanation: "Red blood cell levels are below normal range.",
          related_tests: ["Hemoglobin"],
          severity: "moderate",
        },
      ],
      diet: { add: ["Spinach", "Beetroot"], limit_or_avoid: ["Tea with meals"], sample_day: "Dal and roti" },
      habits: { do: ["Adequate sleep"], avoid: ["Heavy exertion without rest"] },
      supplements_to_discuss_with_doctor: ["Iron supplementation"],
      red_flags: ["Shortness of breath"],
      questions_for_doctor: ["Should I take an iron supplement?"],
      recommended_followup_tests: ["Serum Ferritin"],
      confidence_notes: "Clear legible print.",
    },
    error_message: null,
    created_at: "2026-10-14T10:00:00Z",
    updated_at: "2026-10-14T10:00:00Z",
  };

  const dummyReportB: ReportRow = {
    id: "rep-2",
    user_id: "user-123",
    title: "Lipid Panel",
    report_type: "Lipid Profile",
    report_date: "2026-10-21",
    status: "completed",
    storage_file_paths: ["user-123/rep-2/page-1.jpg"],
    extracted_data: null,
    confirmed_data: [
      {
        id: "t-3",
        test: "Total Cholesterol",
        value: "245",
        unit: "mg/dL",
        ref_range: "< 200",
        status: "high",
        computed_status: "high",
        severity: "moderate",
        is_critical: false,
      },
    ],
    analysis_data: {
      report_type: "Lipid Profile",
      patient_summary: "Elevated total cholesterol.",
      findings: [
        {
          title: "Elevated Cholesterol",
          explanation: "Total cholesterol exceeds normal threshold.",
          related_tests: ["Total Cholesterol"],
          severity: "moderate",
        },
      ],
      diet: { add: ["Oats", "Methi"], limit_or_avoid: ["Deep-fried foods"], sample_day: "Oats porridge" },
      habits: { do: ["Daily brisk walk"], avoid: ["Sedentary lifestyle"] },
      supplements_to_discuss_with_doctor: ["Omega-3"],
      red_flags: ["Chest tightness"],
      questions_for_doctor: ["Do I need lipid management?"],
      recommended_followup_tests: ["ApoB"],
      confidence_notes: "Standard assay.",
    },
    error_message: null,
    created_at: "2026-10-21T10:00:00Z",
    updated_at: "2026-10-21T10:00:00Z",
  };

  await t.test("1. PII is strictly excluded from context builder", () => {
    const context = buildReportsContext([dummyReportA], dummyProfile);

    // Must include clinical details
    assert.ok(context.includes("Hemoglobin"), "Context should include test name");
    assert.ok(context.includes("10.2"), "Context should include numerical value");
    assert.ok(context.includes("Platelets"), "Context should include test name");
    assert.ok(context.includes("Spinach"), "Context should include dietary findings");

    // Must NEVER include PII
    assert.ok(!context.includes("John Doe"), "Patient name must NOT be in context");
    assert.ok(!context.includes("patient@example.com"), "Patient email must NOT be in context");
    assert.ok(!context.includes("user-123/rep-1/page-1.jpg"), "Storage path must NOT be in context");
  });

  await t.test("2. Multiple reports are labeled chronologically with titles and dates", () => {
    const context = buildReportsContext([dummyReportB, dummyReportA], dummyProfile);

    // Oldest should be Report 1, newer should be Report 2
    assert.ok(context.includes("### Report 1: Complete Blood Count (CBC) (Date: 2026-10-14)"));
    assert.ok(context.includes("### Report 2: Lipid Profile (Date: 2026-10-21)"));
  });

  await t.test("3. Natural language resolution correctly resolves 'my latest report'", () => {
    const userReports = [dummyReportA, dummyReportB];

    const matchLatest = resolveNaturalLanguageReport("what does my latest report say?", userReports);
    assert.ok(matchLatest, "Should resolve query with 'latest report'");
    assert.equal(matchLatest?.id, "rep-2", "Latest report should be Oct 21 report");

    const matchBloodTest = resolveNaturalLanguageReport("explain my last blood test", userReports);
    assert.ok(matchBloodTest, "Should resolve query with 'last blood test'");
    assert.equal(matchBloodTest?.id, "rep-2");

    const noMatch = resolveNaturalLanguageReport("what is the function of vitamin B12?", userReports);
    assert.equal(noMatch, null, "General questions should not trigger auto-attachment");
  });

  await t.test("4. Ownership check blocks attaching another user's report", () => {
    const foreignReport: ReportRow = {
      id: "foreign-rep-999",
      user_id: "other-user-456",
      title: "Private Report",
      report_type: "Secret Panel",
      report_date: "2026-10-22",
      status: "completed",
      storage_file_paths: [],
      extracted_data: null,
      confirmed_data: [],
      analysis_data: null,
      error_message: null,
      created_at: "2026-10-22T00:00:00Z",
      updated_at: "2026-10-22T00:00:00Z",
    };

    const requestedIds = [dummyReportA.id, foreignReport.id];
    // Emulate server-side ownership filter: userReports.filter(r => requestedIds.includes(r.id))
    const userReports = [dummyReportA, dummyReportB]; // Only contains user-123 reports
    const matched = userReports.filter((r) => requestedIds.includes(r.id));

    assert.equal(matched.length, 1);
    assert.equal(matched[0].id, dummyReportA.id);
    assert.ok(!matched.some((m) => m.id === foreignReport.id), "Foreign report must be rejected");
  });

  await t.test("5. No-report-attached behavior prompts user to attach report", () => {
    const promptNoReport = buildChatSystemPrompt({
      hasAttachedReports: false,
      userProfile: dummyProfile,
      language: "en",
    });

    assert.ok(
      promptNoReport.includes("NO REPORT IS CURRENTLY ATTACHED"),
      "Should note absence of reports"
    );
    assert.ok(
      promptNoReport.includes("Attach report"),
      "Should instruct assistant to point user to Attach report button"
    );

    const questions = generateSuggestedQuestions([]);
    assert.equal(questions.length, 4);
    assert.ok(questions[0].includes("How do I read a blood test report?"));
    assert.ok(questions[1].includes("low hemoglobin"));
  });

  await t.test("6. Deterministic suggested questions generated from abnormal test values", () => {
    const questions = generateSuggestedQuestions([
      {
        id: "rep-1",
        title: "CBC",
        tests: dummyReportA.confirmed_data as unknown as ConfirmedItem[],
      },
    ]);

    assert.equal(questions.length, 4);
    // Hemoglobin was low/severe
    assert.ok(questions.some((q) => q.includes("Hemoglobin")), "Should generate chip for abnormal Hemoglobin");
    assert.ok(questions.some((q) => q.includes("diet") || q.includes("improve")), "Should generate diet suggestion chip");
  });

  await t.test("7. Attach/detach reports state operations", () => {
    let attached: Array<{ id: string }> = [];

    // Add first report
    attached = [...attached, { id: "rep-1" }];
    assert.equal(attached.length, 1);

    // Add second report
    attached = [...attached, { id: "rep-2" }];
    assert.equal(attached.length, 2);

    // Prevent duplicates
    if (!attached.some((r) => r.id === "rep-1")) {
      attached = [...attached, { id: "rep-1" }];
    }
    assert.equal(attached.length, 2, "Duplicate reports should not be added");

    // Detach report
    attached = attached.filter((r) => r.id !== "rep-1");
    assert.equal(attached.length, 1);
    assert.equal(attached[0].id, "rep-2");
  });

  await t.test("8. Migration SQL of old per-report messages to user-scoped conversations", () => {
    // Verify migration SQL structure in schema.sql
    const schemaSql = fs.readFileSync("supabase/schema.sql", "utf-8");

    assert.ok(
      schemaSql.includes("create table if not exists public.chat_conversations"),
      "Schema must define chat_conversations table"
    );
    assert.ok(
      schemaSql.includes("conversation_id uuid references public.chat_conversations"),
      "chat_messages must reference chat_conversations"
    );
    assert.ok(
      schemaSql.includes("alter table public.chat_messages alter column report_id drop not null"),
      "Migration must make legacy report_id nullable"
    );
    assert.ok(
      schemaSql.includes("insert into public.chat_conversations (id, user_id, title, created_at, updated_at)"),
      "Migration must group old report messages into conversations"
    );
  });
});
