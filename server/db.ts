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
      runMigrations(dbInstance);
      return dbInstance;
    } catch (err) {
      console.warn('Existing db file corrupted or unreadable, reinitializing...', err);
    }
  }

  dbInstance = new SQL.Database();
  initTables(dbInstance);
  runMigrations(dbInstance);
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

function safeAddColumn(db: Database, table: string, columnDef: string): void {
  try {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
  } catch {
    // Column already exists or table does not support alter; safe to ignore
  }
}

function initTables(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS hospital_profile (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      expanded_name TEXT NOT NULL,
      country TEXT NOT NULL,
      state TEXT NOT NULL,
      city_district TEXT NOT NULL,
      currency TEXT NOT NULL,
      currency_symbol TEXT NOT NULL,
      timezone TEXT NOT NULL,
      date_format TEXT NOT NULL,
      time_format TEXT NOT NULL,
      contact_phone TEXT,
      emergency_helpline TEXT,
      updated_at TEXT NOT NULL
    );

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
      color TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      category TEXT DEFAULT 'clinical'
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
      category TEXT DEFAULT 'Nurse',
      specialty TEXT,
      shift TEXT NOT NULL,
      status TEXT NOT NULL,
      leave_status TEXT DEFAULT 'active',
      current_workload INTEGER DEFAULT 0,
      max_workload INTEGER DEFAULT 4,
      skills TEXT NOT NULL,
      assigned_room_or_equipment TEXT,
      verification_disclaimer TEXT,
      is_active INTEGER DEFAULT 1,
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

    CREATE TABLE IF NOT EXISTS consumables (
      id TEXT PRIMARY KEY,
      item_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      department_id TEXT NOT NULL,
      quantity_on_hand INTEGER NOT NULL,
      min_stock_level INTEGER NOT NULL,
      unit TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL,
      last_restocked_at TEXT NOT NULL,
      FOREIGN KEY(department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS rooms_and_slots (
      id TEXT PRIMARY KEY,
      room_number TEXT NOT NULL,
      name TEXT NOT NULL,
      department_id TEXT NOT NULL,
      room_type TEXT NOT NULL,
      equipment_id TEXT,
      assigned_staff_id TEXT,
      status TEXT NOT NULL,
      current_slot_info TEXT,
      updated_at TEXT NOT NULL,
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

/**
 * Versioned, idempotent migration that upgrades any existing database safely:
 * - Adds columns if missing
 * - Populates hospital profile
 * - Prepopulates Dr. Sindhu Ravikanti & Dr. Ravikanti Murali
 * - Localizes department roster to Telangana multispecialty structure
 * - Seeds consumables and rooms
 * - Preserves existing user-created records
 */
function runMigrations(db: Database): void {
  // 1. Ensure columns exist on older tables
  safeAddColumn(db, 'departments', 'is_enabled INTEGER DEFAULT 1');
  safeAddColumn(db, 'departments', 'category TEXT DEFAULT "clinical"');
  safeAddColumn(db, 'staff', 'category TEXT DEFAULT "Nurse"');
  safeAddColumn(db, 'staff', 'specialty TEXT');
  safeAddColumn(db, 'staff', 'leave_status TEXT DEFAULT "active"');
  safeAddColumn(db, 'staff', 'assigned_room_or_equipment TEXT');
  safeAddColumn(db, 'staff', 'verification_disclaimer TEXT');
  safeAddColumn(db, 'staff', 'is_active INTEGER DEFAULT 1');
  try {
    db.run('UPDATE staff SET is_active = 1 WHERE is_active IS NULL');
  } catch {
    // Ignore if not present yet
  }

  // 2. Hospital Profile Initialization (Lotus Diagnostic Centre and Skin Clinic Jammikunta)
  db.run(`
    INSERT OR REPLACE INTO hospital_profile (
      id, name, expanded_name, country, state, city_district, currency, currency_symbol,
      timezone, date_format, time_format, contact_phone, emergency_helpline, updated_at
    ) VALUES (
      'hosp_telangana_main',
      'LOTUS DIAGNOSTIC CENTRE AND SKIN CLINIC JAMMIKUNTA',
      'Lotus Diagnostic Centre & Skin Clinic | Jammikunta, Karimnagar District, Telangana',
      'India',
      'Telangana',
      'Jammikunta, Karimnagar District',
      'INR',
      '₹',
      'Asia/Kolkata',
      'DD-MM-YYYY',
      'IST',
      '+91 8727 255 678',
      '108 / 102 (Casualty: +91 8727 255 108)',
      '${new Date().toISOString()}'
    )
  `);

  // Ensure any existing database on disk is upgraded to Lotus Jammikunta profile
  try {
    db.run(`
      UPDATE hospital_profile
      SET name = 'LOTUS DIAGNOSTIC CENTRE AND SKIN CLINIC JAMMIKUNTA',
          expanded_name = 'Lotus Diagnostic Centre & Skin Clinic | Jammikunta, Karimnagar District, Telangana',
          city_district = 'Jammikunta, Karimnagar District',
          state = 'Telangana',
          contact_phone = '+91 8727 255 678',
          emergency_helpline = '108 / 102 (Casualty: +91 8727 255 108)'
      WHERE id = 'hosp_telangana_main' OR id IS NOT NULL
    `);
  } catch (err) {
    // Ignore if not present
  }

  // 3. Departments (12 Telangana Hospital Departments)
  const telanganaDepts = [
    { id: 'dept_derm', name: 'Dermatology & Skin Clinic', code: 'DERM', total_beds: 6, baseline_staff: 6, surge_threshold_pct: 80, color: '#ec4899', cat: 'clinical' },
    { id: 'dept_radio', name: 'Radiology & Diagnostic Centre', code: 'RADIO', total_beds: 4, baseline_staff: 8, surge_threshold_pct: 85, color: '#6366f1', cat: 'diagnostic' },
    { id: 'dept_genmed', name: 'General Medicine', code: 'GENMED', total_beds: 36, baseline_staff: 14, surge_threshold_pct: 85, color: '#0ea5e9', cat: 'clinical' },
    { id: 'dept_casualty', name: 'Emergency and Casualty', code: 'CASUALTY', total_beds: 20, baseline_staff: 16, surge_threshold_pct: 80, color: '#ef4444', cat: 'clinical' },
    { id: 'dept_surgery', name: 'General Surgery', code: 'SURGERY', total_beds: 24, baseline_staff: 12, surge_threshold_pct: 85, color: '#f59e0b', cat: 'clinical' },
    { id: 'dept_icu', name: 'Intensive Care Unit (ICU)', code: 'ICU', total_beds: 14, baseline_staff: 12, surge_threshold_pct: 85, color: '#dc2626', cat: 'clinical' },
    { id: 'dept_lab', name: 'Laboratory and Diagnostics', code: 'LAB', total_beds: 0, baseline_staff: 8, surge_threshold_pct: 90, color: '#14b8a6', cat: 'diagnostic' },
    { id: 'dept_pharmacy', name: 'Pharmacy and Medical Stores', code: 'PHARM', total_beds: 0, baseline_staff: 6, surge_threshold_pct: 90, color: '#10b981', cat: 'support' },
    { id: 'dept_nursing', name: 'Nursing and Ward Operations', code: 'NURSING', total_beds: 0, baseline_staff: 20, surge_threshold_pct: 85, color: '#8b5cf6', cat: 'support' },
    { id: 'dept_admin', name: 'Administration and Reception', code: 'ADMIN', total_beds: 0, baseline_staff: 8, surge_threshold_pct: 90, color: '#64748b', cat: 'administrative' },
    { id: 'dept_housekeeping', name: 'Housekeeping and Sanitation', code: 'SANIT', total_beds: 0, baseline_staff: 10, surge_threshold_pct: 85, color: '#d97706', cat: 'support' },
    { id: 'dept_biomed', name: 'Biomedical Equipment Maintenance', code: 'BIOMED', total_beds: 0, baseline_staff: 6, surge_threshold_pct: 90, color: '#0284c7', cat: 'support' },
  ];

  for (const d of telanganaDepts) {
    db.run(
      `INSERT INTO departments (id, name, code, total_beds, baseline_staff, surge_threshold_pct, color, is_enabled, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         code=excluded.code,
         total_beds=excluded.total_beds,
         baseline_staff=excluded.baseline_staff,
         surge_threshold_pct=excluded.surge_threshold_pct,
         color=excluded.color,
         category=excluded.category`,
      [d.id, d.name, d.code, d.total_beds, d.baseline_staff, d.surge_threshold_pct, d.color, d.cat]
    );
  }

  // 4. Demonstration Users (Lotus Diagnostic Centre & Skin Clinic Jammikunta Team)
  const defaultPasswordHash = bcrypt.hashSync('hospital123', 8);
  const demoUsers = [
    {
      id: 'usr_murali_md',
      email: 'murali.radiology@lotus-jammikunta.in',
      name: 'Dr. Ravikanti Murali, MD (RD) (Managing Director & Chief Radiologist)',
      role: 'admin',
      department: 'Lotus Diagnostic Centre & Administration',
    },
    {
      id: 'usr_derm_lead',
      email: 'sindhu.derm@lotus-jammikunta.in',
      name: 'Dr. Sindhu Ravikanti, MD (DVL) (Senior Dermatologist & Clinical Director)',
      role: 'department_manager',
      department: 'Lotus Skin Clinic & Dermatology',
    },
    {
      id: 'usr_admin_ts',
      email: 'ramana.murthy@lotus-jammikunta.in',
      name: 'Dr. P. Ramana Murthy, MS (Medical Superintendent)',
      role: 'admin',
      department: 'Medical Administration',
    },
    {
      id: 'usr_casualty_lead',
      email: 'ananya.reddy@lotus-jammikunta.in',
      name: 'Dr. Ananya Reddy, MD (Casualty & Emergency In-Charge)',
      role: 'department_manager',
      department: 'Emergency and Casualty',
    },
    {
      id: 'usr_ops_ts',
      email: 'nurse.lakshmi@lotus-jammikunta.in',
      name: 'S. Lakshmi Bai, RN (Head of Nursing & Bed Coordinator)',
      role: 'operations_staff',
      department: 'Nursing & Ward Operations',
    },
  ];

  for (const u of demoUsers) {
    db.run(
      `INSERT INTO users (id, email, password_hash, name, role, department, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         name=excluded.name,
         role=excluded.role,
         department=excluded.department`,
      [u.id, u.email, defaultPasswordHash, u.name, u.role, u.department, new Date().toISOString()]
    );
  }

  // 5. Staff Roster (Must include Dr. Sindhu Ravikanti and Dr. Ravikanti Murali)
  const localizedStaff = [
    // Doctor 1: Dr. Sindhu Ravikanti (Head of Lotus Skin Clinic)
    {
      id: 'staff_doc_sindhu',
      code: 'DOC-LDC-DERM-01',
      name: 'Dr. Sindhu Ravikanti',
      dept: 'dept_derm',
      role: 'Senior Consultant Dermatologist & Clinical Director, MBBS, MD (DVL)',
      category: 'Doctor / Specialist',
      specialty: 'Skin and dermatology services',
      shift: 'Morning 09:00-14:00 IST',
      status: 'on_duty',
      leave_status: 'active',
      load: 3,
      max: 6,
      skills: ['Skin and dermatology services', 'Skin Biopsy', 'Phototherapy', 'Cryotherapy', 'Allergy Patch Testing', 'Pediatric Dermatology', 'Dermatosurgery'],
      assigned: 'OPD Consultation Room 101 • Skin & Biopsy Suite (1st Floor)',
      disclaimer: 'Lotus Skin Clinic clinical lead profile • Jammikunta'
    },
    // Doctor 2: Dr. Ravikanti Murali (Managing Director & Head of Lotus Diagnostic Centre)
    {
      id: 'staff_doc_murali',
      code: 'DOC-LDC-RAD-01',
      name: 'Dr. Ravikanti Murali',
      dept: 'dept_radio',
      role: 'Managing Director & Chief Radiologist, MBBS, MD (RD)',
      category: 'Doctor / Specialist',
      specialty: 'Radiology and diagnostic imaging',
      shift: 'Morning 08:30-14:30 IST',
      status: 'on_duty',
      leave_status: 'active',
      load: 4,
      max: 8,
      skills: ['Radiology and diagnostic imaging', 'Computed Tomography (CT)', 'Color Doppler Ultrasound', 'Digital Radiography (X-Ray)', 'Emergency Trauma Scans', 'PACS Reporting'],
      assigned: '128-Slice CT Console & USG Doppler Bay 1 (Ground Floor)',
      disclaimer: 'Lotus Diagnostic Centre managing director & radiology lead • Jammikunta'
    },
    // Doctor 3: Dr. P. Ramana Murthy (Medical Superintendent)
    {
      id: 'staff_doc_murthy',
      code: 'DOC-LDC-ADM-01',
      name: 'Dr. P. Ramana Murthy, MBBS, MS',
      dept: 'dept_admin',
      role: 'Medical Superintendent & Senior Consultant',
      category: 'Doctor / Specialist',
      specialty: 'Clinical Governance & General Surgery',
      shift: 'General 08:30-16:30 IST',
      status: 'on_duty',
      leave_status: 'active',
      load: 3,
      max: 6,
      skills: ['Hospital Administration', 'Clinical Governance', 'Emergency Triage Supervision', 'Surgical Oversight'],
      assigned: 'Superintendent Office & Clinical Governance Board',
      disclaimer: 'Lotus Diagnostic Centre administration profile • Jammikunta'
    },
    // Doctor 4: Dr. Ananya Reddy (Casualty In-Charge)
    {
      id: 'staff_doc_ananya',
      code: 'DOC-LDC-CAS-01',
      name: 'Dr. Ananya Reddy, MBBS, MD',
      dept: 'dept_casualty',
      role: 'Consultant Emergency Physician & Casualty In-Charge',
      category: 'Doctor / Specialist',
      specialty: 'Emergency Medicine & Acute Trauma Care',
      shift: 'Morning 07:00-15:00 IST',
      status: 'on_duty',
      leave_status: 'active',
      load: 5,
      max: 6,
      skills: ['Emergency Medicine', 'Advanced Cardiac Life Support (ACLS)', 'Disaster Triage', 'Polytrauma Resuscitation'],
      assigned: 'Casualty Trauma Bay 1 & Resuscitation (Ground Floor)',
      disclaimer: 'Lotus Casualty emergency lead profile • Jammikunta'
    },
    {
      id: 'staff_nurse_lakshmi',
      code: 'NUR-TS-CAS-01',
      name: 'S. Lakshmi Bai, RN',
      dept: 'dept_casualty',
      role: 'Senior Nursing Officer',
      category: 'Nurse',
      specialty: 'Emergency & Triage Nursing',
      shift: 'Morning 07:00-15:00',
      status: 'on_duty',
      leave_status: 'active',
      load: 3,
      max: 4,
      skills: ['Triage L1-L5', 'IV Cannulation', 'Emergency Resuscitation', 'Shift Leadership'],
      assigned: 'Casualty Triage Desk',
      disclaimer: 'Demonstration staff profile'
    },
    {
      id: 'staff_nurse_kavitha',
      code: 'NUR-TS-CAS-02',
      name: 'K. Kavitha, GNM',
      dept: 'dept_casualty',
      role: 'Staff Nurse',
      category: 'Nurse',
      specialty: 'Emergency Care',
      shift: 'Morning 07:00-15:00',
      status: 'on_duty',
      leave_status: 'active',
      load: 3,
      max: 4,
      skills: ['Trauma Care', 'Wound Dressing', 'Vitals Telemetry'],
      assigned: 'Casualty Bed Area',
      disclaimer: 'Demonstration staff profile'
    },
    {
      id: 'staff_nurse_bhanu',
      code: 'NUR-TS-CAS-03',
      name: 'Bhanu Prakash, BSc Nursing',
      dept: 'dept_casualty',
      role: 'Emergency Staff Nurse',
      category: 'Nurse',
      specialty: 'Acute Emergency Care',
      shift: 'Evening 15:00-23:00',
      status: 'available_on_call',
      leave_status: 'active',
      load: 0,
      max: 4,
      skills: ['Emergency Care', 'Disaster Response', 'Cross-Trained ICU'],
      assigned: 'On-Call Reserve',
      disclaimer: 'Demonstration staff profile'
    },
    // Radiology Technologists
    {
      id: 'staff_tech_ramesh',
      code: 'TECH-TS-RAD-01',
      name: 'P. Ramesh Kumar',
      dept: 'dept_radio',
      role: 'Senior Radiology Technologist',
      category: 'Radiology Technician',
      specialty: 'CT & Digital Radiography',
      shift: 'Morning 08:00-16:00',
      status: 'on_duty',
      leave_status: 'active',
      load: 5,
      max: 8,
      skills: ['Computed Tomography', 'Digital Radiography', 'Radiation Safety (AERB)', 'PACS Handling'],
      assigned: 'CT Scan Suite & X-Ray Room 1',
      disclaimer: 'Demonstration staff profile'
    },
    {
      id: 'staff_tech_suresh',
      code: 'TECH-TS-RAD-02',
      name: 'M. Suresh Goud',
      dept: 'dept_radio',
      role: 'Radiology Technician',
      category: 'Radiology Technician',
      specialty: 'Ultrasound & X-Ray Assistance',
      shift: 'Evening 14:00-22:00',
      status: 'available_on_call',
      leave_status: 'active',
      load: 0,
      max: 6,
      skills: ['Digital Radiography', 'Darkroom Processing', 'Patient Positioning'],
      assigned: 'Radiology Reserve',
      disclaimer: 'Demonstration staff profile'
    },
    // ICU Specialist & Nurses
    {
      id: 'staff_doc_venkat',
      code: 'DOC-TS-ICU-01',
      name: 'Dr. K. Venkat Rao',
      dept: 'dept_icu',
      role: 'Critical Care Specialist & Intensivist',
      category: 'Doctor / Specialist',
      specialty: 'Critical Care & Anesthesiology',
      shift: 'Morning 07:00-15:00',
      status: 'on_duty',
      leave_status: 'active',
      load: 3,
      max: 4,
      skills: ['Critical Care', 'Endotracheal Intubation', 'Central Line Insertion', 'Mechanical Ventilation'],
      assigned: 'ICU Critical Pod A',
      disclaimer: 'Demonstration staff profile'
    },
    {
      id: 'staff_nurse_lavanya',
      code: 'NUR-TS-ICU-01',
      name: 'P. Lavanya, Post-BSc Nursing',
      dept: 'dept_icu',
      role: 'Critical Care Registered Nurse',
      category: 'Nurse',
      specialty: 'Intensive Care Nursing',
      shift: 'Morning 07:00-15:00',
      status: 'on_duty',
      leave_status: 'active',
      load: 2,
      max: 2,
      skills: ['Mechanical Ventilation', 'Arterial Lines', 'CRRT Dialysis Protocol', 'Code Blue'],
      assigned: 'ICU Beds 01-02',
      disclaimer: 'Demonstration staff profile'
    },
    // General Medicine Doctor & Nurse
    {
      id: 'staff_doc_swathi',
      code: 'DOC-TS-MED-01',
      name: 'Dr. Ch. Swathi',
      dept: 'dept_genmed',
      role: 'Consultant General Physician',
      category: 'Doctor / Specialist',
      specialty: 'Internal & General Medicine',
      shift: 'Morning 08:00-16:00',
      status: 'on_duty',
      leave_status: 'active',
      load: 4,
      max: 8,
      skills: ['Internal Medicine', 'Infectious Diseases', 'Diabetes & Hypertension Management', 'Ward Rounds'],
      assigned: 'General Medical Ward A',
      disclaimer: 'Demonstration staff profile'
    },
    {
      id: 'staff_nurse_sai',
      code: 'NUR-TS-MED-01',
      name: 'K. Sai Kumar, RN',
      dept: 'dept_genmed',
      role: 'Ward Staff Nurse',
      category: 'Nurse',
      specialty: 'Acute Medical Care',
      shift: 'Morning 07:00-15:00',
      status: 'on_duty',
      leave_status: 'active',
      load: 4,
      max: 5,
      skills: ['Medication Administration', 'Vitals Telemetry', 'Diabetic Care'],
      assigned: 'General Medical Ward Beds 01-05',
      disclaimer: 'Demonstration staff profile'
    },
    // Laboratory Technologist
    {
      id: 'staff_lab_swapna',
      code: 'LAB-TS-01',
      name: 'T. Swapna, BSc MLT',
      dept: 'dept_lab',
      role: 'Chief Medical Laboratory Technologist',
      category: 'Laboratory Technician',
      specialty: 'Clinical Pathology & Biochemistry',
      shift: 'Morning 08:00-16:00',
      status: 'on_duty',
      leave_status: 'active',
      load: 4,
      max: 10,
      skills: ['Hematology Analysis', 'Biochemistry Auto-analyzers', 'Cross-Matching & Blood Bank', 'Electrolytes'],
      assigned: 'Central Diagnostic Lab Console',
      disclaimer: 'Demonstration staff profile'
    },
    // Pharmacist
    {
      id: 'staff_pharm_srinivas',
      code: 'PHARM-TS-01',
      name: 'B. Srinivas, BPharm',
      dept: 'dept_pharmacy',
      role: 'Chief Pharmacist & Stores In-Charge',
      category: 'Pharmacist',
      specialty: 'Hospital Pharmacy & Drug Inventory',
      shift: 'Morning 08:30-16:30',
      status: 'on_duty',
      leave_status: 'active',
      load: 3,
      max: 10,
      skills: ['Drug Dispensing', 'Inventory Auditing', 'Cold Chain Management', 'Scheduled Drugs Register'],
      assigned: 'Central Pharmacy Counter & Stores',
      disclaimer: 'Demonstration staff profile'
    },
    // Ward Assistant
    {
      id: 'staff_ward_sunitha',
      code: 'WARD-TS-01',
      name: 'M. Sunitha',
      dept: 'dept_nursing',
      role: 'Senior Ward Assistant',
      category: 'Ward Assistant',
      specialty: 'Patient Mobility & Bedside Support',
      shift: 'Morning 07:00-15:00',
      status: 'on_duty',
      leave_status: 'active',
      load: 3,
      max: 6,
      skills: ['Patient Transfer', 'Wheelchair Support', 'Linen Supply', 'Specimen Transit'],
      assigned: 'General Medicine & Casualty Corridors',
      disclaimer: 'Demonstration staff profile'
    },
    // Reception & Registration
    {
      id: 'staff_adm_balakrishna',
      code: 'REC-TS-01',
      name: 'K. Balakrishna',
      dept: 'dept_admin',
      role: 'Front Desk & Triage Receptionist',
      category: 'Reception Staff',
      specialty: 'Patient Registration & Aarogyasri Helpdesk',
      shift: 'Morning 08:00-16:00',
      status: 'on_duty',
      leave_status: 'active',
      load: 4,
      max: 12,
      skills: ['Aarogyasri Portal', 'Patient Intake Registration', 'Queue Management', 'Billing Inquiries'],
      assigned: 'Main Entrance Reception Counter 1',
      disclaimer: 'Demonstration staff profile'
    },
    // Housekeeping Supervisor
    {
      id: 'staff_sanit_mallesh',
      code: 'HK-TS-01',
      name: 'G. Mallesh',
      dept: 'dept_housekeeping',
      role: 'Sanitation & Housekeeping Supervisor',
      category: 'Housekeeping Staff',
      specialty: 'Terminal Bed Cleaning & Bio-Waste Protocol',
      shift: 'Morning 06:30-14:30',
      status: 'on_duty',
      leave_status: 'active',
      load: 2,
      max: 6,
      skills: ['Terminal Disinfection', 'Biomedical Waste Segregation', 'Spill Protocol', 'Room Turnaround'],
      assigned: 'Casualty & ICU Sanitization Rounds',
      disclaimer: 'Demonstration staff profile'
    },
    // Biomedical Engineer
    {
      id: 'staff_bme_chandra',
      code: 'BME-TS-01',
      name: 'V. Chandrashekhar, BTech',
      dept: 'dept_biomed',
      role: 'Lead Biomedical Engineer',
      category: 'Biomedical Technician',
      specialty: 'Diagnostic & Life Support Equipment',
      shift: 'General 09:00-17:00',
      status: 'on_duty',
      leave_status: 'active',
      load: 2,
      max: 5,
      skills: ['Ventilator Calibration', 'X-Ray Calibration (AERB)', 'Defibrillator Safety Testing', 'Preventive Maintenance'],
      assigned: 'Biomedical Engineering Workshop',
      disclaimer: 'Demonstration staff profile'
    },
    // Staff member on leave for testing constraint engine
    {
      id: 'staff_doc_leave',
      code: 'DOC-TS-SURG-02',
      name: 'Dr. G. Pranay Kumar',
      dept: 'dept_surgery',
      role: 'Associate Surgeon',
      category: 'Doctor / Specialist',
      specialty: 'General & Laparoscopic Surgery',
      shift: 'Morning 08:00-16:00',
      status: 'off_duty',
      leave_status: 'on_leave',
      load: 0,
      max: 6,
      skills: ['Laparoscopy', 'Trauma Surgery', 'Pre-op Assessment'],
      assigned: 'On Approved Casual Leave',
      disclaimer: 'Demonstration staff profile on leave'
    }
  ];

  for (const s of localizedStaff) {
    db.run(
      `INSERT INTO staff (
         id, staff_code, name, department_id, role, category, specialty,
         shift, status, leave_status, current_workload, max_workload, skills,
         assigned_room_or_equipment, verification_disclaimer, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         staff_code=excluded.staff_code,
         name=excluded.name,
         department_id=excluded.department_id,
         role=excluded.role,
         category=excluded.category,
         specialty=excluded.specialty,
         shift=excluded.shift,
         status=excluded.status,
         leave_status=excluded.leave_status,
         current_workload=excluded.current_workload,
         max_workload=excluded.max_workload,
         skills=excluded.skills,
         assigned_room_or_equipment=excluded.assigned_room_or_equipment,
         verification_disclaimer=excluded.verification_disclaimer`,
      [
        s.id, s.code, s.name, s.dept, s.role, s.category, s.specialty,
        s.shift, s.status, s.leave_status, s.load, s.max, JSON.stringify(s.skills),
        s.assigned, s.disclaimer, new Date().toISOString()
      ]
    );
  }

  // Deactivate old foreign staff records if they existed in prior seed
  db.run(`
    UPDATE staff
    SET status = 'off_duty', leave_status = 'on_leave'
    WHERE id LIKE 'staff_%'
      AND id NOT LIKE 'staff_doc_%'
      AND id NOT LIKE 'staff_nurse_%'
      AND id NOT LIKE 'staff_tech_%'
      AND id NOT LIKE 'staff_lab_%'
      AND id NOT LIKE 'staff_pharm_%'
      AND id NOT LIKE 'staff_ward_%'
      AND id NOT LIKE 'staff_adm_%'
      AND id NOT LIKE 'staff_sanit_%'
      AND id NOT LIKE 'staff_bme_%'
  `);

  // 6. Beds & Wards (Localized to Casualty, ICU, General Med, Surgery, Derm)
  const bedConfig = [
    { deptId: 'dept_casualty', count: 20, prefix: 'CAS-BED', occupied: 16, cleaning: 2, maint: 0, types: ['Emergency Trauma Bay', 'Acute Resuscitation', 'Observation Bed'] },
    { deptId: 'dept_icu', count: 14, prefix: 'ICU-BED', occupied: 12, cleaning: 1, maint: 0, types: ['ICU Critical Care', 'Negative Pressure Isolation', 'Ventilator Bed'] },
    { deptId: 'dept_genmed', count: 36, prefix: 'MED-BED', occupied: 28, cleaning: 3, maint: 1, types: ['General Acute Medical', 'Telemetry Step-Down'] },
    { deptId: 'dept_surgery', count: 24, prefix: 'SURG-BED', occupied: 18, cleaning: 2, maint: 0, types: ['Post-Op Surgical Care', 'Pre-Op Preparation'] },
    { deptId: 'dept_derm', count: 6, prefix: 'DERM-BED', occupied: 3, cleaning: 1, maint: 0, types: ['Dermatology Daycare', 'Phototherapy Unit Bed'] },
  ];

  const acuities = ['low', 'medium', 'high', 'critical'];

  for (const cfg of bedConfig) {
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
        patientId = `SIM-TS-${Math.floor(1000 + Math.random() * 9000)}`;
        acuity = acuities[Math.floor(Math.random() * acuities.length)];
        notes = `Simulated patient telemetry active; admitted in ${cfg.deptId.replace('dept_', '').toUpperCase()}`;
      } else if (cleanCount < cfg.cleaning) {
        status = 'cleaning';
        cleanCount++;
        notes = 'Terminal sanitation and linen turnaround in progress';
      } else if (maintCount < cfg.maint) {
        status = 'maintenance';
        maintCount++;
        notes = 'Biomedical sensor calibration scheduled';
      }

      db.run(
        `INSERT OR IGNORE INTO beds (id, bed_number, department_id, bed_type, status, patient_sim_id, patient_acuity, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`bed_${cfg.deptId}_${i}`, bedNumber, cfg.deptId, bedType, status, patientId, acuity, notes, new Date().toISOString()]
      );
    }
  }

  // 7. Medical Equipment (Localized equipment list)
  const localizedEquipment = [
    { id: 'eq_ts_ct', code: 'EQ-TS-RAD-CT1', name: '128-Slice Multi-Detector CT Scanner', category: 'CT Scanner', dept: 'dept_radio', total: 1, avail: 1, inUse: 0, maint: 0, status: 'optimal' },
    { id: 'eq_ts_xray', code: 'EQ-TS-RAD-XR1', name: 'Ceiling-Suspended Digital Radiography System', category: 'Digital X-Ray', dept: 'dept_radio', total: 2, avail: 1, inUse: 1, maint: 0, status: 'optimal' },
    { id: 'eq_ts_usg', code: 'EQ-TS-RAD-US1', name: 'Color Doppler Ultrasound Scanner', category: 'Ultrasound', dept: 'dept_radio', total: 2, avail: 1, inUse: 1, maint: 0, status: 'optimal' },
    { id: 'eq_ts_vent_icu', code: 'EQ-TS-ICU-VENT1', name: 'Advanced Invasive Mechanical Ventilator', category: 'Ventilator', dept: 'dept_icu', total: 10, avail: 2, inUse: 7, maint: 1, status: 'warning_low' },
    { id: 'eq_ts_vent_cas', code: 'EQ-TS-CAS-VENT1', name: 'Transport & Emergency Resuscitation Ventilator', category: 'Ventilator', dept: 'dept_casualty', total: 4, avail: 1, inUse: 3, maint: 0, status: 'warning_low' },
    { id: 'eq_ts_derm_photo', code: 'EQ-TS-DERM-PT1', name: 'Narrowband UVB Whole-Body Phototherapy Chamber', category: 'Phototherapy Unit', dept: 'dept_derm', total: 1, avail: 1, inUse: 0, maint: 0, status: 'optimal' },
    { id: 'eq_ts_derm_derm', code: 'EQ-TS-DERM-DS1', name: 'Polarized Epiluminescence Dermatoscope', category: 'Dermatoscope', dept: 'dept_derm', total: 2, avail: 2, inUse: 0, maint: 0, status: 'optimal' },
    { id: 'eq_ts_pump_icu', code: 'EQ-TS-ICU-PUMP1', name: 'Dual-Channel Smart Syringe Infusion Pump', category: 'Infusion Pump', dept: 'dept_icu', total: 18, avail: 3, inUse: 14, maint: 1, status: 'warning_low' },
    { id: 'eq_ts_pump_med', code: 'EQ-TS-MED-PUMP1', name: 'Volumetric Intravenous Infusion Pump', category: 'Infusion Pump', dept: 'dept_genmed', total: 24, avail: 8, inUse: 16, maint: 0, status: 'optimal' },
    { id: 'eq_ts_defib_cas', code: 'EQ-TS-CAS-DEF1', name: 'Biphasic Defibrillator with External Pacer', category: 'Defibrillator', dept: 'dept_casualty', total: 3, avail: 2, inUse: 1, maint: 0, status: 'optimal' },
    { id: 'eq_ts_monitor_cas', code: 'EQ-TS-CAS-MON1', name: 'Multi-Parameter Bedside Telemetry Monitor', category: 'Patient Monitor', dept: 'dept_casualty', total: 16, avail: 3, inUse: 13, maint: 0, status: 'optimal' },
  ];

  for (const eq of localizedEquipment) {
    db.run(
      `INSERT INTO equipment (id, equipment_code, name, category, department_id, total_qty, available_qty, in_use_qty, maintenance_qty, status, last_inspected_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         category=excluded.category,
         department_id=excluded.department_id,
         total_qty=excluded.total_qty,
         available_qty=excluded.available_qty,
         in_use_qty=excluded.in_use_qty,
         status=excluded.status`,
      [eq.id, eq.code, eq.name, eq.category, eq.dept, eq.total, eq.avail, eq.inUse, eq.maint, eq.status, new Date().toISOString()]
    );
  }

  // 8. Consumables & Medical Supplies
  const localizedConsumables = [
    { id: 'con_gloves', code: 'CON-GLV-01', name: 'Sterile Surgical Latex Gloves (Size 7.5)', category: 'Protective Equipment', dept: 'dept_pharmacy', qty: 120, min: 250, unit: 'pairs', exp: '2027-12-31', status: 'critical' },
    { id: 'con_n95', code: 'CON-N95-01', name: 'N95 Particulate Respirator Masks (ISI Certified)', category: 'Protective Equipment', dept: 'dept_pharmacy', qty: 450, min: 300, unit: 'pieces', exp: '2028-06-30', status: 'optimal' },
    { id: 'con_cannula_20g', code: 'CON-CAN-20', name: 'IV Cannula with Injection Port 20G (Pink)', category: 'Injection & Infusion', dept: 'dept_casualty', qty: 45, min: 100, unit: 'units', exp: '2027-08-15', status: 'critical' },
    { id: 'con_syringes_5ml', code: 'CON-SYR-05', name: 'Disposable Syringes with Needle 5ml', category: 'Injection & Infusion', dept: 'dept_pharmacy', qty: 600, min: 400, unit: 'pieces', exp: '2028-01-31', status: 'optimal' },
    { id: 'con_gauze', code: 'CON-GAU-01', name: 'Sterile Absorbent Gauze Swabs (10x10cm)', category: 'Dressing & Wound Care', dept: 'dept_casualty', qty: 180, min: 150, unit: 'packs', exp: '2027-10-15', status: 'optimal' },
    { id: 'con_derm_biopsy', code: 'CON-DERM-PNCH', name: 'Sterile Disposable Skin Biopsy Punches (4mm)', category: 'Diagnostic Reagents', dept: 'dept_derm', qty: 12, min: 25, unit: 'units', exp: '2027-05-30', status: 'low_stock' },
    { id: 'con_ct_contrast', code: 'CON-RAD-CONT', name: 'Non-Ionic Iodinated CT Contrast Media (300mg/ml)', category: 'Diagnostic Reagents', dept: 'dept_radio', qty: 28, min: 20, unit: 'vials', exp: '2027-03-31', status: 'optimal' },
    { id: 'con_sanitizer', code: 'CON-SAN-5L', name: 'Hospital Grade Hand Rub Sanitizer (75% Isopropanol, 5L)', category: 'Sanitation Supplies', dept: 'dept_housekeeping', qty: 15, min: 10, unit: 'cans', exp: '2027-09-30', status: 'optimal' },
  ];

  for (const c of localizedConsumables) {
    db.run(
      `INSERT INTO consumables (id, item_code, name, category, department_id, quantity_on_hand, min_stock_level, unit, expiry_date, status, last_restocked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         category=excluded.category,
         department_id=excluded.department_id,
         quantity_on_hand=excluded.quantity_on_hand,
         min_stock_level=excluded.min_stock_level,
         unit=excluded.unit,
         expiry_date=excluded.expiry_date,
         status=excluded.status`,
      [c.id, c.code, c.name, c.category, c.dept, c.qty, c.min, c.unit, c.exp, c.status, new Date().toISOString()]
    );
  }

  // 9. Rooms & Diagnostic Slots (Dermatology consultation rooms and Radiology imaging suites)
  const localizedRooms = [
    { id: 'room_derm_01', number: 'OPD-102', name: 'Dermatology Consultation Clinic 1', dept: 'dept_derm', type: 'Consultation Room', eq: 'eq_ts_derm_derm', staff: 'staff_doc_sindhu', status: 'open', slot: 'Morning OPD: Dr. Sindhu Ravikanti' },
    { id: 'room_derm_02', number: 'PROC-103', name: 'Dermatology Minor Procedure & Biopsy Suite', dept: 'dept_derm', type: 'Procedure Room', eq: 'eq_ts_derm_photo', staff: 'staff_doc_sindhu', status: 'open', slot: 'Procedure & Phototherapy Session Slot' },
    { id: 'room_rad_ct', number: 'RAD-G01', name: 'Computed Tomography (CT) Scan Suite', dept: 'dept_radio', type: 'Imaging Suite', eq: 'eq_ts_ct', staff: 'staff_doc_murali', status: 'occupied', slot: 'Head CT Angio in Progress (P. Ramesh Kumar, Tech)' },
    { id: 'room_rad_xr', number: 'RAD-G02', name: 'Digital Radiography (X-Ray) Room 1', dept: 'dept_radio', type: 'Imaging Suite', eq: 'eq_ts_xray', staff: 'staff_tech_ramesh', status: 'open', slot: 'Chest & Skeletal X-Ray Queue Active' },
    { id: 'room_rad_usg', number: 'RAD-G03', name: 'Ultrasound & Doppler Sonography Bay', dept: 'dept_radio', type: 'Imaging Suite', eq: 'eq_ts_usg', staff: 'staff_doc_murali', status: 'open', slot: 'Abdominal USG Slot Slot: 11:30 IST' },
    { id: 'room_cas_triage', number: 'CAS-TR1', name: 'Casualty Emergency Triage & Resuscitation Bay', dept: 'dept_casualty', type: 'Triage Bay', eq: 'eq_ts_defib_cas', staff: 'staff_doc_ananya', status: 'occupied', slot: 'Acute Inflow Resuscitation' },
  ];

  for (const r of localizedRooms) {
    db.run(
      `INSERT INTO rooms_and_slots (id, room_number, name, department_id, room_type, equipment_id, assigned_staff_id, status, current_slot_info, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         department_id=excluded.department_id,
         room_type=excluded.room_type,
         equipment_id=excluded.equipment_id,
         assigned_staff_id=excluded.assigned_staff_id,
         status=excluded.status,
         current_slot_info=excluded.current_slot_info`,
      [r.id, r.number, r.name, r.dept, r.type, r.eq, r.staff, r.status, r.slot, new Date().toISOString()]
    );
  }

  // 10. Initial Explainable Recommendations (Localized)
  const localizedRecs = [
    {
      id: 'rec_ts_001',
      code: 'REC-TS-CAS-SURGE',
      dept: 'dept_casualty',
      type: 'surge_mitigation',
      title: 'Casualty & Emergency Intake Protocol Activation',
      currentSituation: 'Emergency & Casualty bed occupancy is at 80.0% (16/20 beds). Hourly intake model predicts 14 acute presentations over next 12 hours.',
      proposedAction: 'Deploy on-call emergency nurse Bhanu Prakash (BSc Nursing) and expedite turnaround of 2 observation beds to General Medicine Ward.',
      reasons: [
        'Casualty intake forecast exceeds hospital surge limit (80%) during afternoon transit peak.',
        'Dr. Ananya Reddy and S. Lakshmi Bai, RN are currently operating near peak capacity.',
        'Candidate on-call nurse Bhanu Prakash is available with ACLS trauma certifications.'
      ],
      supportingData: {
        currentOccupancyPct: 80.0,
        predictedAdmissions12h: 14,
        availableBeds: 2,
        recommendedStaffId: 'staff_nurse_bhanu',
        staffName: 'Bhanu Prakash, BSc Nursing'
      },
      horizon: 12,
      status: 'pending',
      priority: 'critical'
    },
    {
      id: 'rec_ts_002',
      code: 'REC-TS-CON-GLV',
      dept: 'dept_pharmacy',
      type: 'consumable_reorder',
      title: 'Replenish Sterile Surgical Gloves Reserve',
      currentSituation: 'Central stores stock for Sterile Surgical Gloves is at 120 pairs (configured minimum safety reserve is 250 pairs).',
      proposedAction: 'Issue internal purchase indent for 500 pairs of Sterile Surgical Gloves from verified state empanelled vendor.',
      reasons: [
        'Stock on hand (120 pairs) has fallen below minimum buffer threshold (250 pairs).',
        'Projected daily consumption across Surgery, ICU, and Casualty is 75 pairs/day.'
      ],
      supportingData: {
        itemId: 'con_gloves',
        currentQuantity: 120,
        minThreshold: 250,
        recommendedIndentQty: 500
      },
      horizon: 24,
      status: 'pending',
      priority: 'high'
    },
    {
      id: 'rec_ts_003',
      code: 'REC-TS-RAD-SCHED',
      dept: 'dept_radio',
      type: 'doctor_allocation',
      title: 'Radiology Imaging Slot Coordination (Dr. Ravikanti Murali)',
      currentSituation: 'Computed Tomography (CT) queue has 6 inpatient scans scheduled during Dr. Ravikanti Murali’s reporting shift.',
      proposedAction: 'Assign Senior Radiographer P. Ramesh Kumar to CT Suite console to streamline contrast protocol scans.',
      reasons: [
        'Dr. Ravikanti Murali’s diagnostic read queue is at 50% capacity with 6 scheduled procedure slots.',
        'P. Ramesh Kumar has active AERB radiation safety certifications and is available on duty.'
      ],
      supportingData: {
        doctorId: 'staff_doc_murali',
        technicianId: 'staff_tech_ramesh',
        queueLength: 6
      },
      horizon: 8,
      status: 'pending',
      priority: 'medium'
    }
  ];

  for (const r of localizedRecs) {
    db.run(
      `INSERT INTO recommendations (
         id, rec_code, department_id, resource_type, title, current_situation,
         proposed_action, reasons, supporting_data, forecast_horizon_hours, status, priority, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title,
         current_situation=excluded.current_situation,
         proposed_action=excluded.proposed_action,
         reasons=excluded.reasons,
         supporting_data=excluded.supporting_data,
         status=excluded.status`,
      [
        r.id, r.code, r.dept, r.type, r.title, r.currentSituation, r.proposedAction,
        JSON.stringify(r.reasons), JSON.stringify(r.supportingData), r.horizon, r.status, r.priority, new Date().toISOString()
      ]
    );
  }

  // 11. Initial Alerts
  const initialAlerts = [
    {
      id: 'alt_ts_001',
      code: 'ALT-TS-CAS-SURGE',
      sev: 'critical',
      title: 'Casualty & Emergency Surge Alert',
      dept: 'dept_casualty',
      desc: 'Projected acute presentations over the next 12 hours risk breaching 85% casualty bed capacity.',
      dedup: 'dedup_ts_casualty_surge'
    },
    {
      id: 'alt_ts_002',
      code: 'ALT-TS-CON-GLV',
      sev: 'warning',
      title: 'Low Stock: Sterile Surgical Gloves',
      dept: 'dept_pharmacy',
      desc: 'Central stores inventory is at 120 pairs (reorder threshold is 250 pairs).',
      dedup: 'dedup_ts_gloves_low'
    },
    {
      id: 'alt_ts_003',
      code: 'ALT-TS-ICU-VENT',
      sev: 'warning',
      title: 'ICU Ventilator Margin Advisory',
      dept: 'dept_icu',
      desc: 'High-acuity invasive mechanical ventilators available reserve is at 2 units.',
      dedup: 'dedup_ts_icu_vent'
    }
  ];

  for (const a of initialAlerts) {
    db.run(
      `INSERT INTO alerts (id, alert_code, severity, title, department_id, description, status, deduplication_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title,
         description=excluded.description,
         severity=excluded.severity`,
      [a.id, a.code, a.sev, a.title, a.dept, a.desc, 'active', a.dedup, new Date().toISOString()]
    );
  }

  // 12. Audit Log
  db.run(
    `INSERT OR IGNORE INTO audit_logs (id, user_id, user_email, action, entity_type, entity_id, details, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'log_ts_migration_v2',
      'system',
      'superintendent@aihro.telangana.gov.in',
      'MIGRATE_TELANGANA_SCHEMA',
      'SYSTEM',
      'telangana_hospital_core',
      JSON.stringify({
        status: 'Idempotent migration v2 applied: Telangana hospital profile, Dr. Sindhu Ravikanti, Dr. Ravikanti Murali, consumables, rooms, and localized departments active.'
      }),
      new Date().toISOString()
    ]
  );
}

/**
 * Clean re-seed function for testing and demonstration reset
 */
export async function resetDemoDatabase(): Promise<void> {
  const db = await getDb();
  db.run(`
    DELETE FROM recommendations;
    DELETE FROM approvals;
    DELETE FROM alerts;
    DELETE FROM consumables;
    DELETE FROM rooms_and_slots;
  `);
  runMigrations(db);
  saveDb();
}
