# AI-HRO — AI-Powered Dynamic Hospital Resource Optimization Platform

**AI-HRO** is an academic demonstration prototype and hospital operational intelligence platform. It provides real-time bed capacity monitoring, diurnal time-series patient admission forecasting, nurse-to-patient staffing ratio balancing, biomedical equipment tracking, and explainable AI recommendations backed by human approval workflows.

---

## 🏥 Key Capabilities

1. **Hospital Operations Command Center**: Live KPIs for bed occupancy, 12-hour projected inflow, available staff roster, spare critical equipment, and emergency department surge risk.
2. **Interactive 3D Hospital Digital Twin**: Built with Three.js WebGL, rendering spatial hospital pavilions (ED, ICU, MedSurg, Pediatrics, Cardiology) with real-time occupancy heat glow and animated patient transfer conduits.
3. **Patient Demand Forecasting**: Time-series forecasting implementing Diurnal Decomposition + EWMA with acuity weighting, 90% confidence prediction intervals, and genuine out-of-sample backtesting evaluation metrics (MAE, RMSE, MAPE).
4. **Bed Availability Matrix**: Department-wise bed census, bed types (Trauma, ICU, Telemetry, Isolation), and state machine transitions (`Available` ↔ `Occupied` ↔ `Sanitizing` ↔ `Reserved` ↔ `Maintenance`).
5. **Dynamic Nurse Staffing**: Workload capacity constraints, shift schedules, certifications, and on-call mobilization recommendations.
6. **Biomedical Equipment Tracking**: Real-time reserves for ventilators, infusion pumps, monitors, and dialysis units with atomic cross-department transfer transactions.
7. **Explainable AI Recommendations**: Clear algorithmic reasons with quantitative telemetry, plus natural-language shift briefings generated via **Google Gemini 3.8 Flash** (`@google/genai`).
8. **Human Approval & Override Workflow**: Clinical operators review, approve, reject, or adjust proposed allocations with automatic precondition revalidation to prevent stale allocations.
9. **Dark & Light Mode**: Seamless theme switching with system preference detection and persistence.
10. **Role-Based Demonstration Accounts**: Instant 1-click switcher between Hospital Administrator, ED Director, ICU Critical Care Lead, and Operations Staff, plus registration of new custom accounts.

---

## 🧠 Model Architecture & Methodology

- **Patient Demand Forecasting**:
  - Implements an **Ensemble Diurnal-EWMA Autoregression Model** (`/server/forecasting.ts`).
  - Mathematical basis: Decomposes hourly admission time series into historical diurnal cyclical indices ($S_h$), short-term exponential smoothing ($\alpha = 0.35$), and damped linear trend velocity.
  - Generates empirical 90% prediction intervals based on residual variance $\sigma_{residual}$.
  - Computes authentic MAE, RMSE, and MAPE metrics on a 24-hour test fold without fabricating synthetic accuracy.
- **Resource Allocation Optimization**:
  - Deterministic constraint satisfaction solver (`/server/optimizer.ts`).
  - Evaluates nurse-to-patient acuity ratios (ICU 1:2, ED 1:3, MedSurg 1:4), bed surge thresholds ($>80\%$), and equipment reserve minimums.
- **Natural Language Explanations & Summaries**:
  - Uses the official `@google/genai` TypeScript SDK with model `gemini-3.8-flash`.
  - All prompts strictly ground reasoning in the current SQLite database state (departments, beds, staff workload, alerts).
  - High-reliability local fallback ensures continuous operation if an API key is not present.

---

## 💻 Local Setup & Execution Guide (macOS)

### Prerequisites
- Node.js (v18 or v20+)
- npm or bun

### 1. Clone & Install Dependencies
```bash
cd ai-hro
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
To enable Google Gemini AI operational copilot and natural-language explanations, add your Gemini API key:
```bash
# In .env:
GEMINI_API_KEY="your_actual_gemini_api_key_here"
```
*(If no key is configured, AI-HRO automatically runs its robust local deterministic reasoning engine without breaking).*

### 3. Run Development Server
```bash
npm run dev
```
Open **http://localhost:3000** in your browser.

### 4. Run Automated Unit Tests
To run the automated constraint satisfaction, forecasting, and approval tests:
```bash
npm test
# or:
npx tsx --test server/optimizer.test.ts
```

---

## 👥 Demonstration User Credentials

AI-HRO includes pre-seeded demonstration accounts accessible via the top-right profile dropdown or standard password login (`hospital123`):

| Role | Name | Email | Password |
|---|---|---|---|
| **Hospital Administrator** | Dr. Sarah Lin | `admin@aihro.health` | `hospital123` |
| **ED Department Director** | Marcus Vance, RN | `manager.ed@aihro.health` | `hospital123` |
| **ICU Critical Care Lead** | Dr. Elena Rostova | `manager.icu@aihro.health` | `hospital123` |
| **Bed & Flow Coordinator** | David Chen | `ops@aihro.health` | `hospital123` |

You can also click **"Create Hospital Account"** in the sign-in modal to register your own custom login with distinct department and role permissions.

---

## 🔄 Resetting Demonstration Data

To return all beds, staff workloads, equipment reserves, and admissions to their initial pristine state:
1. Navigate to **Settings & Audit** in the sidebar.
2. Under **"Demonstration Database Reset"**, click **"Reset Demo Data"** and confirm.
3. The server will reinitialize `/data/hospital.db` with standard baseline telemetry.

---

## ⚖️ Academic Disclaimer
*This platform is an academic demonstration prototype designed for operational research and logistics optimization. All patient identifiers, telemetry, and clinical records are simulated. The system is intended for capacity planning and does not provide clinical diagnostic or medical treatment decisions.*
