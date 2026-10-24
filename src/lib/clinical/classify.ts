import {
  getPanicConfig,
  unitsMatch,
  PanicValueConfig,
} from "./panic-values";

export type ClinicalSeverity =
  | "normal"
  | "mild"
  | "moderate"
  | "severe"
  | "critical"
  | "verify"
  | "unknown";

export type ComputedStatus = "normal" | "low" | "high" | "unknown";

export interface ClassifyInput {
  testName?: string;
  value: number | string;
  range?: string | { min?: number | null; max?: number | null } | null;
  unit?: string | null;
  panicConfigOverride?: PanicValueConfig | null;
}

export interface ClassificationResult {
  severity: ClinicalSeverity;
  status: ComputedStatus;
  isCritical: boolean;
  isVerify: boolean;
  message?: string;
  flagReason?: string;
  d?: number;
  r?: number;
  excess?: number;
  v?: number;
  L?: number | null;
  H?: number | null;
}

/**
 * Extracts a numeric value from a number or string
 */
export function extractNumericValue(raw: number | string): number | null {
  if (typeof raw === "number") return isNaN(raw) ? null : raw;
  if (!raw) return null;
  const cleaned = String(raw).replace(/,/g, "").trim();
  const match = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}

/**
 * Parses printed reference range strings into numeric L (min) & H (max).
 * Uses positive number matching to prevent hyphens between numbers being
 * misinterpreted as negative signs (e.g. "70-100", "150-450").
 */
export function parseReferenceRange(
  rawRange?: string | { min?: number | null; max?: number | null } | null
): { min: number | null; max: number | null } {
  if (!rawRange) return { min: null, max: null };

  if (typeof rawRange === "object") {
    return {
      min: rawRange.min !== undefined ? rawRange.min : null,
      max: rawRange.max !== undefined ? rawRange.max : null,
    };
  }

  const str = String(rawRange).replace(/,/g, "").trim();
  if (!str) return { min: null, max: null };

  // Pattern: "< 200" or "<= 200" or "less than 200" or "up to 200"
  if (str.startsWith("<") || str.toLowerCase().includes("less than") || str.toLowerCase().includes("up to")) {
    const numMatch = str.match(/\d+(?:\.\d+)?/);
    return { min: 0, max: numMatch ? parseFloat(numMatch[0]) : null };
  }

  // Pattern: "> 40" or ">= 40" or "greater than 40" or "more than 40"
  if (str.startsWith(">") || str.toLowerCase().includes("greater than") || str.toLowerCase().includes("more than")) {
    const numMatch = str.match(/\d+(?:\.\d+)?/);
    return { min: numMatch ? parseFloat(numMatch[0]) : null, max: null };
  }

  // Interval pattern: "12.0 - 15.5", "12-16", "70-100", "150-450", "0.6 to 1.2"
  const numbers = str.match(/\d+(?:\.\d+)?/g);
  if (numbers && numbers.length >= 2) {
    const v1 = parseFloat(numbers[0]);
    const v2 = parseFloat(numbers[1]);
    if (!isNaN(v1) && !isNaN(v2)) {
      return { min: Math.min(v1, v2), max: Math.max(v1, v2) };
    }
  }

  return { min: null, max: null };
}

/**
 * Checks if a qualitative result represents a clinically normal finding
 */
function isQualitativeNormal(raw: number | string): boolean {
  if (typeof raw === "number") return false;
  const s = String(raw).toLowerCase().trim();
  return [
    "normal",
    "negative",
    "non-reactive",
    "nonreactive",
    "nil",
    "not detected",
    "undetected",
    "clear",
    "adequate",
    "absent",
  ].includes(s);
}

/**
 * Normalizes call parameters for classify()
 */
function normalizeClassifyArgs(
  arg1: ClassifyInput | number | string,
  arg2?: string | { min?: number | null; max?: number | null } | null,
  arg3?: string,
  arg4?: string | null
): ClassifyInput {
  if (typeof arg1 === "object" && arg1 !== null && "value" in arg1) {
    return arg1 as ClassifyInput;
  }
  return {
    value: arg1 as number | string,
    range: arg2,
    testName: arg3,
    unit: arg4,
  };
}

/**
 * Deterministic Clinical Value Classification Module
 *
 * Replaces LLM-based criticality decisions with strict clinical panic thresholds
 * and deterministic formula calculations.
 *
 * LOGIC ORDER:
 * 1. Panic table check (if unit matches): v <= panic.low or v >= panic.high -> "critical".
 *    When a panic entry exists, the fallback formula below must never produce "critical".
 * 2. If range (L, H) is missing -> "unknown" / "normal" (do not guess ranges).
 * 3. If L <= v <= H -> "normal".
 * 4. W = H - L; excess = (L - v) if low else (v - H); d = excess / W; r = v / L if low else v / H.
 * 5. If r >= 10 or r <= 0.1 -> "verify" (probable OCR / decimal point error).
 * 6. Severity: critical if (!hasPanicEntry && (d >= 1 || (low && r <= 0.5) || (high && r >= 2)));
 *    severe if d >= 0.5; moderate if d >= 0.25; else mild.
 * 7. If test has maxSeverity "severe", cap at "severe" unless step 1 triggered.
 */
export function classify(
  arg1: ClassifyInput | number | string,
  arg2?: string | { min?: number | null; max?: number | null } | null,
  arg3?: string,
  arg4?: string | null
): ClassificationResult {
  const input = normalizeClassifyArgs(arg1, arg2, arg3, arg4);
  const { testName, value, range, unit } = input;

  const v = extractNumericValue(value);
  const { min: L, max: H } = parseReferenceRange(range);

  // If qualitative result like "Negative" or "Normal"
  if (v === null) {
    if (isQualitativeNormal(value)) {
      return {
        severity: "normal",
        status: "normal",
        isCritical: false,
        isVerify: false,
      };
    }
    return {
      severity: "unknown",
      status: "unknown",
      isCritical: false,
      isVerify: false,
    };
  }

  // Resolve panic configuration
  const panic = input.panicConfigOverride !== undefined
    ? input.panicConfigOverride
    : getPanicConfig(testName);

  // Check unit compatibility with panic table
  const hasUnitMismatch = panic?.unit && unit ? !unitsMatch(unit, panic.unit) : false;
  const panicActive = Boolean(panic && (panic.low !== undefined || panic.high !== undefined) && !hasUnitMismatch);

  // STEP 5 PRE-CHECK: Extreme OCR / Decimal misread detection
  // If a valid range exists and the value is at least 10x off the scale,
  // it is an obvious OCR typo (e.g. Hb 120 instead of 12.0) and should be flagged "verify",
  // NOT trigger a frightening critical banner.
  if (L !== null && H !== null && (L > 0 || H > 0)) {
    const isOutLow = v < L;
    const isOutHigh = v > H;
    if (isOutLow) {
      const rRatio = L > 0 ? v / L : 0;
      if (rRatio <= 0.1) {
        return {
          severity: "verify",
          status: "low",
          isCritical: false,
          isVerify: true,
          message: "This value looks unusual, please double-check",
          flagReason: "Probable OCR or decimal point misread",
          v,
          L,
          H,
          r: rRatio,
        };
      }
    } else if (isOutHigh) {
      const rHigh = H > 0 ? v / H : 0;
      const rLow = L > 0 ? v / L : 0;
      if (rHigh >= 10 || rLow >= 10) {
        return {
          severity: "verify",
          status: "high",
          isCritical: false,
          isVerify: true,
          message: "This value looks unusual, please double-check",
          flagReason: "Probable OCR or decimal point misread",
          v,
          L,
          H,
          r: Math.max(rHigh, rLow),
        };
      }
    }
  }

  // STEP 1: Panic table check
  // If test has panic entry and v <= panic.low or v >= panic.high -> "critical"
  let step1Triggered = false;
  if (panicActive && panic) {
    const lowTriggered = panic.low !== undefined && v <= panic.low;
    const highTriggered = panic.high !== undefined && v >= panic.high;

    if (lowTriggered || highTriggered) {
      step1Triggered = true;
      const status: ComputedStatus = lowTriggered ? "low" : "high";
      return {
        severity: "critical",
        status,
        isCritical: true,
        isVerify: false,
        message: lowTriggered
          ? `Critical panic value (<= ${panic.low} ${panic.unit || ""})`
          : `Critical panic value (>= ${panic.high} ${panic.unit || ""})`,
        flagReason: "Exceeds clinical panic safety boundary",
        v,
        L,
        H,
      };
    }
  }

  // STEP 2: If printed range (L, H) is missing -> "normal"/unknown (do not guess a range)
  if (L === null && H === null) {
    return {
      severity: "unknown",
      status: "unknown",
      isCritical: false,
      isVerify: false,
      v,
      L: null,
      H: null,
    };
  }

  // STEP 3: If L <= v <= H -> "normal"
  if (L !== null && H !== null && v >= L && v <= H) {
    return {
      severity: "normal",
      status: "normal",
      isCritical: false,
      isVerify: false,
      v,
      L,
      H,
    };
  }

  // Unilateral ranges
  if (L !== null && H === null && v >= L) {
    return {
      severity: "normal",
      status: "normal",
      isCritical: false,
      isVerify: false,
      v,
      L,
      H,
    };
  }
  if (H !== null && L === null && v <= H) {
    return {
      severity: "normal",
      status: "normal",
      isCritical: false,
      isVerify: false,
      v,
      L,
      H,
    };
  }

  // Determine low vs high
  const isLow = L !== null ? v < L : false;
  const status: ComputedStatus = isLow ? "low" : "high";

  // STEP 4: Formulas
  // Let W = H - L; excess = (L - v) if low else (v - H); d = excess / W; r = v / L if low else v / H
  const effectiveL = L !== null ? L : 0;
  const effectiveH = H !== null ? H : effectiveL;
  const W = Math.max(0.0001, effectiveH - effectiveL);

  const excess = isLow ? effectiveL - v : v - effectiveH;
  const d = excess / W;

  let r = 1;
  if (isLow) {
    r = effectiveL > 0 ? v / effectiveL : 0;
  } else {
    r = effectiveH > 0 ? v / effectiveH : 0;
  }

  // STEP 5: OCR / Decimal misread check
  // If r >= 10 or r <= 0.1 -> "verify"
  if (r >= 10 || r <= 0.1) {
    return {
      severity: "verify",
      status,
      isCritical: false,
      isVerify: true,
      message: "This value looks unusual, please double-check",
      flagReason: "Probable OCR or decimal point misread",
      excess,
      d,
      r,
      v,
      L,
      H,
    };
  }

  // STEP 6: Severity calculation
  // "When a panic entry exists, the fallback formula below must never produce 'critical'."
  // critical if (no panic entry) and (d >= 1 or (low and r <= 0.5) or (high and r >= 2))
  // severe if d >= 0.5; moderate if d >= 0.25; else mild.
  let severity: ClinicalSeverity = "mild";

  const isCriticalCandidate =
    !panicActive && (d >= 1 || (isLow && r <= 0.5) || (!isLow && r >= 2));

  if (isCriticalCandidate) {
    severity = "critical";
  } else if (d >= 0.5) {
    severity = "severe";
  } else if (d >= 0.25) {
    severity = "moderate";
  } else {
    severity = "mild";
  }

  // STEP 7: Cap at "severe" if test has maxSeverity: "severe" (unless Step 1 triggered)
  if (panic?.maxSeverity === "severe" && severity === "critical" && !step1Triggered) {
    severity = "severe";
  }

  return {
    severity,
    status,
    isCritical: severity === "critical",
    isVerify: false,
    excess,
    d,
    r,
    v,
    L,
    H,
  };
}

