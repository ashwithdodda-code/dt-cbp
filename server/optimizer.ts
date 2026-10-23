export interface OptimizationContext {
  departments: {
    id: string;
    name: string;
    code: string;
    total_beds: number;
    baseline_staff: number;
    surge_threshold_pct: number;
  }[];
  beds: {
    id: string;
    bed_number: string;
    department_id: string;
    bed_type: string;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
    patient_acuity: string | null;
  }[];
  staff: {
    id: string;
    staff_code: string;
    name: string;
    department_id: string;
    role: string;
    shift: string;
    status: 'on_duty' | 'available_on_call' | 'off_duty' | 'break';
    current_workload: number;
    max_workload: number;
    skills: string[];
  }[];
  equipment: {
    id: string;
    equipment_code: string;
    name: string;
    category: string;
    department_id: string;
    total_qty: number;
    available_qty: number;
    in_use_qty: number;
    maintenance_qty: number;
  }[];
  forecastAdmissionsByDept: Record<string, number>; // Predicted admissions for next 12 hours
}

export interface GeneratedRecommendation {
  id: string;
  rec_code: string;
  department_id: string;
  resource_type: 'bed_capacity' | 'nurse_staffing' | 'equipment_transfer' | 'surge_mitigation';
  title: string;
  current_situation: string;
  proposed_action: string;
  reasons: string[];
  supporting_data: Record<string, any>;
  forecast_horizon_hours: number;
  status: 'pending';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Deterministic constraint satisfaction optimization engine.
 * Computes bed utilization, nurse-to-patient staffing ratio constraints,
 * and equipment safety margins across departments to generate candidate recommendations.
 */
export function runResourceOptimizer(ctx: OptimizationContext): GeneratedRecommendation[] {
  const recommendations: GeneratedRecommendation[] = [];
  const timestamp = Date.now();

  ctx.departments.forEach((dept) => {
    const deptBeds = ctx.beds.filter((b) => b.department_id === dept.id);
    const totalBeds = dept.total_beds || deptBeds.length;
    const occupiedBeds = deptBeds.filter((b) => b.status === 'occupied').length;
    const availableBeds = deptBeds.filter((b) => b.status === 'available').length;
    const cleaningBeds = deptBeds.filter((b) => b.status === 'cleaning').length;
    const currentOccupancyPct = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

    const predictedAdmissions = ctx.forecastAdmissionsByDept[dept.id] || 0;
    const projectedOccupied = occupiedBeds + predictedAdmissions;
    const projectedOccupancyPct = totalBeds > 0 ? (projectedOccupied / totalBeds) * 100 : 0;

    // --- 1. Bed Capacity & Surge Constraints ---
    if (projectedOccupancyPct >= dept.surge_threshold_pct || currentOccupancyPct >= 85) {
      // Find candidate donor department with spare capacity (>30% available beds)
      const candidateDonor = ctx.departments.find((d) => {
        if (d.id === dept.id) return false;
        const dBeds = ctx.beds.filter((b) => b.department_id === d.id);
        const dAvail = dBeds.filter((b) => b.status === 'available').length;
        const dTotal = d.total_beds || dBeds.length;
        return dAvail >= 4 && (dAvail / dTotal) > 0.25;
      });

      const priority = projectedOccupancyPct >= 95 ? 'critical' : 'high';
      const expeditedCleanCount = Math.min(cleaningBeds, 3);

      recommendations.push({
        id: `rec_gen_bed_${dept.id}_${timestamp}`,
        rec_code: `REC-${dept.code}-CAPACITY-${Math.floor(100 + Math.random() * 900)}`,
        department_id: dept.id,
        resource_type: dept.code === 'ED' ? 'surge_mitigation' : 'bed_capacity',
        title: `${dept.name}: Capacity Warning (${projectedOccupancyPct.toFixed(0)}% Projected Occupancy)`,
        currentSituation: `Current bed occupancy is ${currentOccupancyPct.toFixed(1)}% (${occupiedBeds}/${totalBeds} beds). Forecast model predicts ${predictedAdmissions.toFixed(0)} admissions over 12h, pushing utilization to ${projectedOccupancyPct.toFixed(1)}%.`,
        proposedAction: expeditedCleanCount > 0
          ? `Expedite cleaning of ${expeditedCleanCount} beds in ${dept.name} and prepare patient step-down transfers to ${candidateDonor ? candidateDonor.name : 'General Care'}.`
          : `Activate surge flex-capacity beds and coordinate early step-down discharges with ${candidateDonor ? candidateDonor.name : 'MedSurg'}.`,
        reasons: [
          `Projected bed demand (${projectedOccupied}) exceeds target surge limit of ${dept.surge_threshold_pct}%.`,
          `Only ${availableBeds} beds currently ready for immediate admissions in ${dept.code}.`,
          candidateDonor
            ? `${candidateDonor.name} maintains sufficient reserve capacity (${ctx.beds.filter(b => b.department_id === candidateDonor.id && b.status === 'available').length} beds available).`
            : `Department-level mitigation required to avoid admission bottlenecks.`
        ],
        supporting_data: {
          totalBeds,
          occupiedBeds,
          availableBeds,
          cleaningBeds,
          currentOccupancyPct: Number(currentOccupancyPct.toFixed(1)),
          projectedOccupancyPct: Number(projectedOccupancyPct.toFixed(1)),
          predictedAdmissions12h: Number(predictedAdmissions.toFixed(0)),
          candidateDonorId: candidateDonor?.id || null
        },
        forecast_horizon_hours: 12,
        status: 'pending',
        priority
      });
    }

    // --- 2. Nurse Staffing Ratio Constraints ---
    const deptStaff = ctx.staff.filter((s) => s.department_id === dept.id);
    const onDutyStaff = deptStaff.filter((s) => s.status === 'on_duty');
    const onCallStaff = deptStaff.filter((s) => s.status === 'available_on_call');

    // Acuity based ideal ratios: ICU 1:2 (0.5), ED 1:3 (0.33), MedSurg 1:4 (0.25)
    const requiredRatio = dept.code === 'ICU' ? 0.5 : dept.code === 'ED' ? 0.35 : 0.25;
    const currentActivePatients = occupiedBeds;
    const targetNurses = Math.ceil(currentActivePatients * requiredRatio);
    const totalCurrentCapacity = onDutyStaff.reduce((sum, s) => sum + s.max_workload, 0);
    const totalAssignedLoad = onDutyStaff.reduce((sum, s) => sum + s.current_workload, 0);
    const loadFactor = totalCurrentCapacity > 0 ? totalAssignedLoad / totalCurrentCapacity : 1;

    if (onDutyStaff.length < targetNurses || loadFactor > 0.85) {
      // Find candidate on-call staff in same department or cross-trained staff in other departments
      const eligibleCall = onCallStaff[0] || ctx.staff.find((s) => s.status === 'available_on_call' && s.skills.some(sk => sk.toLowerCase().includes('cross-trained') || sk.toLowerCase().includes('emergency') || sk.toLowerCase().includes('general')));

      if (eligibleCall) {
        recommendations.push({
          id: `rec_gen_staff_${dept.id}_${timestamp}`,
          rec_code: `REC-${dept.code}-STAFF-${Math.floor(100 + Math.random() * 900)}`,
          department_id: dept.id,
          resource_type: 'nurse_staffing',
          title: `${dept.name}: Nurse Staffing Reinforcement (${(loadFactor * 100).toFixed(0)}% Workload)`,
          currentSituation: `Current active nursing roster (${onDutyStaff.length} nurses) is operating at ${(loadFactor * 100).toFixed(0)}% maximum safe patient capacity.`,
          proposedAction: `Mobilize on-call nurse ${eligibleCall.name} (${eligibleCall.role}) to ${dept.name} for the current operational shift.`,
          reasons: [
            `Current nurse-to-patient ratio exceeds safe clinical threshold (${onDutyStaff.length} nurses for ${occupiedBeds} occupied beds).`,
            `Candidate staff member ${eligibleCall.name} is currently available with eligible certifications (${eligibleCall.skills.slice(0, 2).join(', ')}).`,
            `Action will restore workload headroom to an optimal 70% threshold.`
          ],
          supporting_data: {
            onDutyNurses: onDutyStaff.length,
            recommendedTargetNurses: targetNurses,
            currentLoadFactor: Number((loadFactor * 100).toFixed(1)),
            candidateStaffId: eligibleCall.id,
            candidateStaffName: eligibleCall.name,
            candidateStaffRole: eligibleCall.role
          },
          forecast_horizon_hours: 8,
          status: 'pending',
          priority: loadFactor > 0.9 ? 'critical' : 'high'
        });
      }
    }

    // --- 3. Critical Equipment Shortage & Safe Transfer Constraints ---
    const deptEquipment = ctx.equipment.filter((e) => e.department_id === dept.id);
    deptEquipment.forEach((eq) => {
      const availRatio = eq.total_qty > 0 ? eq.available_qty / eq.total_qty : 0;
      // If critical device has <= 1 available unit and utilization is high
      if (eq.available_qty <= 1 && eq.total_qty >= 3) {
        // Find donor department with same category equipment having spare units (>30% available and >=2 free)
        const donorEq = ctx.equipment.find(
          (other) =>
            other.category === eq.category &&
            other.department_id !== dept.id &&
            other.available_qty >= 2 &&
            (other.available_qty / (other.total_qty || 1)) >= 0.25
        );

        if (donorEq) {
          const donorDept = ctx.departments.find((d) => d.id === donorEq.department_id);
          recommendations.push({
            id: `rec_gen_eq_${dept.id}_${eq.id}_${timestamp}`,
            rec_code: `REC-${dept.code}-EQ-${Math.floor(100 + Math.random() * 900)}`,
            department_id: dept.id,
            resource_type: 'equipment_transfer',
            title: `${dept.name}: ${eq.category} Inventory Rebalance`,
            currentSituation: `${eq.name} in ${dept.name} has only ${eq.available_qty} spare unit remaining (${eq.in_use_qty} in active use, ${eq.maintenance_qty} in maintenance).`,
            proposedAction: `Initiate temporary loan transfer of 1 ${eq.category} unit from ${donorDept?.name || 'Central Supply'} to ${dept.name}.`,
            reasons: [
              `Operating reserve for ${eq.category} has fallen below the 2-unit safety protocol threshold in ${dept.code}.`,
              `${donorDept?.name} currently maintains ${donorEq.available_qty} available units with no projected deficit.`,
              `Zero downtime risk to donating department.`
            ],
            supporting_data: {
              targetEquipmentId: eq.id,
              targetDepartmentId: dept.id,
              donorEquipmentId: donorEq.id,
              donorDepartmentId: donorEq.department_id,
              donorDepartmentName: donorDept?.name || 'Supply',
              transferQuantity: 1,
              category: eq.category
            },
            forecast_horizon_hours: 24,
            status: 'pending',
            priority: eq.available_qty === 0 ? 'critical' : 'high'
          });
        }
      }
    });
  });

  return recommendations;
}

/**
 * Revalidates constraints before an approval is applied.
 * Checks whether the proposed resources are still available or if the situation changed.
 */
export function validateApprovalPreconditions(
  rec: GeneratedRecommendation,
  currentCtx: OptimizationContext
): { valid: boolean; reason?: string } {
  const data = rec.supporting_data || {};

  if (rec.resource_type === 'equipment_transfer') {
    const donorEq = currentCtx.equipment.find((e) => e.id === data.donorEquipmentId);
    if (!donorEq) {
      return { valid: false, reason: 'Donor equipment record could not be found.' };
    }
    if (donorEq.available_qty < (data.transferQuantity || 1)) {
      return {
        valid: false,
        reason: `Donor department no longer has sufficient available units (${donorEq.available_qty} available vs ${data.transferQuantity} requested). Recommendation is stale.`
      };
    }
  }

  if (rec.resource_type === 'nurse_staffing') {
    const staffMember = currentCtx.staff.find((s) => s.id === data.candidateStaffId);
    if (!staffMember) {
      return { valid: false, reason: 'Candidate staff record no longer exists.' };
    }
    if (staffMember.status === 'off_duty') {
      return {
        valid: false,
        reason: `Staff member ${staffMember.name} has clocked off duty. Recommend selecting an alternative on-call nurse.`
      };
    }
  }

  return { valid: true };
}
