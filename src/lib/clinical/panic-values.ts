/**
 * CLINICAL PANIC VALUES & CRITICAL THRESHOLDS CONFIGURATION
 * 
 * NOTE: These panic thresholds are adult starting values for clinical safety
 * verification and MUST be reviewed and verified by a licensed medical professional
 * before clinical deployment.
 */

export interface PanicValueConfig {
  low?: number;
  high?: number;
  unit?: string;
  maxSeverity?: "severe";
}

/**
 * Normalizes a unit string for safe, unit-aware clinical comparison
 */
export function normalizeUnit(rawUnit?: string | null): string {
  if (!rawUnit) return "";
  const u = rawUnit.toLowerCase().trim().replace(/\s+/g, "");

  // Hemoglobin units
  if (u === "g/dl" || u === "gm/dl" || u === "g/100ml") return "g/dl";
  if (u === "g/l" || u === "gm/l") return "g/l";

  // White blood cells & Platelet count units
  if (
    u.includes("10^3") ||
    u.includes("10*3") ||
    u.includes("10e3") ||
    u.includes("×10³") ||
    u.includes("x10^3") ||
    u.includes("k/ul") ||
    u.includes("k/mcl") ||
    u.includes("thou") ||
    u.includes("/nl")
  ) {
    return "10^3/ul";
  }

  // Lakhs (common Indian reporting standard for platelets)
  if (u.includes("lakh") || u.includes("lac")) return "lakhs";

  // Standard absolute cell count per microliter
  if (u === "/mcl" || u === "/ul" || u === "/cumm" || u === "cells/cumm" || u === "cells/mcl") {
    return "/mcl";
  }

  // Electrolytes
  if (u === "mmol/l" || u === "meq/l") return "mmol/l";

  // Standard biochemistry
  if (u === "mg/dl" || u === "mg%") return "mg/dl";
  if (u === "ng/ml" || u === "ng/dl") return "ng/ml";
  if (u === "pg/ml") return "pg/ml";
  if (u === "uiu/ml" || u === "mciu/ml" || u === "miu/l" || u === "uiu/l") return "uiu/ml";
  if (u === "u/l" || u === "iu/l") return "u/l";
  if (u === "%") return "%";

  return u;
}

/**
 * Checks if the report's printed unit matches the panic table unit
 */
export function unitsMatch(reportUnit?: string | null, panicUnit?: string | null): boolean {
  if (!panicUnit) return true;
  if (!reportUnit) return true; // If report didn't specify unit, assume matching lab default
  return normalizeUnit(reportUnit) === normalizeUnit(panicUnit);
}

/**
 * Adult starting panic values
 */
export const PANIC_VALUES_CONFIG: Record<string, PanicValueConfig> = {
  // Hemoglobin: < 7.0 or > 20.0 g/dL
  hemoglobin: { low: 7.0, high: 20.0, unit: "g/dL" },
  haemoglobin: { low: 7.0, high: 20.0, unit: "g/dL" },
  hb: { low: 7.0, high: 20.0, unit: "g/dL" },
  hgb: { low: 7.0, high: 20.0, unit: "g/dL" },

  // WBC (White Blood Cell Count): < 2.0 or > 30.0 x 10^3/uL
  wbc: { low: 2.0, high: 30.0, unit: "10^3/uL" },
  "white blood cells": { low: 2.0, high: 30.0, unit: "10^3/uL" },
  "white blood cell count": { low: 2.0, high: 30.0, unit: "10^3/uL" },
  "total leukocyte count": { low: 2.0, high: 30.0, unit: "10^3/uL" },
  "total leucocyte count": { low: 2.0, high: 30.0, unit: "10^3/uL" },
  tlc: { low: 2.0, high: 30.0, unit: "10^3/uL" },

  // Platelets: < 50 or > 1000 x 10^3/uL
  platelet: { low: 50, high: 1000, unit: "10^3/uL" },
  platelets: { low: 50, high: 1000, unit: "10^3/uL" },
  "platelet count": { low: 50, high: 1000, unit: "10^3/uL" },
  plt: { low: 50, high: 1000, unit: "10^3/uL" },

  // Potassium: < 2.5 or > 6.5 mmol/L
  potassium: { low: 2.5, high: 6.5, unit: "mmol/L" },
  "serum potassium": { low: 2.5, high: 6.5, unit: "mmol/L" },
  "k+": { low: 2.5, high: 6.5, unit: "mmol/L" },

  // Sodium: < 120 or > 160 mmol/L
  sodium: { low: 120, high: 160, unit: "mmol/L" },
  "serum sodium": { low: 120, high: 160, unit: "mmol/L" },
  "na+": { low: 120, high: 160, unit: "mmol/L" },

  // Glucose: < 40 or > 450 mg/dL
  glucose: { low: 40, high: 450, unit: "mg/dL" },
  "blood sugar": { low: 40, high: 450, unit: "mg/dL" },
  "fasting glucose": { low: 40, high: 450, unit: "mg/dL" },
  "fasting blood sugar": { low: 40, high: 450, unit: "mg/dL" },
  fbs: { low: 40, high: 450, unit: "mg/dL" },
  rbs: { low: 40, high: 450, unit: "mg/dL" },
  "random blood sugar": { low: 40, high: 450, unit: "mg/dL" },
  "post prandial blood sugar": { low: 40, high: 450, unit: "mg/dL" },
  ppbs: { low: 40, high: 450, unit: "mg/dL" },

  // Calcium: < 6.5 or > 13.0 mg/dL
  calcium: { low: 6.5, high: 13.0, unit: "mg/dL" },
  "serum calcium": { low: 6.5, high: 13.0, unit: "mg/dL" },
  "ca++": { low: 6.5, high: 13.0, unit: "mg/dL" },

  // Creatinine: > 3.5 mg/dL
  creatinine: { high: 3.5, unit: "mg/dL" },
  "serum creatinine": { high: 3.5, unit: "mg/dL" },

  // TESTS CAPPED AT MAX SEVERITY: "severe"
  // Lipids
  cholesterol: { maxSeverity: "severe", unit: "mg/dL" },
  "total cholesterol": { maxSeverity: "severe", unit: "mg/dL" },
  triglycerides: { maxSeverity: "severe", unit: "mg/dL" },
  triglyceride: { maxSeverity: "severe", unit: "mg/dL" },
  tg: { maxSeverity: "severe", unit: "mg/dL" },
  ldl: { maxSeverity: "severe", unit: "mg/dL" },
  "ldl cholesterol": { maxSeverity: "severe", unit: "mg/dL" },
  hdl: { maxSeverity: "severe", unit: "mg/dL" },
  "hdl cholesterol": { maxSeverity: "severe", unit: "mg/dL" },

  // HbA1c
  hba1c: { maxSeverity: "severe", unit: "%" },
  "glycated hemoglobin": { maxSeverity: "severe", unit: "%" },
  "glycosylated hemoglobin": { maxSeverity: "severe", unit: "%" },
  a1c: { maxSeverity: "severe", unit: "%" },

  // Vitamin D
  "vitamin d": { maxSeverity: "severe", unit: "ng/mL" },
  "vit d": { maxSeverity: "severe", unit: "ng/mL" },
  "25-hydroxy vitamin d": { maxSeverity: "severe", unit: "ng/mL" },
  "25 oh vitamin d": { maxSeverity: "severe", unit: "ng/mL" },

  // Vitamin B12
  "vitamin b12": { maxSeverity: "severe", unit: "pg/mL" },
  "vit b12": { maxSeverity: "severe", unit: "pg/mL" },
  b12: { maxSeverity: "severe", unit: "pg/mL" },
  cyanocobalamin: { maxSeverity: "severe", unit: "pg/mL" },

  // Uric Acid
  "uric acid": { maxSeverity: "severe", unit: "mg/dL" },
  "serum uric acid": { maxSeverity: "severe", unit: "mg/dL" },

  // Thyroid (TSH)
  tsh: { maxSeverity: "severe", unit: "uIU/mL" },
  "thyroid stimulating hormone": { maxSeverity: "severe", unit: "uIU/mL" },

  // Liver enzymes
  sgot: { maxSeverity: "severe", unit: "U/L" },
  ast: { maxSeverity: "severe", unit: "U/L" },
  sgpt: { maxSeverity: "severe", unit: "U/L" },
  alt: { maxSeverity: "severe", unit: "U/L" },
};

/**
 * Resolves a test name against the panic config table
 */
export function getPanicConfig(rawTestName?: string | null): PanicValueConfig | undefined {
  if (!rawTestName) return undefined;
  const name = rawTestName.toLowerCase().trim();

  // 1. Direct exact match
  if (PANIC_VALUES_CONFIG[name]) {
    return PANIC_VALUES_CONFIG[name];
  }

  // 2. Substring / alias key match
  for (const [key, config] of Object.entries(PANIC_VALUES_CONFIG)) {
    if (name === key) return config;
    // Word boundary or containment
    if (name.includes(key) || key.includes(name)) {
      return config;
    }
  }

  return undefined;
}

