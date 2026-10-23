import React, { useState, useEffect } from 'react';
import { Department, Bed, BedStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  BedDouble,
  Search,
  Filter,
  PlusCircle,
  RefreshCw,
  CheckCircle,
  Clock,
  Sparkles,
  Wrench,
  User,
  Activity,
  Edit2
} from 'lucide-react';

interface BedManagementViewProps {
  departments: Department[];
  onRefreshData?: () => void;
}

export const BedManagementView: React.FC<BedManagementViewProps> = ({
  departments,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Edit / Change Status Modal
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [newStatus, setNewStatus] = useState<BedStatus>('available');
  const [patientId, setPatientId] = useState('');
  const [patientAcuity, setPatientAcuity] = useState('medium');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add Bed Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBedNumber, setNewBedNumber] = useState('');
  const [newBedDept, setNewBedDept] = useState(departments[0]?.id || 'dept_ed');
  const [newBedType, setNewBedType] = useState('General Acute');

  const fetchBeds = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedDept !== 'all') q.append('departmentId', selectedDept);
      if (selectedStatus !== 'all') q.append('status', selectedStatus);
      if (selectedType !== 'all') q.append('bedType', selectedType);
      if (search) q.append('search', search);

      const res = await fetch(`/api/beds?${q.toString()}`);
      const data = await res.json();
      setBeds(data);
    } catch (err) {
      console.error('Error fetching beds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, [selectedDept, selectedStatus, selectedType, search]);

  const handleUpdateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBed) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/beds/${editingBed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          patient_sim_id: newStatus === 'occupied' ? (patientId || `SIM-PT-${Math.floor(1000 + Math.random() * 9000)}`) : null,
          patient_acuity: newStatus === 'occupied' ? patientAcuity : null,
          notes: notes,
          user_id: user?.id,
          user_email: user?.email,
        }),
      });
      if (!res.ok) throw new Error('Failed to update bed');
      setEditingBed(null);
      await fetchBeds();
      onRefreshData?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/beds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bed_number: newBedNumber,
          department_id: newBedDept,
          bed_type: newBedType,
          status: 'available',
          userId: user?.id,
          userEmail: user?.email,
        }),
      });
      if (!res.ok) throw new Error('Failed to create bed');
      setIsAddModalOpen(false);
      setNewBedNumber('');
      await fetchBeds();
      onRefreshData?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (bed: Bed) => {
    setEditingBed(bed);
    setNewStatus(bed.status);
    setPatientId(bed.patient_sim_id || '');
    setPatientAcuity(bed.patient_acuity || 'medium');
    setNotes(bed.notes || '');
  };

  const getStatusBadge = (status: BedStatus) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <CheckCircle className="w-3 h-3" /> Available
          </span>
        );
      case 'occupied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
            <User className="w-3 h-3" /> Occupied
          </span>
        );
      case 'cleaning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <Sparkles className="w-3 h-3" /> Sanitizing
          </span>
        );
      case 'reserved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
            <Clock className="w-3 h-3" /> Reserved
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
            <Wrench className="w-3 h-3" /> Maintenance
          </span>
        );
    }
  };

  const total = beds.length;
  const occupied = beds.filter((b) => b.status === 'occupied').length;
  const available = beds.filter((b) => b.status === 'available').length;
  const cleaning = beds.filter((b) => b.status === 'cleaning').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Bed Availability & Patient Allocation Matrix
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time ward census tracking, sanitary turnaround sequencing, and capacity constraint management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add New Bed</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Monitored Beds</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{total}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Occupied Beds</span>
          <span className="text-xl font-black text-red-600 dark:text-red-400">{occupied}</span>
          <span className="text-[10px] text-slate-400 block">{total > 0 ? ((occupied / total) * 100).toFixed(0) : 0}% utilization</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Immediate Available</span>
          <span className="text-xl font-black text-teal-600 dark:text-teal-400">{available}</span>
          <span className="text-[10px] text-slate-400 block">Ready for admission</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Cleaning / Turnover</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">{cleaning}</span>
          <span className="text-[10px] text-slate-400 block">Turnaround in progress</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bed #, SIM ID, notes..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Department Filter */}
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

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="cleaning">Sanitizing / Cleaning</option>
            <option value="reserved">Reserved</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        <button
          onClick={fetchBeds}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          title="Refresh Bed Census"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Bed Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {beds.map((bed) => {
          const dept = departments.find((d) => d.id === bed.department_id);
          return (
            <div
              key={bed.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-3 hover:border-teal-500 transition-all text-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                    {bed.bed_number}
                  </span>
                  {getStatusBadge(bed.status)}
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept?.color }} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{dept?.name}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Type:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{bed.bed_type}</span>
                  </div>
                  {bed.patient_sim_id ? (
                    <>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Patient:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{bed.patient_sim_id}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Acuity:</span>
                        <span className="capitalize font-bold text-red-600 dark:text-red-400">{bed.patient_acuity}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">No assigned patient</div>
                  )}
                </div>

                {bed.notes && (
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                    "{bed.notes}"
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {new Date(bed.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => openEditModal(bed)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-600 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Update</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Bed Modal */}
      {editingBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Update Bed: {editingBed.bed_number}
              </h3>
              <button onClick={() => setEditingBed(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdateBed} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Bed Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as BedStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                >
                  <option value="available">Available (Vacant & Ready)</option>
                  <option value="occupied">Occupied (Patient Assigned)</option>
                  <option value="cleaning">Cleaning / Sanitizing</option>
                  <option value="reserved">Reserved (Incoming Transfer)</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              {newStatus === 'occupied' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Simulated Patient ID
                    </label>
                    <input
                      type="text"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      placeholder="e.g. SIM-PT-2045"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Patient Acuity Level
                    </label>
                    <select
                      value={patientAcuity}
                      onChange={(e) => setPatientAcuity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Operational Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Post-op step-down transfer admitted"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBed(null)}
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

      {/* Add Bed Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Register New Hospital Bed
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddBed} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Bed Identifier / Number
                </label>
                <input
                  type="text"
                  required
                  value={newBedNumber}
                  onChange={(e) => setNewBedNumber(e.target.value)}
                  placeholder="e.g. ED-BED-25 or ICU-FLEX-01"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Department / Ward
                </label>
                <select
                  value={newBedDept}
                  onChange={(e) => setNewBedDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Bed Category
                </label>
                <select
                  value={newBedType}
                  onChange={(e) => setNewBedType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="General Acute">General Acute</option>
                  <option value="Emergency Care">Emergency Care</option>
                  <option value="Trauma Bay">Trauma Bay</option>
                  <option value="ICU Critical">ICU Critical</option>
                  <option value="Negative Pressure Isolation">Negative Pressure Isolation</option>
                  <option value="Telemetry Step-Down">Telemetry Step-Down</option>
                  <option value="Pediatric Acute">Pediatric Acute</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  Add Bed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
