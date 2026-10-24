export type Language = "en" | "hi";

export interface Translations {
  appName: string;
  tagline: string;
  disclaimerText: string;
  nav: {
    upload: string;
    history: string;
    settings: string;
    admin: string;
  };
  upload: {
    title: string;
    subtitle: string;
    cameraButton: string;
    uploadButton: string;
    dropzoneText: string;
    dropzoneSubtext: string;
    maxPages: string;
    cropReminder: string;
    pageLabel: string;
    removePage: string;
    extractButton: string;
    extracting: string;
    selectSample: string;
    loadCbc: string;
    loadLipid: string;
    loadCritical: string;
  };
  confirm: {
    title: string;
    subtitle: string;
    testHeader: string;
    valueHeader: string;
    unitHeader: string;
    refRangeHeader: string;
    statusHeader: string;
    actionsHeader: string;
    addTest: string;
    confirmButton: string;
    analyzing: string;
    backToUpload: string;
  };
  results: {
    criticalBannerTitle: string;
    criticalBannerText: string;
    lifestyleToggleText: string;
    lifestyleToggleSubtext: string;
    showLifestyleButton: string;
    hideLifestyleButton: string;
    summaryTitle: string;
    findingsTitle: string;
    tabs: {
      values: string;
      diet: string;
      habits: string;
      questions: string;
      followup: string;
      trends: string;
    };
    diet: {
      addTitle: string;
      limitTitle: string;
      sampleDayTitle: string;
    };
    habits: {
      doTitle: string;
      avoidTitle: string;
    };
    questionsTitle: string;
    supplementsTitle: string;
    exportPdf: string;
    exportPdfCurrent: string;
    exportPdfWhole: string;
    newReport: string;
  };
  statuses: {
    normal: string;
    low: string;
    high: string;
    criticalLow: string;
    criticalHigh: string;
    unknown: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: "ReportWise",
    tagline: "Understand Your Medical Lab Reports in Plain Language",
    disclaimerText:
      "Medical Disclaimer: This is educational information, not medical advice. Always consult a licensed doctor for diagnosis and clinical decisions.",
    nav: {
      upload: "Analyze Report",
      history: "Past Reports",
      settings: "Privacy & Settings",
      admin: "System Quota",
    },
    upload: {
      title: "Upload or Photograph Your Lab Report",
      subtitle: "Supports JPG, PNG, WEBP, and PDF documents up to 5 pages (10 MB max).",
      cameraButton: "Take Photo with Phone Camera",
      uploadButton: "Choose File(s) from Device",
      dropzoneText: "Drag & drop your report pages here, or click to browse",
      dropzoneSubtext: "Compressed automatically on your device for privacy and speed",
      maxPages: "Up to 5 pages supported",
      cropReminder:
        "Privacy tip: Please crop out the header containing your name, phone number, address, or patient ID before uploading.",
      pageLabel: "Page",
      removePage: "Remove",
      extractButton: "Read & Extract Values",
      extracting: "Transcribing Report...",
      selectSample: "Or test instantly with a pre-loaded sample report:",
      loadCbc: "Sample CBC (Blood Count)",
      loadLipid: "Sample Lipid Profile",
      loadCritical: "Sample Critical Panel",
    },
    confirm: {
      title: "Review & Confirm Extracted Values",
      subtitle:
        "Verify what the AI transcribed from your report. You can edit any numbers or test names before generating insights.",
      testHeader: "Test Name",
      valueHeader: "Printed Value",
      unitHeader: "Unit",
      refRangeHeader: "Reference Range",
      statusHeader: "Status",
      actionsHeader: "Action",
      addTest: "+ Add Missing Test",
      confirmButton: "Confirm & Generate Plain-Language Explanation",
      analyzing: "Analyzing Report...",
      backToUpload: "Back to Upload",
    },
    results: {
      criticalBannerTitle: "Please See a Doctor Soon (Urgent Finding)",
      criticalBannerText:
        "One or more lab results are at critical levels. Routine lifestyle habits should take second priority to professional medical consultation.",
      lifestyleToggleText: "Routine Lifestyle & Diet Tips are Hidden",
      lifestyleToggleSubtext:
        "Because urgent medical attention is advised, general lifestyle advice has been placed behind this toggle to keep medical care priority clear.",
      showLifestyleButton: "View general lifestyle tips anyway",
      hideLifestyleButton: "Hide lifestyle tips",
      summaryTitle: "Plain-Language Summary",
      findingsTitle: "Key Health Findings",
      tabs: {
        values: "Test Values",
        diet: "Culturally Relevant Diet",
        habits: "Daily Habits",
        questions: "Questions for Your Doctor",
        followup: "Follow-up Tests",
        trends: "Trend Chart",
      },
      diet: {
        addTitle: "Nutritious Foods to Include (Indian Staples)",
        limitTitle: "Foods to Moderate or Avoid",
        sampleDayTitle: "Sample Daily Meal Plan",
      },
      habits: {
        doTitle: "Helpful Daily Practices",
        avoidTitle: "Habits to Avoid",
      },
      questionsTitle: "Questions to Ask Your Doctor at Your Next Visit",
      supplementsTitle: "Supplements to Discuss with Your Doctor First",
      exportPdf: "Export Doctor-Ready PDF",
      exportPdfCurrent: "PDF (Current View)",
      exportPdfWhole: "PDF as a Whole",
      newReport: "Analyze Another Report",
    },
    statuses: {
      normal: "Normal",
      low: "Low",
      high: "High",
      criticalLow: "Critical Low",
      criticalHigh: "Critical High",
      unknown: "Pending",
    },
  },
  hi: {
    appName: "रिपोर्टवाइज़",
    tagline: "अपनी मेडिकल लैब रिपोर्ट को आसान और स्पष्ट भाषा में समझें",
    disclaimerText:
      "चिकित्सा अस्वीकरण: यह केवल शैक्षणिक जानकारी है, चिकित्सीय सलाह नहीं। किसी भी रोगनिदान या उपचार के लिए हमेशा योग्य डॉक्टर से संपर्क करें।",
    nav: {
      upload: "रिपोर्ट जांचें",
      history: "पिछली रिपोर्टें",
      settings: "गोपनीयता व सेटिंग्स",
      admin: "कोटा स्थिति",
    },
    upload: {
      title: "अपनी लैब रिपोर्ट अपलोड करें या फोटो खींचें",
      subtitle: "JPG, PNG, WEBP और PDF फाइलों का समर्थन (अधिकतम 5 पृष्ठ, 10 MB)।",
      cameraButton: "फोन कैमरे से फोटो खींचें",
      uploadButton: "डिवाइस से फाइल चुनें",
      dropzoneText: "रिपोर्ट के पन्नों को यहाँ खींचें या चुनने के लिए क्लिक करें",
      dropzoneSubtext: "आपकी निजता और गति के लिए डिवाइस पर ही कंप्रेस किया जाता है",
      maxPages: "अधिकतम 5 पृष्ठ",
      cropReminder:
        "निजता सलाह: अपलोड करने से पहले कृपया अपना नाम, फोन नंबर, पता या मरीज आईडी वाला ऊपरी हिस्सा काट (क्रॉप) लें।",
      pageLabel: "पृष्ठ",
      removePage: "हटाएं",
      extractButton: "मान पढ़ें और निकालें",
      extracting: "रिपोर्ट पढ़ी जा रही है...",
      selectSample: "या तैयार नमूना रिपोर्ट से तुरंत जांचें:",
      loadCbc: "नमूना सीबीसी (रक्त जांच)",
      loadLipid: "नमूना लिपिड प्रोफाइल",
      loadCritical: "नमूना गंभीर जांच",
    },
    confirm: {
      title: "निकाले गए मानों की समीक्षा और पुष्टि करें",
      subtitle:
        "जांचें कि रिपोर्ट से क्या मान पढ़े गए हैं। स्पष्टीकरण बनाने से पहले आप किसी भी संख्या या नाम को बदल सकते हैं।",
      testHeader: "जांच का नाम",
      valueHeader: "दर्ज मान",
      unitHeader: "इकाई (Unit)",
      refRangeHeader: "मानक सीमा (Ref Range)",
      statusHeader: "स्थिति",
      actionsHeader: "क्रिया",
      addTest: "+ छूटी हुई जांच जोड़ें",
      confirmButton: "पुष्टि करें और आसान भाषा में समझें",
      analyzing: "विश्लेषण हो रहा है...",
      backToUpload: "अपलोड पर वापस जाएं",
    },
    results: {
      criticalBannerTitle: "कृपया शीघ्र डॉक्टर से मिलें (अति आवश्यक)",
      criticalBannerText:
        "आपकी रिपोर्ट में एक या अधिक मान चिंताजनक स्तर पर हैं। जीवनशैली सुझावों से पहले डॉक्टर की सलाह प्राथमिकता होनी चाहिए।",
      lifestyleToggleText: "दैनिक आहार और आदतें छिपाई गई हैं",
      lifestyleToggleSubtext:
        "क्योंकि डॉक्टर से मिलना अति आवश्यक है, इसलिए सामान्य आहार सलाह को इस बटन के पीछे रखा गया है।",
      showLifestyleButton: "सामान्य आहार और आदत सुझाव फिर भी देखें",
      hideLifestyleButton: "आहार सुझाव छुपाएं",
      summaryTitle: "सरल भाषा में सारांश",
      findingsTitle: "मुख्य स्वास्थ्य निष्कर्ष",
      tabs: {
        values: "जांच परिणाम",
        diet: "भारतीय आहार सुझाव",
        habits: "दैनिक आदतें",
        questions: "डॉक्टर से पूछने योग्य सवाल",
        followup: "आगे की आवश्यक जांचें",
        trends: "प्रवृत्ति चार्ट",
      },
      diet: {
        addTitle: "शामिल करने योग्य पौष्टिक आहार (दाल, हरी पत्तियां, रागी)",
        limitTitle: "कम करने या बचने योग्य खाद्य पदार्थ",
        sampleDayTitle: "दैनिक आहार योजना का उदाहरण",
      },
      habits: {
        doTitle: "लाभकारी दैनिक आदतें",
        avoidTitle: "बचने योग्य आदतें",
      },
      questionsTitle: "अगली मुलाकात में डॉक्टर से क्या पूछें",
      supplementsTitle: "सप्लीमेंट्स (पहले डॉक्टर से चर्चा करें)",
      exportPdf: "डॉक्टर के लिए PDF डाउनलोड करें",
      exportPdfCurrent: "PDF (वर्तमान दृश्य)",
      exportPdfWhole: "PDF as a Whole (सम्पूर्ण रिपोर्ट)",
      newReport: "नई रिपोर्ट जांचें",
    },
    statuses: {
      normal: "सामान्य",
      low: "कम",
      high: "अधिक",
      criticalLow: "गंभीर कम",
      criticalHigh: "गंभीर अधिक",
      unknown: "प्रतीक्षारत",
    },
  },
};

