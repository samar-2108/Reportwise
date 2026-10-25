import { ConfirmedItem } from "@/types/report";

export interface AttachedReportItem {
  id: string;
  title: string;
  reportDate?: string;
  tests?: ConfirmedItem[];
}

export function generateSuggestedQuestions(
  attachedReports: AttachedReportItem[]
): string[] {
  if (!attachedReports || attachedReports.length === 0) {
    return [
      "How do I read a blood test report?",
      "What foods help with low hemoglobin?",
      "What is a normal cholesterol level?",
      "How do I prepare for a blood test?",
    ];
  }

  // Collect all abnormal tests from attached reports
  const abnormalTests: Array<{ test: string; status: string }> = [];

  attachedReports.forEach((rep) => {
    (rep.tests || []).forEach((t) => {
      const isAbnormal =
        t.status === "high" ||
        t.status === "low" ||
        t.severity === "mild" ||
        t.severity === "moderate" ||
        t.severity === "severe" ||
        t.severity === "critical" ||
        t.is_critical;

      if (isAbnormal && !abnormalTests.some((a) => a.test.toLowerCase() === t.test.toLowerCase())) {
        abnormalTests.push({ test: t.test, status: t.status });
      }
    });
  });

  if (abnormalTests.length > 0) {
    const questions: string[] = [];
    const first = abnormalTests[0];
    const second = abnormalTests[1];

    if (first) {
      questions.push(`Why is my ${first.test} ${first.status || "abnormal"}?`);
      questions.push(`What diet or foods can improve my ${first.test}?`);
    }

    if (second) {
      questions.push(`Could my ${second.test} be related to my ${first.test}?`);
    } else {
      questions.push(`What questions should I ask my doctor about this report?`);
    }

    questions.push(`Are there lifestyle habits that support healthy levels?`);

    return questions.slice(0, 4);
  }

  // All normal report
  const firstTitle = attachedReports[0]?.title || "report";
  return [
    `Are all values in my ${firstTitle} normal?`,
    "What lifestyle habits help maintain these healthy levels?",
    "When should I get my next routine checkup?",
    "What questions should I ask my doctor about this report?",
  ];
}

