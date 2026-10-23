import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'hospital.db');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      initTables(dbInstance);
      return dbInstance;
    } catch (err) {
      console.warn('Existing db file corrupted or unreadable, reinitializing...', err);
    }
  }

  dbInstance = new SQL.Database();
  initTables(dbInstance);
  await seedInitialData(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

function initTables(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      total_beds INTEGER NOT NULL,
      baseline_staff INTEGER NOT NULL,
      surge_threshold_pct INTEGER DEFAULT 85,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS beds (
      id TEXT PRIMARY KEY,
      bed_number TEXT NOT NULL,
      department_id TEXT NOT NULL,
      bed_type TEXT NOT NULL,
      status TEXT NOT NULL,
      patient_sim_id TEXT,
      patient_acuity TEXT,
      notes TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      staff_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department_id TEXT NOT NULL,
      role TEXT NOT NULL,
      shift TEXT NOT NULL,
      status TEXT NOT NULL,
      current_workload INTEGER DEFAULT 0,
      max_workload INTEGER DEFAULT 4,
      skills TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      equipment_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      department_id TEXT NOT NULL,
      total_qty INTEGER NOT NULL,
      available_qty INTEGER NOT NULL,
      in_use_qty INTEGER NOT NULL,
      maintenance_qty INTEGER NOT NULL,
      status TEXT NOT NULL,
      last_inspected_at TEXT NOT NULL,
      FOREIGN KEY(department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS admissions_history (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      department_id TEXT NOT NULL,
      admissions_count INTEGER NOT NULL,
      acuity_level TEXT NOT NULL,
      surge_flag INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY(department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS forecasts (
      id TEXT PRIMARY KEY,
      generated_at TEXT NOT NULL,
      department_id TEXT NOT NULL,
      horizon_hours INTEGER NOT NULL,
      predicted_admissions REAL NOT NULL,
      lower_bound REAL NOT NULL,
      upper_bound REAL NOT NULL,
      confidence_score REAL NOT NULL,
      model_used TEXT NOT NULL,
      feature_weights TEXT,
      FOREIGN KEY(department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      rec_code TEXT UNIQUE NOT NULL,
      department_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      title TEXT NOT NULL,
      current_situation TEXT NOT NULL,
      proposed_action TEXT NOT NULL,
      reasons TEXT NOT NULL,
      supporting_data TEXT NOT NULL,
      forecast_horizon_hours INTEGER NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      recommendation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      notes TEXT,
      override_details TEXT,
      applied_changes TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY(recommendation_id) REFERENCES recommendations(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      alert_code TEXT UNIQUE NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      department_id TEXT,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      deduplication_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

async function seedInitialData(db: Database): Promise<void> {
  const defaultPasswordHash = bcrypt.hashSync('hospital123', 8);

  // 1. Users
  const users = [
    {
      id: 'usr_admin_1',
      email: 'admin@aihro.health',
      name: 'Dr. Sarah Lin (Chief of Operations)',
      role: 'admin',
      department: 'Hospital Administration',
    },
    {
      id: 'usr_mgr_ed',
      email: 'manager.ed@aihro.health',
      name: 'Marcus Vance, RN (ED Director)',
      role: 'department_manager',
      department: 'Emergency Medicine',
    },
    {
      id: 'usr_mgr_icu',
      email: 'manager.icu@aihro.health',
      name: 'Dr. Elena Rostova (Critical Care Lead)',
      role: 'department_manager',
      department: 'Intensive Care Unit',
    },
    {
      id: 'usr_ops_1',
      email: 'ops@aihro.health',
      name: 'David Chen (Bed & Flow Coordinator)',
      role: 'operations_staff',
      department: 'Operations Command Center',
    },
  ];

  for (const u of users) {
    db.run(
      `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, department, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.email, defaultPasswordHash, u.name, u.role, u.department, new Date().toISOString()]
    );
  }

  // 2. Departments
  const departments = [
    { id: 'dept_ed', name: 'Emergency Medicine', code: 'ED', total_beds: 24, baseline_staff: 14, surge_threshold_pct: 80, color: '#ef4444' },
    { id: 'dept_icu', name: 'Intensive Care Unit', code: 'ICU', total_beds: 16, baseline_staff: 12, surge_threshold_pct: 85, color: '#f59e0b' },
    { id: 'dept_medsurg', name: 'General Medicine & Surgery', code: 'MEDSURG', total_beds: 40, baseline_staff: 16, surge_threshold_pct: 90, color: '#3b82f6' },
    { id: 'dept_peds', name: 'Pediatrics & Neonatal', code: 'PEDS', total_beds: 18, baseline_staff: 8, surge_threshold_pct: 80, color: '#10b981' },
    { id: 'dept_cardio', name: 'Cardiology & Step-Down', code: 'CARDIO', total_beds: 20, baseline_staff: 10, surge_threshold_pct: 85, color: '#8b5cf6' },
  ];

  for (const d of departments) {
    db.run(
      `INSERT OR IGNORE INTO departments (id, name, code, total_beds, baseline_staff, surge_threshold_pct, color)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.id, d.name, d.code, d.total_beds, d.baseline_staff, d.surge_threshold_pct, d.color]
    );
  }

  // 3. Beds
  const bedConfigs = [
    { deptId: 'dept_ed', count: 24, prefix: 'ED-BED', occupied: 20, cleaning: 2, maint: 0, types: ['Emergency', 'Trauma Bay', 'Triage'] },
    { deptId: 'dept_icu', count: 16, prefix: 'ICU-BED', occupied: 14, cleaning: 1, maint: 0, types: ['ICU Critical', 'Isolation Negative-Pressure'] },
    { deptId: 'dept_medsurg', count: 40, prefix: 'MS-BED', occupied: 32, cleaning: 3, maint: 1, types: ['General Acute', 'Post-Op Step Down'] },
    { deptId: 'dept_peds', count: 18, prefix: 'PED-BED', occupied: 11, cleaning: 1, maint: 0, types: ['Pediatric Ward', 'NICU Incubator'] },
    { deptId: 'dept_cardio', count: 20, prefix: 'CARD-BED', occupied: 14, cleaning: 1, maint: 0, types: ['Telemetry Step-Down', 'Cardiac Monitoring'] },
  ];

  const acuities = ['low', 'medium', 'high', 'critical'];

  for (const cfg of bedConfigs) {
    let occCount = 0;
    let cleanCount = 0;
    let maintCount = 0;
    for (let i = 1; i <= cfg.count; i++) {
      const bedNumber = `${cfg.prefix}-${i.toString().padStart(2, '0')}`;
      const bedType = cfg.types[(i - 1) % cfg.types.length];
      let status = 'available';
      let patientId: string | null = null;
      let acuity: string | null = null;
      let notes: string | null = null;

      if (occCount < cfg.occupied) {
        status = 'occupied';
        occCount++;
        patientId = `SIM-PT-${Math.floor(1000 + Math.random() * 9000)}`;
        acuity = acuities[Math.floor(Math.random() * acuities.length)];
        notes = `Simulated patient telemetry active; admission via ${cfg.deptId.toUpperCase()}`;
      } else if (cleanCount < cfg.cleaning) {
        status = 'cleaning';
        cleanCount++;
        notes = 'Sanitization and terminal cleaning in progress';
      } else if (maintCount < cfg.maint) {
        status = 'maintenance';
        maintCount++;
        notes = 'Electrical sensor calibration scheduled';
      }

      db.run(
        `INSERT OR IGNORE INTO beds (id, bed_number, department_id, bed_type, status, patient_sim_id, patient_acuity, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`bed_${cfg.deptId}_${i}`, bedNumber, cfg.deptId, bedType, status, patientId, acuity, notes, new Date().toISOString()]
      );
    }
  }

  // 4. Staff (Nurses and Specialists)
  const staffMembers = [
    // ED Staff
    { code: 'NUR-ED-01', name: 'Rachel Vance, RN', dept: 'dept_ed', role: 'Triage Nurse', shift: 'Morning 07:00-15:00', status: 'on_duty', load: 3, max: 4, skills: ['Trauma', 'Triage L1-L5', 'ACLS'] },
    { code: 'NUR-ED-02', name: 'Daniel Gomez, BSN', dept: 'dept_ed', role: 'Staff Nurse', shift: 'Morning 07:00-15:00', status: 'on_duty', load: 4, max: 4, skills: ['Emergency Care', 'IV Cannulation'] },
    { code: 'NUR-ED-03', name: 'Aisha Al-Mansoor, RN', dept: 'dept_ed', role: 'Charge Nurse', shift: 'Morning 07:00-15:00', status: 'on_duty', load: 4, max: 4, skills: ['Disaster Triage', 'PALS', 'Code Blue Team'] },
    { code: 'NUR-ED-04', name: 'Brian Miller, NP', dept: 'dept_ed', role: 'Emergency NP', shift: 'Evening 15:00-23:00', status: 'available_on_call', load: 0, max: 5, skills: ['Fast Track', 'Wound Management'] },
    { code: 'NUR-ED-05', name: 'Sofia Rodriguez, RN', dept: 'dept_ed', role: 'Staff Nurse', shift: 'Evening 15:00-23:00', status: 'off_duty', load: 0, max: 4, skills: ['Emergency Care'] },

    // ICU Staff
    { code: 'NUR-ICU-01', name: 'Katherine Thorne, CCRN', dept: 'dept_icu', role: 'ICU Registered Nurse', shift: 'Morning 07:00-15:00', status: 'on_duty', load: 2, max: 2, skills: ['Mechanical Ventilation', 'CRRT', 'ECMO'] },
    { code: 'NUR-ICU-02', name: 'Leo Hashimoto, BSN', dept: 'dept_icu', role: 'ICU Registered Nurse', shift: 'Morning 07:00-15:00', status: 'on_duty', load: 2, max: 2, skills: ['Critical Hemodynamics', 'Neuro ICU'] },
    { code: 'NUR-ICU-03', name: 'Jessica Taylor, CCRN', dept: 'dept_icu', role: 'Charge Nurse', shift: 'Morning 07:00-15:00', status: 'on_duty', load: 2, max: 2, skills: ['Invasive Arterial Lines', 'Code Leadership'] },
    { code: 'NUR-ICU-04', name: 'Tyler Brooks, RN', dept: 'dept_icu', role: 'ICU Registered Nurse', shift: 'Evening 15:00-23:00', status: 'available_on_call', load: 0, max: 2, skills: ['Ventilator Weaning', 'Dialysis'] },

    // MedSurg Staff
    { code: 'NUR-MS-01', name: 'Emma Wilson, RN', dept: 'dept_medsurg', role: 'Staff Nurse', shift: 'Morning 07:00-15:00', status: 'on_duty', load: 4, max: 5, skills: ['Post-Op Recovery', 'Pain Management'] },
    { code: 'NUR-MS-02', name: 'Kevin Zhao, BSN', dept: 'dept_medsurg', role: 'Staff Nurse', shift: 'Morning 07:00-15:00', status: 'on_duty', load: 3, max: 5, skills: ['Infection Control', 'Surgical Wounds'] },
    { code: 'NUR-MS-03', name: 'Samantha Reed, RN', dept: 'dept_medsurg', role: 'Staff Nurse', shift: 'Morning 07:00-15:00', status: 'available_on_call', load: 1, max: 5, skills: ['General Medical', 'Cross-Trained ED'] },
    { code: 'NUR-MS-04', name: 'Carlos Mendez, RN', dept: 'dept_medsurg', role: 'Staff Nurse', shift: 'Evening 15:00-23:00', status: 'available_on_call', load: 0, max: 5, skills: ['General Medical', 'Telemetry'] },

    // PEDS Staff
    { code: 'NUR-PED-01', name: 'Clara Oswald, CPN', dept: 'dept_peds', role: 'Staff Nurse', shift: 'Morning 07:00-15:00', status: 'on_duty', load: 2, max: 3, skills: ['Pediatric Advanced Life Support', 'NICU Care'] },
    { code: 'NUR-PED-02', name: 'Liam O’Connor, RN', dept: 'dept_peds', role: 'Staff Nurse', shift: 'Morning 07:00-15:00', status: 'available_on_call', load: 1, max: 3, skills: ['PALS', 'Pediatric Oncology'] },

    // Cardio Staff
    { code: 'NUR-CARD-01', name: 'Maya Patel, RN', dept: 'dept_cardio', role: 'Staff Nurse', shift: 'Morning 07:00-15:00', status: 'on_duty', load: 3, max: 4, skills: ['Cardiac Telemetry', 'Arrhythmia Recognition'] },
    { code: 'NUR-CARD-02', name: 'Anthony Rossi, BSN', dept: 'dept_cardio', role: 'Staff Nurse', shift: 'Morning 07:00-15:00', status: 'available_on_call', load: 1, max: 4, skills: ['Cardioversion', 'Cardiac Rehab'] },
  ];

  for (let i = 0; i < staffMembers.length; i++) {
    const s = staffMembers[i];
    db.run(
      `INSERT OR IGNORE INTO staff (id, staff_code, name, department_id, role, shift, status, current_workload, max_workload, skills, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`staff_${i + 1}`, s.code, s.name, s.dept, s.role, s.shift, s.status, s.load, s.max, JSON.stringify(s.skills), new Date().toISOString()]
    );
  }

  // 5. Equipment Inventory
  const equipmentItems = [
    { code: 'EQ-VENT-01', name: 'High-Acuity Mechanical Ventilator', category: 'Ventilator', dept: 'dept_icu', total: 12, avail: 1, inUse: 10, maint: 1, status: 'warning_low' },
    { code: 'EQ-VENT-02', name: 'Portable Transport Ventilator', category: 'Ventilator', dept: 'dept_ed', total: 6, avail: 1, inUse: 5, maint: 0, status: 'warning_low' },
    { code: 'EQ-PUMP-01', name: 'Smart Infusion Pump System', category: 'Infusion Pump', dept: 'dept_medsurg', total: 35, avail: 12, inUse: 22, maint: 1, status: 'optimal' },
    { code: 'EQ-PUMP-02', name: 'Quad-Channel Syringe Driver', category: 'Infusion Pump', dept: 'dept_icu', total: 20, avail: 3, inUse: 16, maint: 1, status: 'warning_low' },
    { code: 'EQ-MON-01', name: 'Multi-Parameter Patient Monitor', category: 'Patient Monitor', dept: 'dept_ed', total: 24, avail: 4, inUse: 20, maint: 0, status: 'optimal' },
    { code: 'EQ-MON-02', name: 'Wireless Cardiac Telemetry Pack', category: 'Patient Monitor', dept: 'dept_cardio', total: 20, avail: 6, inUse: 14, maint: 0, status: 'optimal' },
    { code: 'EQ-DEFIB-01', name: 'Biphasic Defibrillator & Pacer', category: 'Defibrillator', dept: 'dept_ed', total: 4, avail: 2, inUse: 2, maint: 0, status: 'optimal' },
    { code: 'EQ-DEFIB-02', name: 'Crash Cart Defibrillator', category: 'Defibrillator', dept: 'dept_medsurg', total: 4, avail: 3, inUse: 1, maint: 0, status: 'optimal' },
    { code: 'EQ-XRAY-01', name: 'Mobile Digital Radiography Unit', category: 'Portable X-Ray', dept: 'dept_ed', total: 2, avail: 1, inUse: 1, maint: 0, status: 'optimal' },
    { code: 'EQ-DIAL-01', name: 'Continuous Renal Replacement System', category: 'Dialysis Unit', dept: 'dept_icu', total: 5, avail: 1, inUse: 3, maint: 1, status: 'warning_low' },
  ];

  for (let i = 0; i < equipmentItems.length; i++) {
    const eq = equipmentItems[i];
    db.run(
      `INSERT OR IGNORE INTO equipment (id, equipment_code, name, category, department_id, total_qty, available_qty, in_use_qty, maintenance_qty, status, last_inspected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`eq_${i + 1}`, eq.code, eq.name, eq.category, eq.dept, eq.total, eq.avail, eq.inUse, eq.maint, eq.status, new Date().toISOString()]
    );
  }

  // 6. Admissions History (30 days of hourly simulated data across departments)
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;
  const hourMs = 3600 * 1000;

  for (let h = 240; h >= 0; h--) {
    const timestamp = new Date(now - h * hourMs).toISOString();
    const hourOfDay = new Date(now - h * hourMs).getHours();

    for (const d of departments) {
      // Baseline admissions with diurnal cycle peaking between 12:00 and 19:00
      let base = d.id === 'dept_ed' ? 4 : d.id === 'dept_medsurg' ? 3 : 1;
      const diurnalFactor = Math.sin(((hourOfDay - 6) / 24) * 2 * Math.PI);
      const diurnalNoise = (Math.random() - 0.5) * 1.5;
      let count = Math.max(0, Math.round(base + diurnalFactor * 2.2 + diurnalNoise));

      // Introduce recent surge in Emergency Department over the past 8 hours
      let surge = 0;
      if (d.id === 'dept_ed' && h <= 8) {
        count += Math.floor(Math.random() * 3) + 2;
        surge = 1;
      }

      const acuity = count > 5 ? 'critical' : count > 3 ? 'high' : count > 1 ? 'medium' : 'low';

      db.run(
        `INSERT OR IGNORE INTO admissions_history (id, timestamp, department_id, admissions_count, acuity_level, surge_flag, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`adm_${d.id}_${h}`, timestamp, d.id, count, acuity, surge, `Simulated historical admission observation period`]
      );
    }
  }

  // 7. Initial Explainable Recommendations
  const initialRecs = [
    {
      id: 'rec_001',
      code: 'REC-ED-SURGE-01',
      dept: 'dept_ed',
      type: 'surge_mitigation',
      title: 'Emergency Department Surge Protocol Activation',
      currentSituation: 'Emergency Department occupancy is currently 83.3% (20/24 beds). Incoming forecast predicts 18 additional admissions in the next 12 hours.',
      proposedAction: 'Deploy 2 on-call triage nurses (Brian Miller, NP & Samantha Reed, RN cross-trained) and expedite 4 stabilized patients to General Medicine step-down beds.',
      reasons: [
        'Forecast model identifies ED admissions exceeding surge threshold of 80% for 3 consecutive intervals.',
        'Current on-duty nursing workload is at 91.7% capacity (11/12 active assignments).',
        'General Medicine ward has 5 available beds with sufficient baseline nursing coverage to absorb transfers.'
      ],
      supportingData: {
        currentOccupancyPct: 83.3,
        predictedAdmissions12h: 18,
        availableBeds: 2,
        staffWorkloadRatio: 0.917,
        recommendedStaffIds: ['staff_4', 'staff_12']
      },
      horizon: 12,
      status: 'pending',
      priority: 'critical'
    },
    {
      id: 'rec_002',
      code: 'REC-ICU-VENT-02',
      dept: 'dept_icu',
      type: 'equipment_transfer',
      title: 'Preventive Ventilator Re-allocation from MedSurg to ICU',
      currentSituation: 'ICU has only 1 available high-acuity mechanical ventilator (10 in use, 1 in maintenance). Forecast projects 2 potential respiratory distress transfers.',
      proposedAction: 'Transfer 1 standby ventilator unit from MedSurg reserve to ICU Clean Utility bay to avoid acute shortage.',
      reasons: [
        'ICU available ventilator margin dropped below safe operating reserve (minimum 2 units required).',
        'MedSurg currently retains surplus equipment with zero pending respiratory cases.',
        'Transfer latency is estimated under 15 minutes without impacting originating ward.'
      ],
      supportingData: {
        icuAvailableVentilators: 1,
        icuRequiredReserve: 2,
        donorDepartment: 'dept_medsurg',
        equipmentCode: 'EQ-VENT-01',
        quantity: 1
      },
      horizon: 24,
      status: 'pending',
      priority: 'high'
    },
    {
      id: 'rec_003',
      code: 'REC-MS-BED-03',
      dept: 'dept_medsurg',
      type: 'bed_capacity',
      title: 'Pre-Admission Bed Turnaround Prioritization',
      currentSituation: '3 beds in General Medicine are currently in "Cleaning" status for over 45 minutes while pending transfer requests queue.',
      proposedAction: 'Reassign environmental services priority to MS-BED-04 and MS-BED-07 to accelerate bed turnaround time.',
      reasons: [
        'Average discharge-to-clean cycle currently exceeds operational target of 30 minutes.',
        'Expediting 2 beds immediately lowers projected ward occupancy below 80% threshold.'
      ],
      supportingData: {
        bedsInCleaning: 3,
        averageDelayMinutes: 48,
        targetBeds: ['MS-BED-04', 'MS-BED-07']
      },
      horizon: 6,
      status: 'pending',
      priority: 'medium'
    }
  ];

  for (const r of initialRecs) {
    db.run(
      `INSERT OR IGNORE INTO recommendations (id, rec_code, department_id, resource_type, title, current_situation, proposed_action, reasons, supporting_data, forecast_horizon_hours, status, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.code,
        r.dept,
        r.type,
        r.title,
        r.currentSituation,
        r.proposedAction,
        JSON.stringify(r.reasons),
        JSON.stringify(r.supportingData),
        r.horizon,
        r.status,
        r.priority,
        new Date().toISOString()
      ]
    );
  }

  // 8. Alerts
  const initialAlerts = [
    {
      id: 'alt_001',
      code: 'ALT-ED-SURGE',
      sev: 'critical',
      title: 'High ED Surge Risk Detected',
      dept: 'dept_ed',
      desc: 'Predicted influx of 18 admissions over next 12 hours will breach 95% capacity without intervention.',
      dedup: 'dedup_ed_surge_critical'
    },
    {
      id: 'alt_002',
      code: 'ALT-ICU-VENT-LOW',
      sev: 'warning',
      title: 'Critical Equipment Margin Warning',
      dept: 'dept_icu',
      desc: 'ICU Mechanical Ventilator available inventory is at 1 unit (safe reserve is >= 2).',
      dedup: 'dedup_icu_vent_low'
    },
    {
      id: 'alt_003',
      code: 'ALT-STAFF-RATIO',
      sev: 'warning',
      title: 'Staffing Capacity Warning in ED',
      dept: 'dept_ed',
      desc: 'Nurse-to-patient ratio in Emergency is approaching maximum threshold (91.7% utilized).',
      dedup: 'dedup_ed_staff_ratio'
    }
  ];

  for (const a of initialAlerts) {
    db.run(
      `INSERT OR IGNORE INTO alerts (id, alert_code, severity, title, department_id, description, status, deduplication_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.code, a.sev, a.title, a.dept, a.desc, 'active', a.dedup, new Date().toISOString()]
    );
  }

  // 9. Audit Log
  db.run(
    `INSERT OR IGNORE INTO audit_logs (id, user_id, user_email, action, entity_type, entity_id, details, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'log_sys_init',
      'system',
      'system@aihro.health',
      'INITIALIZE_SYSTEM',
      'SYSTEM',
      'ai_hro_core',
      JSON.stringify({ status: 'Operational database initialized with simulated seed cohort' }),
      new Date().toISOString()
    ]
  );
}
