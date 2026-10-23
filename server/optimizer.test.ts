import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDemandForecast, HistoricalRecord } from './forecasting.js';
import { runResourceOptimizer, validateApprovalPreconditions, OptimizationContext, GeneratedRecommendation } from './optimizer.js';

test('Forecasting Engine: produces valid future predictions, intervals and genuine backtested metrics', () => {
  // Mock 36 hours of historical admissions for Emergency Department
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
      department_id: 'dept_ed',
      admissions_count: count,
      acuity_level: count > 4 ? 'high' : 'medium',
      surge_flag: 0,
    });
  }

  const result = generateDemandForecast(mockHistory, 'dept_ed', 12);

  assert.equal(result.departmentId, 'dept_ed');
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
      { id: 'dept_ed', name: 'Emergency Medicine', code: 'ED', total_beds: 20, baseline_staff: 10, surge_threshold_pct: 80 },
      { id: 'dept_medsurg', name: 'General MedSurg', code: 'MEDSURG', total_beds: 30, baseline_staff: 10, surge_threshold_pct: 85 }
    ],
    beds: [
      // 18 occupied out of 20 beds in ED = 90% occupancy
      ...Array.from({ length: 18 }, (_, i) => ({
        id: `b_ed_${i}`,
        bed_number: `ED-${i}`,
        department_id: 'dept_ed',
        bed_type: 'Emergency',
        status: 'occupied' as const,
        patient_acuity: 'high',
      })),
      { id: 'b_ed_clean', bed_number: 'ED-19', department_id: 'dept_ed', bed_type: 'Emergency', status: 'cleaning' as const, patient_acuity: null },
      { id: 'b_ed_avail', bed_number: 'ED-20', department_id: 'dept_ed', bed_type: 'Emergency', status: 'available' as const, patient_acuity: null },
      // MedSurg has 12 available beds (spare donor capacity)
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `b_ms_${i}`,
        bed_number: `MS-${i}`,
        department_id: 'dept_medsurg',
        bed_type: 'General',
        status: 'available' as const,
        patient_acuity: null,
      })),
      ...Array.from({ length: 18 }, (_, i) => ({
        id: `b_ms_occ_${i}`,
        bed_number: `MS-OCC-${i}`,
        department_id: 'dept_medsurg',
        bed_type: 'General',
        status: 'occupied' as const,
        patient_acuity: 'medium',
      })),
    ],
    staff: [],
    equipment: [],
    forecastAdmissionsByDept: {
      dept_ed: 8, // high incoming demand
      dept_medsurg: 2,
    },
  };

  const recs = runResourceOptimizer(ctx);
  const surgeRec = recs.find((r) => r.department_id === 'dept_ed' && (r.resource_type === 'surge_mitigation' || r.resource_type === 'bed_capacity'));

  assert.ok(surgeRec, 'Should generate surge mitigation recommendation for overloaded ED');
  assert.equal(surgeRec?.priority, 'critical');
  assert.ok(surgeRec?.reasons.length && surgeRec.reasons.length > 0);
  assert.ok(surgeRec?.supporting_data.currentOccupancyPct === 90);
});

test('Optimizer Engine: checks equipment safety margins and generates safe transfer proposal', () => {
  const ctx: OptimizationContext = {
    departments: [
      { id: 'dept_icu', name: 'ICU', code: 'ICU', total_beds: 10, baseline_staff: 8, surge_threshold_pct: 85 },
      { id: 'dept_medsurg', name: 'MedSurg', code: 'MEDSURG', total_beds: 20, baseline_staff: 8, surge_threshold_pct: 85 },
    ],
    beds: [],
    staff: [],
    equipment: [
      // ICU ventilator shortage: only 1 available
      {
        id: 'eq_vent_icu',
        equipment_code: 'EQ-VENT-01',
        name: 'Mechanical Ventilator',
        category: 'Ventilator',
        department_id: 'dept_icu',
        total_qty: 6,
        available_qty: 1,
        in_use_qty: 5,
        maintenance_qty: 0,
      },
      // MedSurg has surplus ventilators
      {
        id: 'eq_vent_ms',
        equipment_code: 'EQ-VENT-02',
        name: 'Mechanical Ventilator',
        category: 'Ventilator',
        department_id: 'dept_medsurg',
        total_qty: 6,
        available_qty: 4,
        in_use_qty: 2,
        maintenance_qty: 0,
      },
    ],
    forecastAdmissionsByDept: {},
  };

  const recs = runResourceOptimizer(ctx);
  const eqRec = recs.find((r) => r.resource_type === 'equipment_transfer');

  assert.ok(eqRec, 'Should generate equipment transfer recommendation');
  assert.equal(eqRec?.supporting_data.category, 'Ventilator');
  assert.equal(eqRec?.supporting_data.donorDepartmentId, 'dept_medsurg');
  assert.equal(eqRec?.supporting_data.transferQuantity, 1);
});

test('Approval Validation: prevents stale approval if donor equipment was depleted', () => {
  const candidateRec: GeneratedRecommendation = {
    id: 'rec_test_1',
    rec_code: 'REC-TEST-EQ',
    department_id: 'dept_icu',
    resource_type: 'equipment_transfer',
    title: 'Transfer Ventilator',
    current_situation: 'Ventilator shortage',
    proposed_action: 'Transfer 1 unit',
    reasons: ['Reserve below threshold'],
    supporting_data: {
      donorEquipmentId: 'eq_donor_1',
      transferQuantity: 2,
    },
    forecast_horizon_hours: 24,
    status: 'pending',
    priority: 'high',
  };

  // State where donor only has 1 unit available now (less than requested 2)
  const staleCtx: OptimizationContext = {
    departments: [],
    beds: [],
    staff: [],
    equipment: [
      {
        id: 'eq_donor_1',
        equipment_code: 'EQ-1',
        name: 'Ventilator',
        category: 'Ventilator',
        department_id: 'dept_medsurg',
        total_qty: 5,
        available_qty: 1, // only 1 available!
        in_use_qty: 4,
        maintenance_qty: 0,
      },
    ],
    forecastAdmissionsByDept: {},
  };

  const validation = validateApprovalPreconditions(candidateRec, staleCtx);
  assert.equal(validation.valid, false, 'Should fail validation due to insufficient available units');
  assert.ok(validation.reason?.includes('stale'));
});
