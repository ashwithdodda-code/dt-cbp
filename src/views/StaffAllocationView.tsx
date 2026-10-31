import React, { useState, useEffect } from 'react';
import { Department, Staff, StaffStatus, StaffCategory, LeaveStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  Shield,
  Activity,
  Award,
  Sparkles,
  Edit2,
  AlertTriangle,
  Stethoscope,
  Calendar,
  AlertCircle,
  Building,
  UserX
} from 'lucide-react';

interface StaffAllocationViewProps {
  departments: Department[];
  onRefreshData?: () => void;
}

export const StaffAllocationView: React.FC<StaffAllocationViewProps> = ({
  departments,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLeave, setSelectedLeave] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [newStatus, setNewStatus] = useState<StaffStatus>('on_duty');
  const [newLeaveStatus, setNewLeaveStatus] = useState<LeaveStatus>('active');
  const [newWorkload, setNewWorkload] = useState<number>(0);
  const [newShift, setNewShift] = useState<string>('Morning 07:00-15:00 IST');
  const [newRoomAssignment, setNewRoomAssignment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedDept !== 'all') q.append('departmentId', selectedDept);
      if (selectedStatus !== 'all') q.append('status', selectedStatus);
      if (selectedCategory !== 'all') q.append('category', selectedCategory);
      if (selectedLeave !== 'all') q.append('leaveStatus', selectedLeave);
      if (search) q.append('search', search);

      const res = await fetch(`/api/staff?${q.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setStaffList(data);
      } else {
        console.error('Invalid response from /api/staff, expected array:', data);
        setStaffList([]);
      }
    } catch (err) {
      console.error('Error fetching staff roster:', err);
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [selectedDept, selectedStatus, selectedCategory, selectedLeave, search]);

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/staff/${editingStaff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          leave_status: newLeaveStatus,
          current_workload: newWorkload,
          shift: newShift,
          assigned_room_or_equipment: newRoomAssignment,
          user_id: user?.id,
          user_email: user?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update staff member');

      setEditingStaff(null);
      await fetchStaff();
      onRefreshData?.();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (s: Staff) => {
    setEditingStaff(s);
    setNewStatus(s.status);
    setNewLeaveStatus(s.leave_status || 'active');
    setNewWorkload(s.current_workload);
    setNewShift(s.shift);
    setNewRoomAssignment(s.assigned_room_or_equipment || '');
    setErrorMsg(null);
  };

  const getStatusBadge = (status: StaffStatus, leave: LeaveStatus) => {
    if (leave && leave !== 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
          <UserX className="w-3 h-3" /> On {leave.replace('_', ' ').toUpperCase()}
        </span>
      );
    }
    switch (status) {
      case 'on_duty':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <CheckCircle className="w-3 h-3" /> On Duty
          </span>
        );
      case 'available_on_call':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
            <Clock className="w-3 h-3" /> On-Call Reserve
          </span>
        );
      case 'off_duty':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
            Off Duty
          </span>
        );
      case 'break':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
            Shift Break
          </span>
        );
    }
  };

  const safeStaffList = Array.isArray(staffList) ? staffList : [];
  const totalActive = safeStaffList.filter((s) => s.status === 'on_duty' && (!s.leave_status || s.leave_status === 'active')).length;
  const totalOnCall = safeStaffList.filter((s) => s.status === 'available_on_call' && (!s.leave_status || s.leave_status === 'active')).length;
  const totalDoctors = safeStaffList.filter((s) => s.category === 'Doctor / Specialist').length;
  const totalOnLeave = safeStaffList.filter((s) => s.leave_status && s.leave_status !== 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Clinical Staff Roster & Dynamic Workload Allocation
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">
              Lotus Jammikunta
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            LOTUS DIAGNOSTIC CENTRE AND SKIN CLINIC JAMMIKUNTA • Specialist coverage, safe workload limits (&lt;80%), and clinical leave supervision.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStaff}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Roster</span>
          </button>
        </div>
      </div>

      {/* Specialty Spotlight Banner: Dr. Sindhu Ravikanti & Dr. Ravikanti Murali */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-transparent border border-pink-500/30 dark:border-pink-500/20 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-pink-500/20">
                SR
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Dr. Sindhu Ravikanti</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300">
                    Lotus Skin Clinic Director
                  </span>
                </div>
                <p className="text-xs text-pink-700 dark:text-pink-300 font-semibold">Senior Consultant Dermatologist, MBBS, MD (DVL)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Specialty: Skin and dermatology services • Dermatosurgery</p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-pink-200/60 dark:border-pink-800/40 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>Suite: OPD Consultation Room 101 • Skin & Biopsy Suite (1st Floor)</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">● Available for OPD Consults</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/30 dark:border-indigo-500/20 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
                RM
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Dr. Ravikanti Murali</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    Lotus Diagnostic Managing Director
                  </span>
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">Chief Radiologist & Diagnostic Imaging Lead, MBBS, MD (RD)</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Specialty: Radiology, 128-Slice CT & Diagnostic Doppler</p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>Suite: 128-Slice CT Console & USG Bay 1 (Ground Floor)</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">● Active Reporting Shift</span>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Clinical Roster</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{safeStaffList.length}</span>
          <span className="text-[10px] text-slate-400 block">{totalDoctors} Doctors / Specialists</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Active On-Duty</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalActive}</span>
          <span className="text-[10px] text-slate-400 block">Floor & suite assignments</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Reserve On-Call</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400">{totalOnCall}</span>
          <span className="text-[10px] text-slate-400 block">Surge reserve pool</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Staff on Leave</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">{totalOnLeave}</span>
          <span className="text-[10px] text-slate-400 block">Excluded from allocation</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff name, code, specialty..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
          >
            <option value="all">All Roles & Categories</option>
            <option value="Doctor / Specialist">Doctors & Specialists</option>
            <option value="Nurse">Nurses</option>
            <option value="Radiology Technician">Radiology Technicians</option>
            <option value="Laboratory Technician">Lab Technicians</option>
            <option value="Pharmacist">Pharmacists</option>
            <option value="Ward Assistant">Ward Assistants</option>
            <option value="Biomedical Technician">Biomedical Technicians</option>
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="on_duty">On Duty</option>
            <option value="available_on_call">Available On-Call</option>
            <option value="off_duty">Off Duty</option>
            <option value="break">Shift Break</option>
          </select>

          <select
            value={selectedLeave}
            onChange={(e) => setSelectedLeave(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
          >
            <option value="all">All Leave States</option>
            <option value="active">Active & On-Duty Fit</option>
            <option value="on_leave">On Approved Leave</option>
            <option value="sick_leave">Sick Leave</option>
          </select>
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Personnel</th>
                <th className="py-3 px-4">Role & Specialty</th>
                <th className="py-3 px-4">Department & Suite</th>
                <th className="py-3 px-4">Shift (IST)</th>
                <th className="py-3 px-4">Status & Leave</th>
                <th className="py-3 px-4">Workload Capacity</th>
                <th className="py-3 px-4">Competencies</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {safeStaffList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-xs">No staff members match the selected filters or roster is loading.</p>
                  </td>
                </tr>
              ) : (
                safeStaffList.map((s) => {
                const dept = departments.find((d) => d.id === s.department_id);
                const loadPct = s.max_workload > 0 ? (s.current_workload / s.max_workload) * 100 : 0;
                const isDoc = s.category === 'Doctor / Specialist';
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {isDoc && <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                        <span>{s.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{s.staff_code}</div>
                      {s.verification_disclaimer && (
                        <div className="text-[9px] text-amber-600 dark:text-amber-400/80 italic mt-0.5">
                          {s.verification_disclaimer}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{s.role}</div>
                      {s.specialty && (
                        <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                          {s.specialty}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 uppercase font-mono">{s.category}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept?.color }} />
                        <span>{dept?.name || 'Department'}</span>
                      </div>
                      {s.assigned_room_or_equipment && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Loc: {s.assigned_room_or_equipment}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {s.shift}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(s.status, s.leave_status)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              loadPct >= 100
                                ? 'bg-red-500'
                                : loadPct >= 80
                                ? 'bg-amber-500'
                                : 'bg-teal-500'
                            }`}
                            style={{ width: `${Math.min(loadPct, 100)}%` }}
                          />
                        </div>
                        <span className={`font-bold text-[11px] ${loadPct >= 80 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                          {s.current_workload}/{s.max_workload}
                        </span>
                      </div>
                      {loadPct >= 80 && (
                        <span className="text-[9px] text-amber-600 font-semibold block mt-0.5">
                          Fatigue Risk (&gt;80%)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(s.skills || []).map((sk, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openEditModal(s)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-600 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-colors"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Adjust Clinical Assignment: {editingStaff.name}
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">{editingStaff.staff_code} • {editingStaff.role}</span>
              </div>
              <button onClick={() => setEditingStaff(null)} className="text-slate-400 hover:text-slate-600 font-bold text-base">✕</button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Availability Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as StaffStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                >
                  <option value="on_duty">On Duty (Active Ward / Suite Coverage)</option>
                  <option value="available_on_call">Available On-Call (Surge Pool)</option>
                  <option value="break">On Meal / Rest Break</option>
                  <option value="off_duty">Off Duty</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Leave Status
                </label>
                <select
                  value={newLeaveStatus}
                  onChange={(e) => setNewLeaveStatus(e.target.value as LeaveStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                >
                  <option value="active">Active & Available for Duties</option>
                  <option value="on_leave">On Approved Casual/Annual Leave</option>
                  <option value="sick_leave">On Medical / Sick Leave</option>
                  <option value="maternity_leave">On Maternity / Extended Leave</option>
                </select>
                {newLeaveStatus !== 'active' && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-1 font-semibold">
                    Note: Staff on leave will automatically be precluded from optimizer allocations.
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Workload (Safe Upper Limit: {editingStaff.max_workload})
                </label>
                <input
                  type="number"
                  min="0"
                  max={editingStaff.max_workload}
                  value={newWorkload}
                  onChange={(e) => setNewWorkload(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Enforces nurse-patient safety limits and burnout protection rules.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Location / Room / Console
                </label>
                <input
                  type="text"
                  value={newRoomAssignment}
                  onChange={(e) => setNewRoomAssignment(e.target.value)}
                  placeholder="e.g. OPD Room 101, CT Suite 1, ICU Bay 3"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Shift Timing (IST)
                </label>
                <select
                  value={newShift}
                  onChange={(e) => setNewShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="Morning (07:00 - 15:00 IST)">Morning (07:00 - 15:00 IST)</option>
                  <option value="Evening (15:00 - 23:00 IST)">Evening (15:00 - 23:00 IST)</option>
                  <option value="Night (23:00 - 07:00 IST)">Night (23:00 - 07:00 IST)</option>
                  <option value="General OPD (09:00 - 17:00 IST)">General OPD (09:00 - 17:00 IST)</option>
                </select>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
