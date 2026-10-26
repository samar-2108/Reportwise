# ReportWise 🩺

ReportWise is an intelligent, patient-centered medical laboratory companion where users upload or photograph real lab reports and receive clear, verified, plain-language AI explanations at an 8th-grade reading level. It features culturally relevant dietary guidance (optimized for Indian staples like dal, palak, methi, ragi, and curd), doctor discussion questions, prominent critical-value panic safety banners, longitudinal biomarker trend analysis, and a global AI health chatbot (*"Ask ReportWise"*).

---

## ⚠️ Production Note (Privacy & Compliance)

> **The Google Gemini Free Tier via Google AI Studio is intended strictly for development, testing, and demonstrations.**  
> Under Google's free-tier terms, submitted prompts and uploaded files may be reviewed by human reviewers and used by Google to train and improve AI models.
>
> **Before real patients or production users upload sensitive medical reports:**
> 1. Upgrade to a **paid Google Cloud Vertex AI / Gemini API tier** with zero data retention and HIPAA Business Associate Agreement (BAA) guarantees, or switch to an enterprise provider with a verified zero-training data policy.
> 2. Always remind users to crop or cover personal identifiers (name, address, phone number, hospital IDs) prior to uploading.
> 3. Enforce the built-in auto-delete toggle so original uploaded images are wiped immediately following transcription.

---

## 🚀 Key Features & Capabilities

* **Multi-Page Upload, Camera Capture & Pre-Upload Compression**
  * Up to 5 pages supported (JPG, PNG, WEBP, PDF, max 10MB).
  * Direct phone camera capture button (`<input type="file" accept="image/*,application/pdf" capture="environment">`).
  * Client-side HTML5 canvas image compression before network transmission.
  * Page reordering (move left/right) and individual page deletion.
  * Vision extraction with automatic detection of blurry images (`"retake"`) and non-medical files (`"not_a_report"`).
  * Interactive editable confirmation table allowing users to correct OCR values, add missing tests, or delete misread lines.

* **Deterministic Status Engine & Results Dashboard**
  * Deterministic comparison engine (in code, not LLM) comparing printed values to clinical reference intervals.
  * Adult critical boundaries for panic thresholds (Hemoglobin, Glucose, Potassium, Sodium, Creatinine, Platelets, WBC, Calcium).
  * Prominent red-flag alert banner: **"Please see a doctor soon"** if any critical value is detected.
  * **Urgent Care Safeguard:** Routine lifestyle/diet tabs are collapsed behind a conscious *"View general lifestyle tips anyway"* toggle so urgent findings are never buried under routine advice.
  * Culturally relevant Indian dietary guidance (palak, methi, moong dal, ragi, curd, amla) tailored to user diet preference (`veg`, `non-veg`, `vegan`).
  * Doctor consultation questions and follow-up tests checklist.

* **Global AI Health Chatbot ("Ask ReportWise")**
  * Floating trigger button accessible on all authenticated pages (with keyboard shortcut `⌘K` or `/`).
  * Desktop side panel overlay and mobile full-screen bottom sheet with scroll lock protection.
  * User-scoped persistent conversations (`chat_conversations` and `chat_messages`) with automatic local titling.
  * Optional multi-report clinical attachment (attach 1 to 3 past lab reports for contextual trend queries).
  * Natural language report resolution (*"What does my latest report say?"* automatically resolves and attaches the recent report).
  * Strict safety rules: no diagnosis, no prescriptions, emergency escalation (112 / 108), and prompt-injection defense.
  * Contextual and general suggested question chips with message feedback (Helpful / Unhelpful).

* **Authentication, Privacy & Data Isolation**
  * Official Google OAuth authentication via Supabase SSR with non-blocking redirects and session caching.
  * Strict patient isolation enforced at the PostgreSQL database level via Row Level Security (RLS).
  * Pre-upload anonymization modal with background scroll lock (`PrivacyConsentModal`).
  * History page (`/history`): Lists verified past reports with status badges and abnormal biomarker indicators.
  * Report detail page (`/reports/[id]`): Displays full analysis and records, with clean *"Report Not Found"* states for deleted/invalid IDs.
  * Settings (`/settings`):
    * Preference for auto-deleting original uploaded documents after analysis.
    * Dietary preference selector (`veg`, `non-veg`, `vegan`).
    * **"Delete all my data"**: One-click purge of all uploaded reports, storage files, user profile, and chat conversations.

* **Hindi / English Support, Trend Charts, PDF Export**
  * Dual-language toggle (**English / हिंदी**) in navigation and settings.
  * AI output language parameter (`en` vs `hi`) producing natural conversational Hindi or 8th-grade English.
  * Longitudinal biomarker trend charts using **Recharts** across past reports with reference range bands.
  * Doctor-ready PDF print export (`window.print()` formatted stylesheet).
  * Animated step-wise progress skeleton loader (*"Reading report… Checking values… Preparing insights…"*) during AI processing.

* **Theme-Oriented Project Footer & Direct Feedback Form**
  * Clean medical styling matching the application's teal and slate design language.
  * Comprehensive project architecture, clinical safety cutoffs, and emergency guidance.
  * One-click feedback form that persists submissions to the database and immediately triggers user's email client addressed to Samar Mehta (`samarmehta845@gmail.com`).

---

## 📋 Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Default / Example | Description |
|---|---|---|
| `GEMINI_API_KEY` | `AIzaSy...` | Free API key from Google AI Studio. |
| `GEMINI_MODEL_EXTRACT` | `gemini-2.5-flash` | Vision model used for Pass 1 extraction. |
| `GEMINI_MODEL_INTERPRET` | `gemini-2.5-flash` | Fast model used for Pass 2 plain-language analysis. |
| `LLM_PROVIDER` | `gemini` (or `mock`) | Selects active provider. Set to `mock` to test without consuming quota. |
| `MAX_ANALYSES_PER_USER_PER_DAY` | `20` | Max analyses per user per day. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` | Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` | Backend admin key for database cleanups and migrations. |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Application root URL. |

---

## 🗄️ Supabase Database & Storage Setup

1. Open your project on [Supabase](https://supabase.com/dashboard).
2. Go to the **SQL Editor**.
3. Copy and run the entire script from [`supabase/schema.sql`](./supabase/schema.sql).
   - Creates `profiles`, `reports`, `chat_conversations`, `chat_messages`, and `feedback` tables.
   - Configures the private `reports` storage bucket (10MB limit, image and PDF support).
   - Enables Row Level Security (RLS) on all tables and storage objects so users can only access their own data.
   - Creates triggers for auto-creating profile rows on signup and updating timestamps.

### 🔑 Enabling Google OAuth in Supabase

1. In your **Supabase Dashboard**, navigate to **Authentication** -> **Providers** -> **Google**.
2. Toggle Google to **Enabled**.
3. Enter your **Client ID** and **Client Secret** (obtained from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) under OAuth 2.0 Client IDs).
4. In Google Cloud Console, add your Supabase redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
5. In Supabase Dashboard under **Authentication** -> **URL Configuration**, add your application callback URL:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`

---

## 🏃 How to Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Verify production build & lint:**
   ```bash
   npm run lint
   npm run build
   ```

---

## 🏛️ System Architecture

ReportWise follows a security-hardened, human-in-the-loop architecture designed to eliminate hallucinations, enforce clinical safety cutoffs deterministically, and protect sensitive patient data.

```mermaid
flowchart TD
    subgraph Client["1. Client Layer (Next.js 16 / React 19)"]
        Upload["Camera / Document Ingestion\n(Multi-page, Canvas Compression)"]
        ConfirmTable["Human-in-the-Loop Table\n(Edit OCR errors, verify values)"]
        Dashboard["Results Dashboard\n(Values, Diet, Habits, Doctor Questions)"]
        ChatDrawer["Ask ReportWise Chatbot\n(Drawer overlay, Multi-report attachment)"]
        Footer["Theme-Oriented Footer\n(Architecture, Safety, Direct Mail Feedback)"]
        PDFGen["Client-Side PDF Engine\n(Print-ready Stylesheet Export)"]
    end

    subgraph API["2. Next.js App Router (Backend Routes)"]
        ExtractRoute["/api/reports/extract\n(Pass 1 Extraction Route)"]
        AnalyzeRoute["/api/reports/analyze\n(Pass 2 Interpretation Route)"]
        ChatRoute["/api/chat\n(Streaming Clinical Chatbot)"]
        FeedbackRoute["/api/feedback\n(Feedback Persistence & Dispatch)"]
        ListRoute["/api/reports/list\n(History & Trend Query)"]
        DeleteRoute["/api/reports/[id]\n(GDPR/Privacy Deletion)"]
    end

    subgraph Safety["3. Clinical Safety & Caching Engine"]
        RateLimiter["Daily Cap Limiter\n(Sliding window per-user cap)"]
        ShaCache["SHA-256 Content Cache\n(Duplicate file & input deduplication)"]
        DeterministicEngine["Deterministic Clinical Engine\n(Panic values, ratio excess, OCR verification)"]
    end

    subgraph LLM["4. Pluggable AI Provider Layer"]
        ProviderInterface["LLMProvider Interface\n(Strict Zod Schema Output)"]
        VisionAI["Optical Vision Analysis\n(Extraction: test, value, unit, ref range)"]
        ClinicalAI["Medical Interpretation\n(8th-grade explanations, Indian diet)"]
        ChatAI["Clinical Conversation Engine\n(Prompt-injection defense, Citations)"]
    end

    subgraph Storage["5. Supabase Persistence & Storage"]
        PostgresDB[("PostgreSQL\n(profiles, reports, chat, feedback)")]
        PrivateBucket[("Private Encrypted Storage\n(Auto-deleted after extraction)")]
    end

    %% Flow connections
    Upload --> RateLimiter
    RateLimiter --> ExtractRoute
    ExtractRoute --> ShaCache
    ShaCache --> VisionAI
    VisionAI --> ConfirmTable
    
    ConfirmTable --> AnalyzeRoute
    AnalyzeRoute --> DeterministicEngine
    DeterministicEngine --> ClinicalAI
    ClinicalAI --> PostgresDB
    ClinicalAI --> Dashboard
    
    ChatDrawer --> ChatRoute
    ChatRoute --> ChatAI
    ChatAI --> PostgresDB

    Footer --> FeedbackRoute
    FeedbackRoute --> PostgresDB

    Dashboard --> PDFGen
    Dashboard --> ListRoute
    ListRoute --> PostgresDB
    DeleteRoute --> PostgresDB
    DeleteRoute --> PrivateBucket
    ExtractRoute -.-> PrivateBucket
```

### Core Architectural Layers & Invariants

#### 1. Ingestion & Pre-Upload Privacy (Client)
- **Zero-Server Canvas Compression:** Mobile camera photos (often 5–15 MB) are resized and compressed to under 1.5 MB directly in the browser via HTML5 `<canvas>` before network transmission.
- **Header Anonymization Reminder:** Users are guided to crop out patient identifiers (name, address, hospital MRN) so AI models process only clinical biomarker data.

#### 2. Two-Pass AI Pipeline with Human-in-the-Loop Verification
- **Pass 1 (Optical Extraction):** Transcribes raw laboratory values into a strictly typed Zod schema (`ExtractionResultSchema`). Detects unreadable or blurry images (`"retake"`) and non-medical files (`"not_a_report"`).
- **Mandatory Confirmation Stage:** Transcriptions are rendered in an interactive editable table. Users verify or correct OCR misreads before any clinical interpretation is generated.
- **Pass 2 (Plain-Language Interpretation):** Produces 8th-grade explanations, follow-up tests, culturally tailored Indian diet recommendations (dal, ragi, curd, amla), and structured doctor discussion questions.

#### 3. Deterministic Clinical Safety Layer (No LLM Hallucinations)
- **Deterministic Critical Decision:** The AI model **never** decides whether a value is normal, abnormal, or critical.
- **Panic Value Cutoffs:** Configured adult critical boundaries (`panic-values.ts`) take precedence (e.g. Hemoglobin <7 or >20 g/dL, Platelets <50k, Potassium <2.5 or >6.5 mmol/L).
- **OCR Decimal Misread Detection:** Mathematical ratio checks ($r = v / \text{Ref} \ge 10$ or $\le 0.1$) identify probable OCR decimal shift errors (e.g. `120` instead of `12.0`), highlighting them as `"verify"` rather than triggering false emergencies.
- **Urgent Care Protocol:** If any critical cutoff is breached, a dark red banner (*"Please see a doctor soon"*) is pinned to the top, and routine lifestyle tabs are collapsed behind a conscious toggle so urgent care is never obscured by routine advice.

#### 4. Persistence, Rate Limiting & Storage Minimization
- **Supabase PostgreSQL & Admin Bypass:** API routes leverage `SUPABASE_SERVICE_ROLE_KEY` to guarantee data integrity across profiles, reports, conversations, and feedback.
- **Privacy Auto-Cleanup:** Original uploaded files in Supabase Storage are automatically purged from the bucket once interpretation completes.
- **SHA-256 Deduplication Cache:** Identical uploads and identical confirmed inputs hit a fast in-memory SHA-256 cache, eliminating redundant model latency and protecting API quota.

---

## 🧪 Short Manual Test Checklist

Follow these steps to manually test the complete user journey:

- [ ] **1. Authentication Flow:**
  - Visit [http://localhost:3000](http://localhost:3000).
  - Verify unauthenticated users are smoothly routed to `/auth`.
  - Sign in with Google OAuth. Verify instant redirection to the home dashboard without buffering or stalls.

- [ ] **2. Report Upload & Extraction:**
  - Upload a real medical lab report (or photo of a blood test).
  - Verify the step progress loader (*Reading report...*).
  - Verify you land on the **Editable Confirmation Table**.
  - Verify values, units, and reference ranges extracted by the AI.
  - Test editing a value (e.g. change Hemoglobin to `6.5`). Observe the status chip update in real-time to **Critical Low**.
  - Click **"Confirm & Generate Plain-Language Explanation"**.

- [ ] **3. Results Dashboard & Critical Safeguards:**
  - Verify the **Results Dashboard** renders Patient Summary, Key Findings, Indian Diet (dal, palak, ragi), and Doctor Questions.
  - If a critical biomarker is present, verify the prominent red banner **"Please See a Doctor Soon (Urgent Finding)"** appears at the top.
  - Click the **Diet** or **Habits** tab. Verify advice is collapsed behind **"View general lifestyle tips anyway"** during critical findings.

- [ ] **4. Dual Language Toggle (English / हिंदी):**
  - Click the language button in the navbar (**"हिंदी"**).
  - Verify all UI elements, status labels, headers, and tabs switch into natural Hindi.

- [ ] **5. Trend Chart Visualization & PDF Export:**
  - Click the **"Trend Chart"** tab on the results dashboard (or navigate to `/history`).
  - Select different biomarkers (e.g. Hemoglobin, Fasting Blood Glucose). Verify Recharts plots the points with healthy reference bands.
  - On the results dashboard, click **"Export Doctor-Ready PDF"** and verify print dialog stylesheet.

- [ ] **6. "Ask ReportWise" Global AI Chatbot:**
  - Press `Ctrl/Cmd+K` or `/` (or click floating button) on any page (`/`, `/history`, `/reports/[id]`, `/settings`).
  - Ask general health questions with no report attached.
  - Attach 1–3 past reports from the picker and ask contextual questions.
  - Test background scroll lock: verify the underlying page cannot scroll while the chatbot is open.
  - Review past conversations in the history drawer and test conversation renaming.

- [ ] **7. Footer & Direct Feedback Form:**
  - On `/`, scroll to the footer to review the project overview.
  - Fill in the feedback form (rating, category, message) and click **"Send Mail to Samar"**.
  - Verify your email client opens pre-addressed to `samarmehta845@gmail.com` with the subject and message filled in.
  - Visit `/history`, `/reports/[id]`, and `/settings` to verify the footer is cleanly hidden from those pages as requested.

- [ ] **8. Data Erasure:**
  - Visit `/settings` and click **"Delete All My Data"**.
  - Verify all reports, storage files, user profile, and chat conversations are permanently purged.

---

## 👤 Author & Support

Created by **Samar Mehta** ([`@samar-2108`](https://github.com/samar-2108))  
Contact & Feedback: [`samarmehta845@gmail.com`](mailto:samarmehta845@gmail.com)
