import { ExtractionSuccess, ExtractionError } from "@/lib/schemas/extraction";
import { InterpretationResult } from "@/lib/schemas/interpretation";

/**
 * Fixture 1: Complete Blood Count (CBC) showing mild anemia
 */
export const MOCK_EXTRACTION_CBC: ExtractionSuccess = {
  report_type: "Complete Blood Count (CBC)",
  tests: [
    {
      test: "Hemoglobin",
      value: "9.8",
      unit: "g/dL",
      ref_range: "12.0 - 15.5",
      status: "low",
    },
    {
      test: "Total RBC Count",
      value: "3.7",
      unit: "mil/uL",
      ref_range: "3.8 - 5.2",
      status: "low",
    },
    {
      test: "Packed Cell Volume (PCV)",
      value: "31.2",
      unit: "%",
      ref_range: "36.0 - 46.0",
      status: "low",
    },
    {
      test: "Mean Corpuscular Volume (MCV)",
      value: "74.5",
      unit: "fL",
      ref_range: "80.0 - 100.0",
      status: "low",
    },
    {
      test: "White Blood Cells (WBC)",
      value: "6800",
      unit: "/mcL",
      ref_range: "4500 - 11000",
      status: "normal",
    },
    {
      test: "Platelet Count",
      value: "220000",
      unit: "/mcL",
      ref_range: "150000 - 450000",
      status: "normal",
    },
  ],
};

/**
 * Fixture 2: Lipid Profile showing hyperlipidemia
 */
export const MOCK_EXTRACTION_LIPID: ExtractionSuccess = {
  report_type: "Lipid Profile",
  tests: [
    {
      test: "Total Cholesterol",
      value: "248",
      unit: "mg/dL",
      ref_range: "< 200",
      status: "high",
    },
    {
      test: "Triglycerides",
      value: "215",
      unit: "mg/dL",
      ref_range: "< 150",
      status: "high",
    },
    {
      test: "HDL Cholesterol (Good)",
      value: "38",
      unit: "mg/dL",
      ref_range: "> 40",
      status: "low",
    },
    {
      test: "LDL Cholesterol (Calculated)",
      value: "167",
      unit: "mg/dL",
      ref_range: "< 100",
      status: "high",
    },
    {
      test: "VLDL Cholesterol",
      value: "43",
      unit: "mg/dL",
      ref_range: "5 - 30",
      status: "high",
    },
  ],
};

/**
 * Fixture 3: Critical Metabolic Panel (Urgent Medical Attention Trigger)
 */
export const MOCK_EXTRACTION_CRITICAL: ExtractionSuccess = {
  report_type: "Comprehensive Metabolic & Glucose Panel",
  tests: [
    {
      test: "Fasting Blood Glucose",
      value: "342",
      unit: "mg/dL",
      ref_range: "70 - 99",
      status: "high",
    },
    {
      test: "Serum Potassium",
      value: "6.7",
      unit: "mmol/L",
      ref_range: "3.5 - 5.1",
      status: "high",
    },
    {
      test: "Serum Sodium",
      value: "138",
      unit: "mmol/L",
      ref_range: "135 - 145",
      status: "normal",
    },
    {
      test: "Serum Creatinine",
      value: "1.9",
      unit: "mg/dL",
      ref_range: "0.6 - 1.2",
      status: "high",
    },
    {
      test: "Blood Urea Nitrogen (BUN)",
      value: "38",
      unit: "mg/dL",
      ref_range: "7 - 20",
      status: "high",
    },
  ],
};

/**
 * Fixture 4: Thyroid Profile
 */
export const MOCK_EXTRACTION_THYROID: ExtractionSuccess = {
  report_type: "Thyroid Profile (Total & Free)",
  tests: [
    {
      test: "Thyroid Stimulating Hormone (TSH)",
      value: "8.65",
      unit: "uIU/mL",
      ref_range: "0.35 - 4.94",
      status: "high",
    },
    {
      test: "Free T3",
      value: "2.8",
      unit: "pg/mL",
      ref_range: "2.3 - 4.2",
      status: "normal",
    },
    {
      test: "Free T4",
      value: "0.72",
      unit: "ng/dL",
      ref_range: "0.80 - 1.80",
      status: "low",
    },
  ],
};

/**
 * Fixture 5: Error Retake Response (Blurry / Low Lighting)
 */
export const MOCK_EXTRACTION_ERROR_RETAKE: ExtractionError = {
  error: "retake",
  reason: "The document image has strong glare in the center and blurred text on the numerical columns. Please place the page flat in bright lighting and take another steady photo.",
};

/**
 * Fixture 6: Error Not a Medical Report
 */
export const MOCK_EXTRACTION_ERROR_NOT_A_REPORT: ExtractionError = {
  error: "not_a_report",
  reason: "The uploaded file appears to be a general cash invoice or grocery receipt, not a clinical diagnostic lab test report.",
};

/**
 * Fixture 7: Mock Interpretation for CBC
 */
export const MOCK_INTERPRETATION_CBC: InterpretationResult = {
  report_type: "Complete Blood Count (CBC)",
  patient_summary:
    "Your blood count shows that your hemoglobin and red blood cell size (MCV) are below the typical lab reference interval. This pattern is often observed with mild microcytic anemia, which is commonly related to iron stores or diet. Your white blood cells and platelets are well within healthy ranges, indicating your immune and clotting markers appear stable.",
  findings: [
    {
      title: "Reduced Hemoglobin and Red Cell Size",
      explanation:
        "Hemoglobin carries oxygen throughout your body. When hemoglobin and MCV are both lower than reference thresholds, body tissues may receive less oxygen, which can cause occasional fatigue or dizziness.",
      related_tests: ["Hemoglobin", "Total RBC Count", "Mean Corpuscular Volume (MCV)"],
      severity: "mild",
    },
    {
      title: "Healthy Immune and Clotting Defenses",
      explanation:
        "Both your white blood cell count (infection-fighting cells) and platelet count (blood-clotting cells) are in standard healthy boundaries.",
      related_tests: ["White Blood Cells (WBC)", "Platelet Count"],
      severity: "normal",
    },
  ],
  diet: {
    add: [
      "Iron-rich traditional staples like palak (spinach), methi (fenugreek leaves), and moringa (drumstick leaves)",
      "Lentils, roasted chana, rajma, and sprouted moong dal",
      "Vitamin C rich fruits (amla, seasonal guava, oranges, or fresh lemon squeezed on meals) to enhance iron absorption",
      "Jaggery (gur) with sesame or roasted groundnuts in modest portions",
    ],
    limit_or_avoid: [
      "Drinking chai (black or milk tea) or coffee immediately before or after meals, as tannins can block iron absorption",
      "Processed flour (maida) and deep-fried packaged snacks",
    ],
    sample_day:
      "Breakfast: Moong dal chilla with green mint coriander chutney. Lunch: Brown rice or whole wheat roti with palak dal, roasted beetroot salad, and fresh lemon. Evening snack: Roasted chana and amla juice. Dinner: Mixed vegetable dalia khichdi with lightly steamed greens.",
  },
  habits: {
    do: [
      "Allow 45 to 60 minutes between tea/coffee and iron-rich meals",
      "Cook in traditional iron utensils (kadai) where practical",
      "Maintain 7 to 8 hours of restorative sleep to assist cellular recovery",
    ],
    avoid: [
      "Intense, exhausting workouts until your doctor reviews your hemoglobin",
      "Skipping meals or long unmonitored fasting windows",
    ],
  },
  supplements_to_discuss_with_doctor: [
    "Oral iron formulation (such as ferrous ascorbate or bisglycinate) along with elemental vitamin C",
    "Vitamin B12 and folate assessment if you follow a strictly vegetarian diet",
  ],
  red_flags: [
    "Sudden shortness of breath with minimal exertion",
    "Persistent dizziness, chest tightness, or fainting spells",
    "Unusual rapid heart pounding at rest",
  ],
  questions_for_doctor: [
    "Would you recommend checking a Serum Ferritin and Iron profile to confirm if this is iron deficiency?",
    "Do I need an oral iron supplement, and what duration would you suggest before repeating the CBC?",
    "Should we evaluate dietary B12 levels as well?",
  ],
  recommended_followup_tests: [
    "Serum Ferritin & Total Iron Binding Capacity (TIBC)",
    "Repeat Complete Blood Count (CBC) in 6-8 weeks",
    "Vitamin B12 & Folate Profile",
  ],
  confidence_notes:
    "All values were clearly transcribed from the printed CBC report. Interpretation incorporates standard Indian dietary practices and 8th-grade health literacy guidelines.",
};

/**
 * Fixture 8: Mock Interpretation for Critical Panel
 */
export const MOCK_INTERPRETATION_CRITICAL: InterpretationResult = {
  report_type: "Comprehensive Metabolic & Glucose Panel",
  patient_summary:
    "URGENT: Your blood tests show significantly elevated glucose (sugar) and elevated potassium levels alongside mildly increased kidney filtration markers (creatinine and BUN). Because high potassium and very high glucose can affect heart rhythm and metabolic balance, please connect with a medical practitioner or urgent care clinic promptly.",
  findings: [
    {
      title: "Severely Elevated Fasting Blood Sugar",
      explanation:
        "Your fasting glucose of 342 mg/dL is well above the upper normal limit (99 mg/dL). This pattern is strongly associated with acute hyperglycemia and requires formal medical management.",
      related_tests: ["Fasting Blood Glucose"],
      severity: "critical",
    },
    {
      title: "Elevated Serum Potassium (Hyperkalemia)",
      explanation:
        "Potassium at 6.7 mmol/L is considered a critical high value. Potassium directly regulates heartbeat contractions, so prompt medical evaluation is essential.",
      related_tests: ["Serum Potassium"],
      severity: "critical",
    },
    {
      title: "Elevated Kidney Filtration Indicators",
      explanation:
        "Creatinine (1.9 mg/dL) and BUN (38 mg/dL) are above standard reference boundaries, suggesting reduced kidney clearance efficiency.",
      related_tests: ["Serum Creatinine", "Blood Urea Nitrogen (BUN)"],
      severity: "moderate",
    },
  ],
  diet: {
    add: [
      "Plain water in steady sips throughout the day as advised by your doctor",
      "Light steamed bitter gourd (karela) and boiled bottle gourd (lauki)",
    ],
    limit_or_avoid: [
      "High potassium foods (bananas, coconut water, oranges, potatoes, tomatoes) until your doctor rechecks potassium",
      "All sweets, sugary chai, fruit juices, and refined carbs",
    ],
    sample_day:
      "Please focus first on urgent medical advice before adjusting long-term meal plans. For today: plain boiled lauki subzi with small portion of whole grain roti and plentiful plain water.",
  },
  habits: {
    do: [
      "Seek in-person medical care or consult your doctor today",
      "Keep a log of any symptoms like chest flutter, weakness, or intense thirst",
    ],
    avoid: [
      "Strenuous physical exertion",
      "Taking over-the-counter NSAID pain medications (e.g. ibuprofen) which can strain kidney function",
    ],
  },
  supplements_to_discuss_with_doctor: [
    "Do NOT start any new supplements or salt substitutes (many contain potassium) without explicit physician approval.",
  ],
  red_flags: [
    "Irregular heart rhythm, palpitations, or fluttering in the chest",
    "Severe muscle weakness, numbness, or tingling in hands and feet",
    "Confusion, nausea, deep rapid breathing, or extreme lethargy",
  ],
  questions_for_doctor: [
    "Given my potassium of 6.7 mmol/L, do I need an immediate ECG to check heart conduction?",
    "What immediate insulin or medication protocol should we use to bring glucose below 200 mg/dL safely?",
    "What is the best course to protect and monitor kidney filtration?",
  ],
  recommended_followup_tests: [
    "Urgent repeat Serum Electrolytes (Potassium, Sodium)",
    "Electrocardiogram (ECG)",
    "HbA1c and Urine Routine for Microalbuminuria",
    "Renal Function Test follow-up",
  ],
  confidence_notes:
    "Critical thresholds triggered based on high potassium (>6.0 mmol/L) and glucose (>300 mg/dL). Urgent physician evaluation takes precedence over general lifestyle modifications.",
};

