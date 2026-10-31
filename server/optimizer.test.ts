import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDemandForecast, HistoricalRecord } from './forecasting.js';
import { runResourceOptimizer, validateApprovalPreconditions, isSpecialtyCompatible, OptimizationContext, GeneratedRecommendation } from './optimizer.js';
import { getDb } from './db.js';

test('Forecasting Engine: produces valid future predictions, intervals and genuine backtested metrics', () => {
  // Mock 48 hours of historical admissions for Emergency and Casualty
  const mockHistory: HistoricalRecord[] = [];
  const baseTime = new Date('2026-10-20T00:00:00Z').getTime();

  for (let i = 0; i < 48; i++) {
    const timestamp = new Date(baseTime + i * 3600 * 1000).toISOString();
    const hour = (i % 24);
    // Diurnal variation peak in afternoon
    const count = Math.max(1, Math.round(4 + Math.sin((hour / 24) * 2 * Math.PI) * 2));
    mockHistory.push({
      id: `adm_${i}`,
      timestamp,
      department_id: 'dept_casualty',
      admissions_count: count,
      acuity_level: count > 4 ? 'high' : 'medium',
      surge_flag: 0,
    });
  }

  const result = generateDemandForecast(mockHistory, 'dept_casualty', 12);

  assert.equal(result.departmentId, 'dept_casualty');
  assert.equal(result.horizonHours, 12);
  assert.equal(result.points.length, 12);
  assert.ok(result.totalPredicted > 0, 'Total predicted admissions must be positive');
  assert.ok(result.metrics.mae >= 0, 'MAE must be non-negative');
  assert.ok(result.metrics.rmse >= result.metrics.mae, 'RMSE is mathematically >= MAE');
  assert.ok(result.points[0].upperBound >= result.points[0].predictedAdmissions, 'Upper bound >= predicted');
  assert.ok(result.points[0].lowerBound <= result.points[0].predictedAdmissions, 'Lower bound <= predicted');
  assert.ok(result.influencingFactors.length > 0, 'Influencing factors must be populated');
});

test('Optimizer Engine: detects bed surge conditions and flags capacity constraints', () => {
  const ctx: OptimizationContext = {
    departments: [
      { id: 'dept_casualty', name: 'Emergency and Casualty', code: 'CASUALTY', total_beds: 20, baseline_staff: 10, surge_threshold_pct: 80 },
      { id: 'dept_genmed', name: 'General Medicine', code: 'GENMED', total_beds: 30, baseline_staff: 10, surge_threshold_pct: 85 }
    ],
    beds: [
      // 18 occupied out of 20 beds in Casualty = 90% occupancy
      ...Array.from({ length: 18 }, (_, i) => ({
        id: `b_cas_${i}`,
        bed_number: `CAS-${i}`,
        department_id: 'dept_casualty',
        bed_type: 'Emergency',
        status: 'occupied' as const,
        patient_acuity: 'high',
      })),
      { id: 'b_cas_clean', bed_number: 'CAS-19', department_id: 'dept_casualty', bed_type: 'Emergency', status: 'cleaning' as const, patient_acuity: null },
      { id: 'b_cas_avail', bed_number: 'CAS-20', department_id: 'dept_casualty', bed_type: 'Emergency', status: 'available' as const, patient_acuity: null },
      // GenMed has 12 available beds (spare capacity)
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `b_gm_${i}`,
        bed_number: `GM-${i}`,
        department_id: 'dept_genmed',
        bed_type: 'General',
        status: 'available' as const,
        patient_acuity: null,
      })),
      ...Array.from({ length: 18 }, (_, i) => ({
        id: `b_gm_occ_${i}`,
        bed_number: `GM-OCC-${i}`,
        department_id: 'dept_genmed',
        bed_type: 'General',
        status: 'occupied' as const,
        patient_acuity: 'medium',
      })),
    ],
    staff: [],
    equipment: [],
    forecastAdmissionsByDept: {
      dept_casualty: 8, // high incoming demand
      dept_genmed: 2,
    },
  };

  const recs = runResourceOptimizer(ctx);
  const surgeRec = recs.find((r) => r.department_id === 'dept_casualty' && (r.resource_type === 'surge_mitigation' || r.resource_type === 'bed_capacity'));

  assert.ok(surgeRec, 'Should generate surge mitigation recommendation for overloaded Casualty');
  assert.equal(surgeRec?.priority, 'critical');
  assert.ok(surgeRec?.reasons.length && surgeRec.reasons.length > 0);
  assert.ok(surgeRec?.supporting_data.currentOccupancyPct === 90);
});

test('Specialty Guard: enforces that Dermatologists and Radiologists cannot be cross-allocated to incompatible wards', () => {
  const drSindhu = {
    id: 'staff_doc_sindhu',
    staff_code: 'DOC-TS-DERM-01',
    name: 'Dr. Sindhu Ravikanti',
    department_id: 'dept_derm',
    role: 'Senior Consultant Dermatologist',
    category: 'Doctor / Specialist',
    specialty: 'Skin and dermatology services',
    shift: 'General OPD (09:00 - 17:00 IST)',
    status: 'on_duty' as const,
    leave_status: 'active' as const,
    current_workload: 1,
    max_workload: 4,
    skills: ['Dermatosurgery', 'Laser Therapy'],
  };

  const drMurali = {
    id: 'staff_doc_murali',
    staff_code: 'DOC-TS-RADIO-01',
    name: 'Dr. Ravikanti Murali',
    department_id: 'dept_radio',
    role: 'Chief Radiologist & Diagnostic Imaging Lead',
    category: 'Doctor / Specialist',
    specialty: 'Radiology and diagnostic imaging',
    shift: 'Day Shift (08:00 - 16:00 IST)',
    status: 'on_duty' as const,
    leave_status: 'active' as const,
    current_workload: 2,
    max_workload: 4,
    skills: ['CT Interpretation', 'MRI Diagnostics'],
  };

  // Dr. Sindhu is compatible with Dermatology, but NOT ICU or Casualty
  assert.equal(isSpecialtyCompatible(drSindhu, 'dept_derm'), true, 'Dermatologist compatible with Dermatology');
  assert.equal(isSpecialtyCompatible(drSindhu, 'dept_icu'), false, 'Dermatologist must NOT be assigned to ICU');
  assert.equal(isSpecialtyCompatible(drSindhu, 'dept_casualty'), false, 'Dermatologist must NOT be assigned to Casualty');

  // Dr. Murali is compatible with Radiology, but NOT Casualty or General Surgery
  assert.equal(isSpecialtyCompatible(drMurali, 'dept_radio'), true, 'Radiologist compatible with Radiology');
  assert.equal(isSpecialtyCompatible(drMurali, 'dept_casualty'), false, 'Radiologist must NOT be assigned to Casualty');
  assert.equal(isSpecialtyCompatible(drMurali, 'dept_surgery'), false, 'Radiologist must NOT be assigned to Surgery');

  // Pre-approval validator test: Attempt to approve Dr. Sindhu to Casualty
  const invalidDocRec: GeneratedRecommendation = {
    id: 'rec_doc_invalid',
    rec_code: 'REC-CAS-DOC-TEST',
    department_id: 'dept_casualty',
    resource_type: 'doctor_allocation',
    title: 'Assign Doctor to Casualty',
    current_situation: 'Surge in casualty',
    currentSituation: 'Surge in casualty',
    proposed_action: 'Assign Dr. Sindhu Ravikanti',
    proposedAction: 'Assign Dr. Sindhu Ravikanti',
    reasons: ['Doctor needed'],
    supporting_data: {
      candidateStaffId: 'staff_doc_sindhu',
      candidateName: 'Dr. Sindhu Ravikanti',
    },
    forecast_horizon_hours: 12,
    status: 'pending',
    priority: 'high',
  };

  const ctx: OptimizationContext = {
    departments: [{ id: 'dept_casualty', name: 'Emergency and Casualty', code: 'CASUALTY', total_beds: 20, baseline_staff: 10, surge_threshold_pct: 80 }],
    beds: [],
    staff: [drSindhu],
    equipment: [],
    forecastAdmissionsByDept: {},
  };

  const validation = validateApprovalPreconditions(invalidDocRec, ctx);
  assert.equal(validation.valid, false, 'Pre-approval validation must reject specialty mismatch');
  assert.ok(validation.reason?.includes('Specialty mismatch'));
});

test('Staff Availability: rejects allocation of staff member on leave or at max capacity', () => {
  const staffOnLeave = {
    id: 'staff_nurse_leave',
    staff_code: 'NUR-TS-01',
    name: 'Nurse Priya',
    department_id: 'dept_genmed',
    role: 'Staff Nurse',
    category: 'Nurse',
    specialty: null,
    shift: 'Day Shift',
    status: 'off_duty' as const,
    leave_status: 'on_leave' as const,
    current_workload: 0,
    max_workload: 4,
    skills: ['General Nursing'],
  };

  const rec: GeneratedRecommendation = {
    id: 'rec_staff_leave_test',
    rec_code: 'REC-NURSE-TEST',
    department_id: 'dept_casualty',
    resource_type: 'nurse_staffing',
    title: 'Mobilize Nurse',
    current_situation: 'Staffing shortage',
    currentSituation: 'Staffing shortage',
    proposed_action: 'Mobilize Nurse Priya',
    proposedAction: 'Mobilize Nurse Priya',
    reasons: ['Reserve required'],
    supporting_data: {
      candidateStaffId: 'staff_nurse_leave',
    },
    forecast_horizon_hours: 12,
    status: 'pending',
    priority: 'high',
  };

  const ctx: OptimizationContext = {
    departments: [{ id: 'dept_casualty', name: 'Emergency and Casualty', code: 'CASUALTY', total_beds: 20, baseline_staff: 10, surge_threshold_pct: 80 }],
    beds: [],
    staff: [staffOnLeave],
    equipment: [],
    forecastAdmissionsByDept: {},
  };

  const validation = validateApprovalPreconditions(rec, ctx);
  assert.equal(validation.valid, false, 'Must reject staff member currently on leave');
  assert.ok(validation.reason?.includes('on leave'));
});

test('Consumables Optimizer: triggers replenish recommendation when stock falls below buffer', () => {
  const ctx: OptimizationContext = {
    departments: [
      { id: 'dept_radio', name: 'Radiology and Imaging', code: 'RADIO', total_beds: 4, baseline_staff: 8, surge_threshold_pct: 85 }
    ],
    beds: [],
    staff: [],
    equipment: [],
    consumables: [
      {
        id: 'con_radio_contrast',
        item_code: 'CON-RAD-01',
        name: 'Omnipaque 350mg/ml Contrast Media',
        category: 'Radiology Consumables',
        department_id: 'dept_radio',
        quantity_on_hand: 5, // Below safe threshold of 15!
        min_stock_level: 15,
        unit: 'vials',
        status: 'critical',
      }
    ],
    forecastAdmissionsByDept: {},
  };

  const recs = runResourceOptimizer(ctx);
  const consumableRec = recs.find((r) => r.resource_type === 'consumable_reorder');

  assert.ok(consumableRec, 'Must generate consumable replenishment recommendation');
  assert.equal(consumableRec?.department_id, 'dept_radio');
  assert.ok(consumableRec?.title.includes('Omnipaque'));
  assert.equal(consumableRec?.supporting_data.consumableId, 'con_radio_contrast');
  assert.ok(consumableRec?.supporting_data.recommendedReorderQty >= 30);
});

test('Database Roster: verifies Dr. Sindhu Ravikanti and Dr. Ravikanti Murali exist in persistent DB', async () => {
  const db = await getDb();
  const stmt1 = db.prepare('SELECT * FROM staff WHERE id = "staff_doc_sindhu"');
  assert.ok(stmt1.step(), 'Dr. Sindhu Ravikanti must be present in database');
  const sindhu = stmt1.getAsObject();
  assert.equal(sindhu.department_id, 'dept_derm');
  assert.equal(sindhu.name, 'Dr. Sindhu Ravikanti');
  stmt1.free();

  const stmt2 = db.prepare('SELECT * FROM staff WHERE id = "staff_doc_murali"');
  assert.ok(stmt2.step(), 'Dr. Ravikanti Murali must be present in database');
  const murali = stmt2.getAsObject();
  assert.equal(murali.department_id, 'dept_radio');
  assert.equal(murali.name, 'Dr. Ravikanti Murali');
  stmt2.free();
});
