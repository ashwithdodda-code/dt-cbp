export type UserRole = 'admin' | 'department_manager' | 'operations_staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
}

export interface HospitalProfile {
  id: string;
  name: string;
  expanded_name: string;
  country: string;
  state: string;
  city_district: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  date_format: string;
  time_format: string;
  contact_phone?: string;
  emergency_helpline?: string;
  updated_at: string;
}

export type DepartmentCategory = 'clinical' | 'diagnostic' | 'support' | 'administrative';

export interface Department {
  id: string;
  name: string;
  code: string;
  total_beds: number;
  baseline_staff: number;
  surge_threshold_pct: number;
  color: string;
  is_enabled?: number;
  category?: DepartmentCategory;
  // Computed / aggregated
  occupiedBeds?: number;
  availableBeds?: number;
  cleaningBeds?: number;
  occupancyPct?: number;
  predicted12h?: number;
  surgeRisk?: 'low' | 'moderate' | 'high' | 'critical';
  onDutyStaff?: number;
}

export type BedStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';

export interface Bed {
  id: string;
  bed_number: string;
  department_id: string;
  bed_type: string;
  status: BedStatus;
  patient_sim_id: string | null;
  patient_acuity: 'low' | 'medium' | 'high' | 'critical' | null;
  notes: string | null;
  updated_at: string;
}

export type StaffStatus = 'on_duty' | 'available_on_call' | 'off_duty' | 'break';
export type StaffCategory =
  | 'Doctor / Specialist'
  | 'Nurse'
  | 'Radiology Technician'
  | 'Laboratory Technician'
  | 'Pharmacist'
  | 'Ward Assistant'
  | 'Reception Staff'
  | 'Housekeeping Staff'
  | 'Biomedical Technician'
  | 'Administrative Staff';

export type LeaveStatus = 'active' | 'on_leave' | 'sick_leave' | 'maternity_leave';

export interface Staff {
  id: string;
  staff_code: string;
  name: string;
  department_id: string;
  role: string;
  category: StaffCategory;
  specialty?: string | null;
  shift: string;
  status: StaffStatus;
  leave_status: LeaveStatus;
  current_workload: number;
  max_workload: number;
  skills: string[];
  assigned_room_or_equipment?: string | null;
  verification_disclaimer?: string | null;
  updated_at: string;
}

export type EquipmentStatus = 'optimal' | 'warning_low' | 'critical';

export interface Equipment {
  id: string;
  equipment_code: string;
  name: string;
  category: string;
  department_id: string;
  total_qty: number;
  available_qty: number;
  in_use_qty: number;
  maintenance_qty: number;
  status: EquipmentStatus;
  last_inspected_at: string;
}

export type ConsumableStatus = 'optimal' | 'low_stock' | 'critical';

export interface Consumable {
  id: string;
  item_code: string;
  name: string;
  category: string;
  department_id: string;
  quantity_on_hand: number;
  min_stock_level: number;
  unit: string;
  expiry_date: string;
  status: ConsumableStatus;
  last_restocked_at: string;
}

export interface RoomSlot {
  id: string;
  room_number: string;
  name: string;
  department_id: string;
  room_type: string;
  equipment_id?: string | null;
  assigned_staff_id?: string | null;
  status: 'open' | 'occupied' | 'cleaning' | 'maintenance';
  current_slot_info?: string | null;
  updated_at: string;
}

export interface ForecastPoint {
  hourOffset: number;
  targetTime: string;
  predictedAdmissions: number;
  lowerBound: number;
  upperBound: number;
  acuityBreakdown: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
  mape: number;
  sampleCount: number;
  validationWindowHours: number;
}

export interface ForecastResult {
  departmentId: string;
  horizonHours: number;
  generatedAt: string;
  modelName: string;
  totalPredicted: number;
  points: ForecastPoint[];
  metrics: ModelMetrics;
  influencingFactors: {
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }[];
  surgeRisk: 'low' | 'moderate' | 'high' | 'critical';
  confidenceScore: number;
}

export type RecommendationStatus = 'pending' | 'approved' | 'rejected' | 'overridden' | 'stale';
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type ResourceType =
  | 'bed_capacity'
  | 'nurse_staffing'
  | 'doctor_allocation'
  | 'equipment_transfer'
  | 'consumable_reorder'
  | 'room_scheduling'
  | 'surge_mitigation';

export interface Recommendation {
  id: string;
  rec_code: string;
  department_id: string;
  resource_type: ResourceType;
  title: string;
  current_situation: string;
  proposed_action: string;
  reasons: string[];
  supporting_data: Record<string, any>;
  forecast_horizon_hours: number;
  status: RecommendationStatus;
  priority: RecommendationPriority;
  created_at: string;
}

export interface ApprovalRecord {
  id: string;
  recommendation_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: 'approved' | 'rejected' | 'overridden';
  notes: string;
  override_details?: Record<string, any>;
  applied_changes?: Record<string, any>;
  timestamp: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  alert_code: string;
  severity: AlertSeverity;
  title: string;
  department_id?: string;
  description: string;
  status: AlertStatus;
  created_at: string;
  resolved_at?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface KpiData {
  systemOccupancyPct: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  cleaningBeds: number;
  maintenanceBeds: number;
  totalPredicted12h: number;
  availableStaff: number;
  availableNurses?: number;
  onDutyStaffCount: number;
  availableCriticalEquipment: number;
  lowStockConsumablesCount: number;
  pendingApprovalsCount: number;
  activeAlertsCount: number;
  surgeRisk: 'low' | 'moderate' | 'high' | 'critical';
  edSurgeRisk?: 'low' | 'moderate' | 'high' | 'critical';
}
