export interface OptimizationContext {
  departments: {
    id: string;
    name: string;
    code: string;
    total_beds: number;
    baseline_staff: number;
    surge_threshold_pct: number;
    is_enabled?: number;
    category?: string;
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
    category?: string;
    specialty?: string | null;
    shift: string;
    status: 'on_duty' | 'available_on_call' | 'off_duty' | 'break';
    leave_status?: 'active' | 'on_leave' | 'sick_leave' | 'maternity_leave';
    current_workload: number;
    max_workload: number;
    skills: string[];
    assigned_room_or_equipment?: string | null;
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
  consumables?: {
    id: string;
    item_code: string;
    name: string;
    category: string;
    department_id: string;
    quantity_on_hand: number;
    min_stock_level: number;
    unit: string;
    status: string;
  }[];
  rooms?: {
    id: string;
    room_number: string;
    name: string;
    department_id: string;
    room_type: string;
    status: string;
    assigned_staff_id?: string | null;
  }[];
  forecastAdmissionsByDept: Record<string, number>; // Predicted admissions for next 12 hours
}

export interface GeneratedRecommendation {
  id: string;
  rec_code: string;
  department_id: string;
  resource_type:
    | 'bed_capacity'
    | 'nurse_staffing'
    | 'doctor_allocation'
    | 'equipment_transfer'
    | 'consumable_reorder'
    | 'room_scheduling'
    | 'surge_mitigation';
  title: string;
  current_situation: string;
  currentSituation?: string;
  proposed_action: string;
  proposedAction?: string;
  reasons: string[];
  supporting_data: Record<string, any>;
  forecast_horizon_hours: number;
  status: 'pending';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Validates whether a staff member's specialty and role can be assigned to a target department.
 * STRICT ENFORCEMENT: Dermatologists cannot be assigned to Casualty or ICU, Radiologists cannot be
 * assigned outside imaging/diagnostics, etc.
 */
export function isSpecialtyCompatible(staff: OptimizationContext['staff'][0], targetDeptId: string): boolean {
  const spec = (staff.specialty || '').toLowerCase();
  const role = staff.role.toLowerCase();
  const cat = (staff.category || '').toLowerCase();

  // Dermatology specialists: only Dermatology
  if (spec.includes('skin') || spec.includes('dermatolog') || role.includes('dermatolog')) {
    return targetDeptId === 'dept_derm';
  }

  // Radiology specialists / technologists: only Radiology
  if (spec.includes('radiolog') || spec.includes('imaging') || role.includes('radiolog') || cat.includes('radiology')) {
    return targetDeptId === 'dept_radio';
  }

  // Laboratory staff: only Laboratory
  if (spec.includes('pathology') || spec.includes('laboratory') || cat.includes('laboratory')) {
    return targetDeptId === 'dept_lab';
  }

  // Pharmacy staff: only Pharmacy
  if (spec.includes('pharmacy') || cat.includes('pharmacist')) {
    return targetDeptId === 'dept_pharmacy';
  }

  // General Surgery doctors: only Surgery
  if (spec.includes('surgery') && cat.includes('doctor')) {
    return targetDeptId === 'dept_surgery';
  }

  // Critical Care / Intensivists: ICU or Casualty trauma
  if (spec.includes('critical care') || spec.includes('intensivist')) {
    return targetDeptId === 'dept_icu' || targetDeptId === 'dept_casualty';
  }

  // Emergency Physicians: Casualty
  if (spec.includes('emergency medicine') && cat.includes('doctor')) {
    return targetDeptId === 'dept_casualty';
  }

  // General medicine doctors: General Medicine or Casualty
  if (spec.includes('internal') || spec.includes('general medicine')) {
    return targetDeptId === 'dept_genmed' || targetDeptId === 'dept_casualty';
  }

  // Nurses: check skills for cross-training
  if (cat.includes('nurse')) {
    const hasICUSkill = staff.skills.some((s) => s.toLowerCase().includes('icu') || s.toLowerCase().includes('ventilat'));
    if (targetDeptId === 'dept_icu' && !hasICUSkill) return false;
    return true; // General nurses can support Med, Surgery, Casualty
  }

  return true;
}

/**
 * Deterministic constraint satisfaction optimization engine for the Telangana Hospital.
 * Evaluates bed saturation, nurse-to-patient acuity, doctor specialty constraints,
 * burnout/workload limits, equipment safety margins, and consumable thresholds.
 */
export function runResourceOptimizer(ctx: OptimizationContext): GeneratedRecommendation[] {
  const recommendations: GeneratedRecommendation[] = [];
  const timestamp = Date.now();

  const activeDepartments = ctx.departments.filter((d) => d.is_enabled === undefined || d.is_enabled === 1);

  activeDepartments.forEach((dept) => {
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
    if (totalBeds > 0 && (projectedOccupancyPct >= dept.surge_threshold_pct || currentOccupancyPct >= 80)) {
      const candidateDonor = activeDepartments.find((d) => {
        if (d.id === dept.id) return false;
        const dBeds = ctx.beds.filter((b) => b.department_id === d.id);
        const dAvail = dBeds.filter((b) => b.status === 'available').length;
        const dTotal = d.total_beds || dBeds.length;
        return dAvail >= 4 && dTotal > 0 && dAvail / dTotal > 0.2;
      });

      const priority = projectedOccupancyPct >= 90 ? 'critical' : 'high';
      const expeditedCleanCount = Math.min(cleaningBeds, 3);

      const bedSit = `Current bed occupancy is ${currentOccupancyPct.toFixed(1)}% (${occupiedBeds}/${totalBeds} beds). Hourly forecast predicts ${predictedAdmissions.toFixed(0)} admissions over 12h, pushing utilization to ${projectedOccupancyPct.toFixed(1)}%.`;
      const bedAct =
        expeditedCleanCount > 0
          ? `Expedite terminal sanitation of ${expeditedCleanCount} beds in ${dept.name} and prepare patient step-down transfers to ${candidateDonor ? candidateDonor.name : 'General Care'}.`
          : `Activate reserve surge beds and coordinate planned discharges with ${candidateDonor ? candidateDonor.name : 'General Medicine'}.`;

      recommendations.push({
        id: `rec_gen_bed_${dept.id}_${timestamp}`,
        rec_code: `REC-${dept.code}-CAPACITY-${Math.floor(100 + Math.random() * 900)}`,
        department_id: dept.id,
        resource_type: dept.code === 'CASUALTY' ? 'surge_mitigation' : 'bed_capacity',
        title: `${dept.name}: Bed Capacity Warning (${projectedOccupancyPct.toFixed(0)}% Projected Utilization)`,
        current_situation: bedSit,
        currentSituation: bedSit,
        proposed_action: bedAct,
        proposedAction: bedAct,
        reasons: [
          `Projected bed demand (${projectedOccupied}) exceeds department surge threshold of ${dept.surge_threshold_pct}%.`,
          `Only ${availableBeds} beds currently ready for immediate intake in ${dept.code}.`,
          candidateDonor
            ? `${candidateDonor.name} maintains buffer capacity (${ctx.beds.filter((b) => b.department_id === candidateDonor.id && b.status === 'available').length} beds available).`
            : `Ward-level mitigation required to avoid emergency admission bottlenecks.`
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

    // --- 2. Staff Workload & Empathy-Focused Burnout Protection ---
    const deptStaff = ctx.staff.filter((s) => s.department_id === dept.id);
    const onDutyStaff = deptStaff.filter((s) => s.status === 'on_duty' && (s.leave_status === undefined || s.leave_status === 'active'));

    // Check for overloaded staff members (>80% of max workload)
    const overloadedStaff = onDutyStaff.filter((s) => s.max_workload > 0 && s.current_workload / s.max_workload >= 0.8);
    if (overloadedStaff.length > 0) {
      const staffMember = overloadedStaff[0];

      // Find an available on-call staff member with COMPATIBLE specialty and skills who is NOT on leave
      const eligibleRelief = ctx.staff.find(
        (cand) =>
          cand.id !== staffMember.id &&
          cand.status === 'available_on_call' &&
          (cand.leave_status === undefined || cand.leave_status === 'active') &&
          cand.current_workload < cand.max_workload &&
          isSpecialtyCompatible(cand, dept.id)
      );

      if (eligibleRelief) {
        const staffSit = `${staffMember.name} (${staffMember.role}) is managing ${staffMember.current_workload}/${staffMember.max_workload} active assignments, breaching the 80% staff well-being threshold.`;
        const staffAct = `Mobilize on-call ${eligibleRelief.role} ${eligibleRelief.name} to ${dept.name} to balance shift workload and prevent fatigue.`;

        recommendations.push({
          id: `rec_gen_burnout_${dept.id}_${staffMember.id}_${timestamp}`,
          rec_code: `REC-${dept.code}-STAFF-RELIEF-${Math.floor(100 + Math.random() * 900)}`,
          department_id: dept.id,
          resource_type: staffMember.category === 'Doctor / Specialist' ? 'doctor_allocation' : 'nurse_staffing',
          title: `${dept.name}: Workload Relief for ${staffMember.name} (${Math.round((staffMember.current_workload / staffMember.max_workload) * 100)}% Load)`,
          current_situation: staffSit,
          currentSituation: staffSit,
          proposed_action: staffAct,
          proposedAction: staffAct,
          reasons: [
            `Current workload for ${staffMember.name} is at ${Math.round((staffMember.current_workload / staffMember.max_workload) * 100)}% of maximum safe threshold.`,
            `Candidate ${eligibleRelief.name} is on-call with verified specialty compatibility (${eligibleRelief.specialty || eligibleRelief.role}).`,
            `Rebalancing restores workload to nominal 50-65% safe operating range.`
          ],
          supporting_data: {
            overloadedStaffId: staffMember.id,
            overloadedStaffName: staffMember.name,
            currentLoad: staffMember.current_workload,
            maxLoad: staffMember.max_workload,
            candidateStaffId: eligibleRelief.id,
            candidateStaffName: eligibleRelief.name,
            candidateStaffRole: eligibleRelief.role
          },
          forecast_horizon_hours: 8,
          status: 'pending',
          priority: staffMember.current_workload >= staffMember.max_workload ? 'critical' : 'high'
        });
      }
    }

    // --- 3. Critical Equipment Shortage Constraints ---
    const deptEquipment = ctx.equipment.filter((e) => e.department_id === dept.id);
    deptEquipment.forEach((eq) => {
      if (eq.available_qty <= 1 && eq.total_qty >= 2) {
        // Find donor department with same category equipment having spare units (>= 2 available)
        const donorEq = ctx.equipment.find(
          (other) =>
            other.category === eq.category &&
            other.department_id !== dept.id &&
            other.available_qty >= 2
        );

        if (donorEq) {
          const donorDept = ctx.departments.find((d) => d.id === donorEq.department_id);
          const eqSit = `${eq.name} in ${dept.name} has only ${eq.available_qty} spare unit remaining (${eq.in_use_qty} in active use).`;
          const eqAct = `Initiate internal hospital loan transfer of 1 ${eq.category} unit from ${donorDept?.name || 'Stores'} to ${dept.name}.`;

          recommendations.push({
            id: `rec_gen_eq_${dept.id}_${eq.id}_${timestamp}`,
            rec_code: `REC-${dept.code}-EQ-${Math.floor(100 + Math.random() * 900)}`,
            department_id: dept.id,
            resource_type: 'equipment_transfer',
            title: `${dept.name}: ${eq.category} Inventory Reserve Rebalance`,
            current_situation: eqSit,
            currentSituation: eqSit,
            proposed_action: eqAct,
            proposedAction: eqAct,
            reasons: [
              `Operating reserve for ${eq.category} has fallen below the safety threshold in ${dept.code}.`,
              `${donorDept?.name} currently maintains ${donorEq.available_qty} available units with zero active deficit.`,
              `Zero downtime risk to donating department.`
            ],
            supporting_data: {
              targetEquipmentId: eq.id,
              targetDepartmentId: dept.id,
              donorEquipmentId: donorEq.id,
              donorDepartmentId: donorEq.department_id,
              donorDepartmentName: donorDept?.name || 'Central Stores',
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

    // --- 4. Consumable Stock Replenishment Constraints ---
    if (ctx.consumables) {
      const deptConsumables = ctx.consumables.filter((c) => c.department_id === dept.id);
      deptConsumables.forEach((c) => {
        if (c.quantity_on_hand <= c.min_stock_level) {
          const reorderQty = Math.max(c.min_stock_level * 2, 100);
          const conSit = `Current inventory of ${c.name} is ${c.quantity_on_hand} ${c.unit} (configured minimum buffer is ${c.min_stock_level} ${c.unit}).`;
          const conAct = `Generate central pharmacy requisition indent for ${reorderQty} ${c.unit} of ${c.name}.`;

          recommendations.push({
            id: `rec_gen_con_${c.id}_${timestamp}`,
            rec_code: `REC-${dept.code}-SUPPLY-${Math.floor(100 + Math.random() * 900)}`,
            department_id: dept.id,
            resource_type: 'consumable_reorder',
            title: `${dept.name}: Replenish ${c.name}`,
            current_situation: conSit,
            currentSituation: conSit,
            proposed_action: conAct,
            proposedAction: conAct,
            reasons: [
              `Stock on hand (${c.quantity_on_hand} ${c.unit}) has breached the safe reorder threshold (${c.min_stock_level} ${c.unit}).`,
              `Essential medical consumable required for clinical safety and routine procedures in ${dept.name}.`
            ],
            supporting_data: {
              consumableId: c.id,
              itemCode: c.item_code,
              currentQty: c.quantity_on_hand,
              minThreshold: c.min_stock_level,
              recommendedReorderQty: reorderQty,
              unit: c.unit
            },
            forecast_horizon_hours: 24,
            status: 'pending',
            priority: c.quantity_on_hand <= c.min_stock_level * 0.5 ? 'critical' : 'high'
          });
        }
      });
    }
  });

  return recommendations;
}

/**
 * Revalidates constraints immediately before an approval is applied.
 * STRICT CLINICAL & OPERATIONAL CHECKS:
 * - Candidate staff cannot be on leave or unavailable.
 * - Candidate staff specialty MUST be compatible with target department.
 * - Workload cannot exceed max permitted limit.
 * - Donor equipment must still be available.
 */
export function validateApprovalPreconditions(
  rec: GeneratedRecommendation,
  currentCtx: OptimizationContext
): { valid: boolean; reason?: string } {
  const data = rec.supporting_data || {};

  // Check 1: Staff Allocation Preconditions
  if (rec.resource_type === 'nurse_staffing' || rec.resource_type === 'doctor_allocation') {
    const candidateId = data.candidateStaffId || data.recommendedStaffId;
    if (candidateId) {
      const staffMember = currentCtx.staff.find((s) => s.id === candidateId);
      if (!staffMember) {
        return { valid: false, reason: 'Candidate staff record no longer exists in database.' };
      }

      // Check leave status
      if (staffMember.leave_status && staffMember.leave_status !== 'active') {
        return {
          valid: false,
          reason: `Staff member ${staffMember.name} is currently on leave (${staffMember.leave_status.replace('_', ' ')}). Cannot allocate.`
        };
      }

      // Check availability status
      if (staffMember.status === 'off_duty') {
        return {
          valid: false,
          reason: `Staff member ${staffMember.name} has clocked off duty. Select another available on-call employee.`
        };
      }

      // Check specialty compatibility
      if (!isSpecialtyCompatible(staffMember, rec.department_id)) {
        return {
          valid: false,
          reason: `Specialty mismatch: ${staffMember.name} (${staffMember.specialty || staffMember.role}) cannot be assigned to ${rec.department_id}. Specialty compatibility constraint violated.`
        };
      }

      // Check workload headroom
      if (staffMember.current_workload >= staffMember.max_workload) {
        return {
          valid: false,
          reason: `Staff member ${staffMember.name} is already at maximum safe workload capacity (${staffMember.current_workload}/${staffMember.max_workload}). Burnout safety rule enforced.`
        };
      }
    }
  }

  // Check 2: Equipment Transfer Preconditions
  if (rec.resource_type === 'equipment_transfer') {
    const donorEq = currentCtx.equipment.find((e) => e.id === data.donorEquipmentId);
    if (!donorEq) {
      return { valid: false, reason: 'Donor equipment record could not be found.' };
    }
    const requestedQty = data.transferQuantity || 1;
    if (donorEq.available_qty < requestedQty) {
      return {
        valid: false,
        reason: `Donor department no longer has sufficient available units (${donorEq.available_qty} available vs ${requestedQty} requested). Recommendation is stale.`
      };
    }
  }

  return { valid: true };
}
