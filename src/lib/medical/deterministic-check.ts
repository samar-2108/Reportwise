import { ExtractedItem } from "@/lib/schemas/extraction";
import { ConfirmedItem, ComputedStatus } from "@/types/report";
import {
  classify,
  parseReferenceRange,
  extractNumericValue,
  ClassificationResult,
} from "@/lib/clinical/classify";

export { parseReferenceRange, extractNumericValue };

/**
 * Evaluates an extracted test item deterministically using the clinical panic values
 * and classification module.
 */
export function evaluateTestItem(item: ExtractedItem, index: number): ConfirmedItem {
  const classification: ClassificationResult = classify({
    testName: item.test,
    value: item.value,
    range: item.ref_range,
    unit: item.unit,
  });

  let computedStatus: ComputedStatus = "unknown";
  if (classification.severity === "critical") {
    computedStatus = classification.status === "low" ? "critical-low" : "critical-high";
  } else if (classification.status === "low") {
    computedStatus = "low";
  } else if (classification.status === "high") {
    computedStatus = "high";
  } else if (classification.status === "normal") {
    computedStatus = "normal";
  }

  return {
    ...item,
    id: `item-${index}-${Date.now()}`,
    computed_status: computedStatus,
    severity: classification.severity,
    is_critical: classification.isCritical,
    is_verify: classification.isVerify,
    verify_message: classification.isVerify ? classification.message : undefined,
    critical_reason: classification.isCritical ? classification.message : undefined,
  };
}

/**
 * Batch evaluates all extracted items
 */
export function evaluateAllTests(items: ExtractedItem[]): {
  tests: ConfirmedItem[];
  hasCriticalValues: boolean;
  criticalAlerts: string[];
  hasVerifyValues: boolean;
  verifyAlerts: string[];
} {
  const evaluated = items.map((item, idx) => evaluateTestItem(item, idx));
  const criticalItems = evaluated.filter((t) => t.is_critical);
  const verifyItems = evaluated.filter((t) => t.is_verify);

  return {
    tests: evaluated,
    hasCriticalValues: criticalItems.length > 0,
    criticalAlerts: criticalItems
      .map((c) => c.critical_reason || `Critical value detected for ${c.test} (${c.value} ${c.unit || ""})`)
      .filter(Boolean) as string[],
    hasVerifyValues: verifyItems.length > 0,
    verifyAlerts: verifyItems
      .map((v) => `${v.test}: ${v.verify_message || "Please double-check this extracted value"}`)
      .filter(Boolean) as string[],
  };
}
