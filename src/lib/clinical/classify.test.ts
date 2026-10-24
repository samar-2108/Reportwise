import { describe, it } from "node:test";
import assert from "node:assert";
import { classify } from "./classify";

describe("Clinical Value Classification Module", () => {
  it("Hb 11.5 with range 12-16 should be mild", () => {
    const res = classify({
      testName: "Hemoglobin",
      value: 11.5,
      range: "12-16",
      unit: "g/dL",
    });
    assert.strictEqual(res.severity, "mild");
    assert.strictEqual(res.status, "low");
    assert.strictEqual(res.isCritical, false);
  });

  it("Hb 10 with range 12-16 should be severe", () => {
    const res = classify({
      testName: "Hemoglobin",
      value: 10,
      range: "12-16",
      unit: "g/dL",
    });
    assert.strictEqual(res.severity, "severe");
    assert.strictEqual(res.status, "low");
    assert.strictEqual(res.isCritical, false);
  });

  it("Hb 7 with range 12-16 should be critical", () => {
    const res = classify({
      testName: "Hemoglobin",
      value: 7,
      range: "12-16",
      unit: "g/dL",
    });
    assert.strictEqual(res.severity, "critical");
    assert.strictEqual(res.status, "low");
    assert.strictEqual(res.isCritical, true);
  });

  it("Platelets 100 with range 150-450 should be mild", () => {
    const res = classify({
      testName: "Platelet Count",
      value: 100,
      range: "150-450",
      unit: "10^3/uL",
    });
    assert.strictEqual(res.severity, "mild");
    assert.strictEqual(res.status, "low");
    assert.strictEqual(res.isCritical, false);
  });

  it("Platelets 60 with range 150-450 should be critical (via ratio or panic table)", () => {
    // Via ratio fallback formula (no panic entry active)
    const resRatio = classify({
      testName: "Platelet Count",
      value: 60,
      range: "150-450",
      panicConfigOverride: null,
    });
    assert.strictEqual(resRatio.severity, "critical");
    assert.strictEqual(resRatio.isCritical, true);

    // Via panic table configured with low: 60
    const resPanic = classify({
      testName: "Platelet Count",
      value: 60,
      range: "150-450",
      unit: "10^3/uL",
      panicConfigOverride: { low: 60, high: 1000, unit: "10^3/uL" },
    });
    assert.strictEqual(resPanic.severity, "critical");
    assert.strictEqual(resPanic.isCritical, true);
  });

  it("WBC 1.8 with range 4.0-11.0 should be critical", () => {
    const res = classify({
      testName: "WBC",
      value: 1.8,
      range: "4.0-11.0",
      unit: "10^3/uL",
    });
    assert.strictEqual(res.severity, "critical");
    assert.strictEqual(res.status, "low");
    assert.strictEqual(res.isCritical, true);
  });

  it("Vitamin D 5 with range 30-100 should be severe (capped by maxSeverity)", () => {
    const res = classify({
      testName: "Vitamin D",
      value: 5,
      range: "30-100",
      unit: "ng/mL",
    });
    assert.strictEqual(res.severity, "severe");
    assert.strictEqual(res.status, "low");
    assert.strictEqual(res.isCritical, false);
  });

  it("Cholesterol 400 with range 125-200 should be severe (capped by maxSeverity)", () => {
    const res = classify({
      testName: "Cholesterol",
      value: 400,
      range: "125-200",
      unit: "mg/dL",
    });
    assert.strictEqual(res.severity, "severe");
    assert.strictEqual(res.status, "high");
    assert.strictEqual(res.isCritical, false);
  });

  it("Hb 120 with range 12-16 should be verify (OCR decimal misread, not critical)", () => {
    const res = classify({
      testName: "Hemoglobin",
      value: 120,
      range: "12-16",
      unit: "g/dL",
    });
    assert.strictEqual(res.severity, "verify");
    assert.strictEqual(res.isVerify, true);
    assert.strictEqual(res.isCritical, false);
    assert.strictEqual(res.message, "This value looks unusual, please double-check");
  });

  it("Missing range should not fallback-guess ranges, returning unknown/normal", () => {
    const res = classify({
      testName: "Random Blood Marker",
      value: 45,
      range: null,
      unit: "mg/dL",
    });
    assert.strictEqual(res.severity, "unknown");
    assert.strictEqual(res.status, "unknown");
    assert.strictEqual(res.isCritical, false);
  });

  it("Unit mismatch should skip panic check and use formula", () => {
    // Hemoglobin panic is <7 g/dL. If unit is g/L, 6.5 g/L is mismatched units.
    // Range: 120-160 g/L. With v = 6.5, r = 6.5/120 <= 0.1 -> verify.
    // Or with v = 110, range = 120-160: panic table (in g/dL) is skipped.
    const res = classify({
      testName: "Hemoglobin",
      value: 110,
      range: "120-160",
      unit: "g/L", // Panic table has unit "g/dL"
    });
    // d = (120-110)/(160-120) = 10/40 = 0.25 -> moderate
    assert.strictEqual(res.severity, "moderate");
    assert.strictEqual(res.isCritical, false);
  });

  it("In-range values are always normal, never high or critical", () => {
    const cbcWbc = classify({
      testName: "Total Leucocyte Count",
      value: 6.8,
      range: "4.0-11.0",
      unit: "10^3/uL",
    });
    assert.strictEqual(cbcWbc.severity, "normal");
    assert.strictEqual(cbcWbc.status, "normal");
    assert.strictEqual(cbcWbc.isCritical, false);

    const fbs = classify({
      testName: "Fasting Blood Sugar",
      value: 85,
      range: "70-100",
      unit: "mg/dL",
    });
    assert.strictEqual(fbs.severity, "normal");
    assert.strictEqual(fbs.status, "normal");
    assert.strictEqual(fbs.isCritical, false);
  });

  it("Below-range values are marked low, above-range values are marked high", () => {
    const sugarLow = classify({
      testName: "Fasting Sugar",
      value: 62,
      range: "70-100",
      unit: "mg/dL",
    });
    assert.strictEqual(sugarLow.status, "low");

    const sugarHigh = classify({
      testName: "Fasting Sugar",
      value: 115,
      range: "70-100",
      unit: "mg/dL",
    });
    assert.strictEqual(sugarHigh.status, "high");
  });
});

