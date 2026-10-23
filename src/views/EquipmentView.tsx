import React, { useState, useEffect } from 'react';
import { Department, Equipment } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Cpu,
  Search,
  RefreshCw,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Layers,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface EquipmentViewProps {
  departments: Department[];
  onRefreshData?: () => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  departments,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Transfer Modal
  const [transferItem, setTransferItem] = useState<Equipment | null>(null);
  const [targetDeptId, setTargetDeptId] = useState<string>(departments[0]?.id || 'dept_ed');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [transferring, setTransferring] = useState(false);
  const [transferMsg, setTransferMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedDept !== 'all') q.append('departmentId', selectedDept);
      if (selectedCategory !== 'all') q.append('category', selectedCategory);

      const res = await fetch(`/api/equipment?${q.toString()}`);
      const data = await res.json();
      setEquipmentList(data);
    } catch (err) {
      console.error('Error fetching equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [selectedDept, selectedCategory]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItem) return;
    setTransferring(true);
    setTransferMsg(null);

    try {
      const res = await fetch('/api/equipment/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorEquipmentId: transferItem.id,
          recipientDepartmentId: targetDeptId,
          quantity: transferQty,
          notes: transferNotes || 'Operational loan transfer',
          user_id: user?.id,
          user_email: user?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete equipment transfer');

      setTransferMsg({ type: 'success', text: data.message });
      await fetchEquipment();
      onRefreshData?.();
      setTimeout(() => {
        setTransferItem(null);
        setTransferMsg(null);
      }, 1500);
    } catch (err: any) {
      setTransferMsg({ type: 'error', text: err.message });
    } finally {
      setTransferring(false);
    }
  };

  const openTransferModal = (eq: Equipment) => {
    setTransferItem(eq);
    const otherDept = departments.find((d) => d.id !== eq.department_id);
    setTargetDeptId(otherDept?.id || departments[0]?.id || 'dept_ed');
    setTransferQty(1);
    setTransferNotes('');
    setTransferMsg(null);
  };

  const totalUnits = equipmentList.reduce((acc, e) => acc + e.total_qty, 0);
  const availableUnits = equipmentList.reduce((acc, e) => acc + e.available_qty, 0);
  const inUseUnits = equipmentList.reduce((acc, e) => acc + e.in_use_qty, 0);
  const lowMarginCount = equipmentList.filter((e) => e.available_qty <= 1).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Medical Equipment & Biomedical Inventory Tracking
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Life-support apparatus reserves, cross-department loan rebalancing, and telemetry maintenance status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEquipment}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Inventory</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Deployed Units</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{totalUnits}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Active In-Use</span>
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{inUseUnits}</span>
          <span className="text-[10px] text-slate-400 block">{totalUnits > 0 ? ((inUseUnits / totalUnits) * 100).toFixed(0) : 0}% utilization</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Available Reserves</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{availableUnits}</span>
          <span className="text-[10px] text-slate-400 block">Ready for bedside setup</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Low Margin Items</span>
          <span className={`text-xl font-black ${lowMarginCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900'}`}>
            {lowMarginCount}
          </span>
          <span className="text-[10px] text-slate-400 block">Reserve &lt;= 1 unit</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
          >
            <option value="all">All Equipment Categories</option>
            <option value="Ventilator">Ventilators</option>
            <option value="Infusion Pump">Infusion Pumps</option>
            <option value="Patient Monitor">Patient Monitors</option>
            <option value="Defibrillator">Defibrillators</option>
            <option value="Dialysis Unit">Dialysis Units</option>
            <option value="Portable X-Ray">Portable X-Ray</option>
          </select>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Equipment Device</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Current Department</th>
                <th className="py-3 px-4">Inventory Breakdown</th>
                <th className="py-3 px-4">Operating Reserve</th>
                <th className="py-3 px-4">Inspection Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {equipmentList.map((eq) => {
                const dept = departments.find((d) => d.id === eq.department_id);
                const isLow = eq.available_qty <= 1;
                return (
                  <tr key={eq.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{eq.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{eq.equipment_code}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {eq.category}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept?.color }} />
                        <span>{dept?.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] space-y-0.5">
                        <span className="text-slate-500">Total: <strong>{eq.total_qty}</strong></span>
                        <span className="mx-1 text-slate-300">•</span>
                        <span className="text-indigo-600 dark:text-indigo-400">In Use: <strong>{eq.in_use_qty}</strong></span>
                        {eq.maintenance_qty > 0 && (
                          <>
                            <span className="mx-1 text-slate-300">•</span>
                            <span className="text-amber-600">Maint: <strong>{eq.maintenance_qty}</strong></span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isLow
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        }`}
                      >
                        {isLow ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {eq.available_qty} Units Available
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-400 font-mono">
                      {new Date(eq.last_inspected_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openTransferModal(eq)}
                        disabled={eq.available_qty === 0}
                        className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold text-[11px] transition-colors flex items-center gap-1 ml-auto disabled:opacity-40"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Transfer</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer Modal */}
      {transferItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cross-Department Equipment Transfer
                </h3>
              </div>
              <button onClick={() => setTransferItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">{transferItem.name}</span>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Category: {transferItem.category}</span>
                <span>Spare Inventory: <strong className="text-teal-600">{transferItem.available_qty}</strong> units</span>
              </div>
            </div>

            <form onSubmit={handleTransfer} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Recipient Destination Ward
                </label>
                <select
                  value={targetDeptId}
                  onChange={(e) => setTargetDeptId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                >
                  {departments
                    .filter((d) => d.id !== transferItem.department_id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Units to Loan / Transfer
                </label>
                <input
                  type="number"
                  min="1"
                  max={transferItem.available_qty}
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Transfer Justification Note
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Surge relief loan requested by ICU Lead"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {transferMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold ${
                    transferMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                  }`}
                >
                  {transferMsg.text}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm"
                >
                  Execute Atomic Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
