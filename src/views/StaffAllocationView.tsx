import React, { useState, useEffect } from 'react';
import { Department, Staff, StaffStatus } from '../types';
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
  AlertTriangle
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
  const [search, setSearch] = useState<string>('');

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [newStatus, setNewStatus] = useState<StaffStatus>('on_duty');
  const [newWorkload, setNewWorkload] = useState<number>(0);
  const [newShift, setNewShift] = useState<string>('Morning 07:00-15:00');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedDept !== 'all') q.append('departmentId', selectedDept);
      if (selectedStatus !== 'all') q.append('status', selectedStatus);
      if (search) q.append('search', search);

      const res = await fetch(`/api/staff?${q.toString()}`);
      const data = await res.json();
      setStaffList(data);
    } catch (err) {
      console.error('Error fetching staff roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [selectedDept, selectedStatus, search]);

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
          current_workload: newWorkload,
          shift: newShift,
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
    setNewWorkload(s.current_workload);
    setNewShift(s.shift);
    setErrorMsg(null);
  };

  const getStatusBadge = (status: StaffStatus) => {
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
            <Clock className="w-3 h-3" /> Available On-Call
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            Meal Break
          </span>
        );
    }
  };

  const totalActive = staffList.filter((s) => s.status === 'on_duty').length;
  const totalOnCall = staffList.filter((s) => s.status === 'available_on_call').length;
  const avgLoad =
    totalActive > 0
      ? (
          staffList
            .filter((s) => s.status === 'on_duty')
            .reduce((acc, s) => acc + s.current_workload / s.max_workload, 0) / totalActive
        ) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Dynamic Nurse Staffing & Workload Distribution
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Nurse-to-patient acuity balancing, safe workload enforcement, and cross-trained on-call mobilization.
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Staff Monitored</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{staffList.length}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Active On-Duty</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalActive}</span>
          <span className="text-[10px] text-slate-400 block">Floor assignments</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Reserve On-Call</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400">{totalOnCall}</span>
          <span className="text-[10px] text-slate-400 block">Available for surge mobilization</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Average Load Factor</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">{avgLoad.toFixed(0)}%</span>
          <span className="text-[10px] text-slate-400 block">Target limit: 80%</span>
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
              placeholder="Search nurse name, code, skill..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

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
            <option value="break">On Break</option>
          </select>
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role & Ward</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Patient Workload</th>
                <th className="py-3 px-4">Certifications & Skills</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {staffList.map((s) => {
                const dept = departments.find((d) => d.id === s.department_id);
                const loadPct = s.max_workload > 0 ? (s.current_workload / s.max_workload) * 100 : 0;
                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{s.staff_code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{s.role}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept?.color }} />
                        <span>{dept?.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {s.shift}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(s.status)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              loadPct >= 100
                                ? 'bg-red-500'
                                : loadPct >= 75
                                ? 'bg-amber-500'
                                : 'bg-teal-500'
                            }`}
                            style={{ width: `${Math.min(loadPct, 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px]">
                          {s.current_workload}/{s.max_workload}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {s.skills.map((sk, i) => (
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Adjust Staffing Assignment: {editingStaff.name}
              </h3>
              <button onClick={() => setEditingStaff(null)} className="text-slate-400 hover:text-slate-600">✕</button>
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
                  <option value="on_duty">On Duty (Active Ward Coverage)</option>
                  <option value="available_on_call">Available On-Call</option>
                  <option value="break">On Meal / Rest Break</option>
                  <option value="off_duty">Off Duty</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Patient Workload (Max Safe Limit: {editingStaff.max_workload})
                </label>
                <input
                  type="number"
                  min="0"
                  max={editingStaff.max_workload}
                  value={newWorkload}
                  onChange={(e) => setNewWorkload(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Enforces nurse-to-patient safety ratio constraints.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Shift Timing
                </label>
                <select
                  value={newShift}
                  onChange={(e) => setNewShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="Morning 07:00-15:00">Morning (07:00 - 15:00)</option>
                  <option value="Evening 15:00-23:00">Evening (15:00 - 23:00)</option>
                  <option value="Night 23:00-07:00">Night (23:00 - 07:00)</option>
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
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
