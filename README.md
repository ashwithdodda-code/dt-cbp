# AI-HRO — LOTUS DIAGNOSTIC CENTRE AND SKIN CLINIC JAMMIKUNTA
### *AI-Powered Dynamic Hospital Resource Optimization Platform*

**AI-HRO** is an empathy-focused academic prototype and clinical resource optimization system designed specifically for **LOTUS DIAGNOSTIC CENTRE AND SKIN CLINIC JAMMIKUNTA**, located in Jammikunta, Karimnagar District, Telangana, India.

The platform demonstrates how dynamic resource allocation, diurnal diagnostic and patient demand forecasting, specialty-guarded staff balancing, medical consumable replenishment, and explainable AI recommendations can reduce staff burnout, prevent emergency ward congestion, and assist clinical directors and hospital administrators in making evidence-backed operational decisions.

---

## 🏥 Hospital Identity & Regional Configuration

- **Deploying Facility**: **LOTUS DIAGNOSTIC CENTRE AND SKIN CLINIC JAMMIKUNTA**
- **Location**: Main Road, Beside Old Bus Stand, Jammikunta, Karimnagar District, Telangana - 505122
- **Leadership**:
  - **Dr. Ravikanti Murali, MBBS, MD (RD)** — Managing Director & Chief Radiologist (Head of Lotus Diagnostic Centre)
  - **Dr. Sindhu Ravikanti, MBBS, MD (DVL)** — Senior Consultant Dermatologist & Clinical Director (Head of Lotus Skin Clinic)
  - **Dr. P. Ramana Murthy, MBBS, MS** — Medical Superintendent & Hospital Administrator
  - **Dr. Ananya Reddy, MBBS, MD** — Casualty & Emergency In-Charge
  - **S. Lakshmi Bai, RN** — Head of Nursing & Bed Flow Coordinator
- **Physical Facility Architecture**: Dual-level clinical complex (Ground Floor: Lotus Diagnostic Centre • First Floor: Lotus Skin Clinic) with natural dark-themed photographic twin integration.
- **Timezone**: Indian Standard Time (`Asia/Kolkata` — displayed as `DD-MM-YYYY` and `hh:mm A IST`)
- **Currency**: Indian Rupee (INR `₹`) with Lakh/Crore metric formatting
- **Emergency Casualty Helpline**: `108 / 102` (Casualty Desk: `+91 8727 255 108` • Reception: `+91 8727 255 678`)
- **Scope**: Single-hospital internal operations, inter-ward resource rebalancing, and local departmental coordination.

---

## 🌟 Key Functional Capabilities

1. **Operations Command Center (Overview)**
   - Live KPI monitoring: Bed Occupancy %, 12-Hour Projected Admissions, Active On-Duty Staff, Available Biomedical Apparatus, Critical Consumable Alerts, and Emergency Casualty Surge Risk.
   - Interactive 7-card summary row with real-time status badges and responsive layout.

2. **Dedicated Specialist Spotlights**
   - **Dr. Sindhu Ravikanti**: Senior Dermatologist & OPD Specialist (`DERM`), leading Skin and Dermatology Services in *OPD Room 101 • Skin & Biopsy Room*.
   - **Dr. Ravikanti Murali**: Chief Radiologist & Imaging HOD (`RADIO`), supervising Diagnostic Imaging in *CT & MRI Reporting Console 01*.
   - Specialty protection guarantees neither specialist is ever erroneously allocated to inappropriate clinical departments such as Emergency Casualty or ICU resuscitation.

3. **12 Configured Hospital Departments**
   - **Dermatology (`DERM`)**: Outpatient dermatology, cryotherapy, phototherapy, skin biopsies.
   - **Radiology and Imaging (`RADIO`)**: 128-Slice CT, 1.5T MRI, Digital X-Ray, Color Doppler Ultrasound, PACS reporting.
   - **General Medicine (`GENMED`)**: Inpatient acute and chronic medical care, diurnal seasonal admissions.
   - **Emergency and Casualty (`CASUALTY`)**: 24/7 acute trauma triage, resuscitation bays, cardiac monitoring.
   - **General Surgery (`SURGERY`)**: Elective and emergency surgical suites, pre-op and recovery wards.
   - **Intensive Care Unit (`ICU`)**: High-dependency beds, mechanical ventilators, invasive hemodynamics.
   - **Laboratory and Diagnostics (`LAB`)**: Pathology, biochemistry, hematology, and rapid blood testing.
   - **Pharmacy and Medical Stores (`PHARM`)**: Central medicine dispensary, antibiotic reserves, consumable logistics.
   - **Nursing and Ward Operations (`NURSING`)**: Central nursing pool, shift rosters, ward supervision.
   - **Administration and Reception (`ADMIN`)**: Patient registration, billing, bed admission coordination, insurance desks.
   - **Housekeeping and Sanitation (`SANIT`)**: Ward terminal cleaning, biomedical waste handling, bed infection control.
   - **Biomedical Equipment Maintenance (`BIOMED`)**: Preventative apparatus servicing, calibration, uptime assurance.

4. **Staff Management & Burnout Protection**
   - Multi-category roster: *Doctors & Specialists, Nurses, Technicians, Pharmacists, Administrative, Sanitation & Support*.
   - Real-time leave status tracking: `Active On-Duty`, `On Leave`, `Sick Leave`, `Maternity Leave`.
   - Workload fatigue indicator: Staff operating above >80% safe workload automatically trigger AI relief recommendations.
   - Assigned room/equipment tagging for seamless accountability.

5. **Medical Consumables & Supplies Inventory**
   - Live tracking of vital healthcare consumables (Omnipaque contrast, Dermabond, normal saline, N95 respirators, disposable syringe kits, ICU arterial line sets).
   - Automatic reorder threshold detection (`quantity <= min_stock_level`).
   - One-click procurement indent generation directly from the UI (`POST /api/consumables/:id/reorder`).

6. **Consultation Suites & Imaging Rooms**
   - Real-time slot management across OPD consultation clinics, biopsy suites, CT/MRI suites, and minor OTs.
   - Tracks doctor occupancy, session timings, and equipment linking.

7. **Patient Demand Forecasting**
   - Decomposes historical admission patterns into diurnal time-of-day cycles ($S_h$), short-term exponential smoothing ($\alpha = 0.35$), and local trend components.
   - Generates empirical 90% confidence prediction intervals.
   - Genuine out-of-sample backtesting validation displaying MAE, RMSE, and MAPE metrics.

8. **Explainable AI Recommendations & Precondition Revalidation**
   - Generates actionable operational recommendations with clear clinical and mathematical reasoning.
   - Before approving any recommendation, the system executes **pre-approval precondition revalidation** against live SQLite records to prevent stale, conflicting, or already fulfilled actions.

9. **Interactive 3D Hospital Digital Twin**
   - Built with Three.js WebGL, rendering spatial hospital pavilions for Casualty, Dermatology, Radiology, ICU, General Medicine, and Surgery.
   - Displays real-time occupancy heat glow, animated staff conduits, and department status.

---

## 👥 Demonstration User Accounts

Pre-seeded accounts can be selected instantly from the top-right profile dropdown or used to sign in via the login modal:

| Role | Name | Department | Email | Password |
|---|---|---|---|---|
| **Managing Director & Admin** | Dr. Ravikanti Murali, MBBS, MD (RD) | Radiology & Imaging (`RADIO`) | `murali.radiology@lotus-jammikunta.in` | `doctor123` |
| **Clinical Director & HOD** | Dr. Sindhu Ravikanti, MBBS, MD (DVL) | Dermatology (`DERM`) | `sindhu.derm@lotus-jammikunta.in` | `doctor123` |
| **Medical Superintendent** | Dr. P. Ramana Murthy, MBBS, MS | Administration (`ADMIN`) | `ramana.murthy@lotus-jammikunta.in` | `admin123` |
| **Casualty In-Charge** | Dr. Ananya Reddy, MBBS, MD | Emergency & Casualty (`CASUALTY`) | `ananya.reddy@lotus-jammikunta.in` | `doctor123` |
| **Bed & Flow Coordinator** | S. Lakshmi Bai, RN | Nursing Operations (`NURSING`) | `nurse.lakshmi@lotus-jammikunta.in` | `nurse123` |

*Operators may also register custom hospital accounts with customized roles and department assignments via the **"Create Hospital Account"** tab.*

---

## 💻 Local Setup & Execution Guide

The application uses an in-process WebAssembly SQLite engine (`sql.js`) with atomic file persistence to `data/hospital.db`. **No external database server, native C++ compiler, or Python installation is required.**

### Prerequisites
- **Node.js**: v18.0.0 or v20+ recommended
- **npm**: v9+ (bundled with Node.js)
- **Code Editor**: Visual Studio Code (or any modern editor)

---

### Step-by-Step Instructions for macOS / Linux (bash/zsh)

1. **Extract and Open the Project**:
   ```bash
   cd ai-hro-telangana
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   *(Optional)* To enable Gemini AI natural-language operational copilot briefings, add your API key in `.env`:
   ```bash
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```
   *Note: If no API key is provided, the platform automatically runs its deterministic rule-based operational engine without errors.*

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open **http://localhost:3000** in your browser.

5. **Run Automated Verification Tests**:
   ```bash
   npm test
   ```

---

### Step-by-Step Instructions for Windows 10/11 (PowerShell or Command Prompt)

1. **Open PowerShell as User** and navigate to your project folder:
   ```powershell
   cd ai-hro-telangana
   ```

2. **Install Dependencies**:
   ```powershell
   npm install
   ```

3. **Configure Environment Variables**:
   In PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```
   Or in Windows Command Prompt (`cmd.exe`):
   ```cmd
   copy .env.example .env
   ```

4. **Start the Development Server**:
   ```powershell
   npm run dev
   ```
   Open your browser to **http://localhost:3000**.

5. **Run Automated Unit Tests**:
   ```powershell
   npm test
   ```

---

## 🧪 Automated Testing Suite

The repository includes a comprehensive unit and integration test suite in `server/optimizer.test.ts`. It executes 6 deterministic validation checks:

```bash
npm test
```

### Verified Test Cases:
1. **Patient Demand Forecasting**: Validates diurnal time-series decomposition, positive non-zero projected admissions, and 90% confidence bands.
2. **Bed Surge Detection**: Confirms that high bed occupancy (>80%) triggers an immediate bed rebalancing or sanitization recommendation.
3. **Specialist Cross-Allocation Guard**: Confirms that Dr. Sindhu Ravikanti (Dermatology) and Dr. Ravikanti Murali (Radiology) are never transferred to Emergency Casualty or ICU triage.
4. **Staff Leave Availability Check**: Asserts that personnel on leave (`on_leave`, `sick_leave`, `maternity_leave`) are excluded from active ward allocations.
5. **Consumable Low-Stock Trigger**: Confirms that consumables falling below buffer thresholds automatically generate restock purchase indents.
6. **SQLite Database Persistence**: Verifies that SQLite migrations, tables, staff rosters, and department profiles successfully load into memory and export atomically to disk.

---

## 🔄 Resetting Demonstration Data

To return the entire hospital state to its initial baseline:
1. Open the **Settings & Audit** view in the left sidebar.
2. Under **"Demonstration Database Reset"**, click **"Reset Demo Data"**.
3. Confirm the action; the backend will re-initialize `data/hospital.db` with all 12 Telangana departments, Dr. Sindhu, Dr. Murali, standard bed occupancy, biomedical equipment, and fresh consumable stock.

---

## ⚖️ Academic Research Disclaimer
*AI-HRO Telangana is an academic demonstration prototype created for healthcare operations research and logistics optimization in Telangana, India. All clinical telemetry, patient counts, and records are simulated. The system is designed for capacity planning and resource allocation and does not provide clinical diagnostic or medical treatment decisions.*
