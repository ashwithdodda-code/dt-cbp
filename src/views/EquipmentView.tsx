import React, { useState, useEffect } from 'react';
import { Department, Equipment, Consumable, RoomSlot } from '../types';
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
  Building2,
  Package,
  ShoppingCart,
  Boxes,
  Plus,
  Clock,
  Sparkles
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
  const [activeTab, setActiveTab] = useState<'equipment' | 'consumables' | 'rooms'>('equipment');

  // Equipment state
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Consumables state
  const [consumablesList, setConsumablesList] = useState<Consumable[]>([]);
  const [loadingConsumables, setLoadingConsumables] = useState(false);
  const [selectedConsumableDept, setSelectedConsumableDept] = useState<string>('all');
  const [reorderItem, setReorderItem] = useState<Consumable | null>(null);
  const [reorderQty, setReorderQty] = useState<number>(50);
  const [reordering, setReordering] = useState(false);
  const [reorderMsg, setReorderMsg] = useState<string | null>(null);

  // Rooms state
  const [roomsList, setRoomsList] = useState<RoomSlot[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Transfer Modal
  const [transferItem, setTransferItem] = useState<Equipment | null>(null);
  const [targetDeptId, setTargetDeptId] = useState<string>(departments[0]?.id || 'dept_casualty');
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
      setEquipmentList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setEquipmentList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsumables = async () => {
    setLoadingConsumables(true);
    try {
      const q = new URLSearchParams();
      if (selectedConsumableDept !== 'all') q.append('departmentId', selectedConsumableDept);
      const res = await fetch(`/api/consumables?${q.toString()}`);
      const data = await res.json();
      setConsumablesList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching consumables:', err);
      setConsumablesList([]);
    } finally {
      setLoadingConsumables(false);
    }
  };

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRoomsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setRoomsList([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
    fetchConsumables();
    fetchRooms();
  }, [selectedDept, selectedCategory, selectedConsumableDept]);

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
          notes: transferNotes || 'Internal department loan transfer',
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

  const handleReorderConsumable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderItem) return;
    setReordering(true);
    setReorderMsg(null);

    try {
      const res = await fetch(`/api/consumables/${reorderItem.id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: reorderQty,
          notes: `Central stores replenishment requisition approved by ${user?.name || 'Staff'}`,
          user_id: user?.id,
          user_email: user?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reorder consumable');

      setReorderMsg(`Replenished ${reorderQty} ${reorderItem.unit} of ${reorderItem.name}. New total: ${data.newQuantity}`);
      await fetchConsumables();
      onRefreshData?.();
      setTimeout(() => {
        setReorderItem(null);
        setReorderMsg(null);
      }, 1500);
    } catch (err: any) {
      setReorderMsg(err.message);
    } finally {
      setReordering(false);
    }
  };

  const openTransferModal = (eq: Equipment) => {
    setTransferItem(eq);
    const otherDept = departments.find((d) => d.id !== eq.department_id);
    setTargetDeptId(otherDept?.id || departments[0]?.id || 'dept_casualty');
    setTransferQty(1);
    setTransferNotes('');
    setTransferMsg(null);
  };

  const safeEquipmentList = Array.isArray(equipmentList) ? equipmentList : [];
  const safeConsumablesList = Array.isArray(consumablesList) ? consumablesList : [];
  const safeRoomsList = Array.isArray(roomsList) ? roomsList : [];

  const totalUnits = safeEquipmentList.reduce((acc, e) => acc + e.total_qty, 0);
  const availableUnits = safeEquipmentList.reduce((acc, e) => acc + e.available_qty, 0);
  const inUseUnits = safeEquipmentList.reduce((acc, e) => acc + e.in_use_qty, 0);
  const lowMarginCount = safeEquipmentList.filter((e) => e.available_qty <= 1).length;
  const lowConsumablesCount = safeConsumablesList.filter((c) => c.quantity_on_hand <= c.min_stock_level).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Medical Equipment, Diagnostic Assets & Consumable Inventory
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">
              Lotus Jammikunta
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            LOTUS DIAGNOSTIC CENTRE AND SKIN CLINIC JAMMIKUNTA • 128-Slice CT, Doppler ultrasound, phototherapy units, central pharmacy buffer & imaging suites.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchEquipment();
              fetchConsumables();
              fetchRooms();
            }}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingConsumables ? 'animate-spin' : ''}`} />
            <span>Sync All Inventory</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit text-xs font-bold">
        <button
          onClick={() => setActiveTab('equipment')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'equipment'
              ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Biomedical & Diagnostic Equipment</span>
        </button>

        <button
          onClick={() => setActiveTab('consumables')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all relative ${
            activeTab === 'consumables'
              ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Consumables & Medical Supplies</span>
          {lowConsumablesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500 text-white">
              {lowConsumablesCount} Low
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'rooms'
              ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Consultation Suites & Imaging Rooms</span>
        </button>
      </div>

      {/* TAB 1: BIOMEDICAL EQUIPMENT */}
      {activeTab === 'equipment' && (
        <div className="space-y-4 animate-in fade-in">
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
              <span className={`text-xl font-black ${lowMarginCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
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
                <option value="CT Scanner">CT Scanners</option>
                <option value="Ultrasound & Echo">Ultrasound & Echo</option>
                <option value="Dermatoscope">Dermatoscopes & Phototherapy</option>
                <option value="Infusion Pump">Infusion Pumps</option>
                <option value="Defibrillator">Defibrillators</option>
                <option value="Dialysis Unit">Dialysis Units</option>
                <option value="Biochemistry Analyzer">Lab Analyzers</option>
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
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">In Use</th>
                    <th className="py-3 px-4">Available Reserves</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {safeEquipmentList.map((eq) => {
                    const dept = departments.find((d) => d.id === eq.department_id);
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
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept?.color }} />
                            <span>{dept?.name || 'Department'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {eq.total_qty}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                          {eq.in_use_qty}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-black text-xs ${
                              eq.available_qty === 0
                                ? 'text-red-600 dark:text-red-400'
                                : eq.available_qty <= 1
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {eq.available_qty}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {eq.available_qty === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
                              <AlertTriangle className="w-3 h-3" /> Depleted
                            </span>
                          ) : eq.available_qty <= 1 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                              <AlertTriangle className="w-3 h-3" /> Low Reserve
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                              <CheckCircle className="w-3 h-3" /> Optimal
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openTransferModal(eq)}
                            disabled={eq.available_qty === 0}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                              eq.available_qty > 0
                                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100'
                                : 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                            }`}
                          >
                            Rebalance
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONSUMABLES & MEDICAL SUPPLIES */}
      {activeTab === 'consumables' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Consumables Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Monitored Items</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{consumablesList.length}</span>
              <span className="text-[10px] text-slate-400 block">Critical store catalog</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Low Stock Buffer</span>
              <span className={`text-xl font-black ${lowConsumablesCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900'}`}>
                {lowConsumablesCount}
              </span>
              <span className="text-[10px] text-slate-400 block">Below reorder trigger</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Central Reorder Protocol</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">Automated</span>
              <span className="text-[10px] text-slate-400 block">AI-HRO Reorder triggers active</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Lead Replenishment</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">Same-Day</span>
              <span className="text-[10px] text-slate-400 block">Telangana stores dispatch</span>
            </div>
          </div>

          {/* Consumables Filter */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between gap-3 text-xs">
            <select
              value={selectedConsumableDept}
              onChange={(e) => setSelectedConsumableDept(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
            >
              <option value="all">All Hospital Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Consumables Table */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Supply Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Min Safe Buffer</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Stock Status</th>
                    <th className="py-3 px-4 text-right">Replenish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {safeConsumablesList.map((item) => {
                    const dept = departments.find((d) => d.id === item.department_id);
                    const isLow = item.quantity_on_hand <= item.min_stock_level;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{item.item_code}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {item.category}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept?.color }} />
                            <span>{dept?.name || 'Department'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`font-black text-sm ${isLow ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                            {item.quantity_on_hand} <span className="text-[10px] text-slate-500 font-normal">{item.unit}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-600 dark:text-slate-400">
                          {item.min_stock_level} {item.unit}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {item.expiry_date}
                        </td>
                        <td className="py-3.5 px-4">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Reorder Triggered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                              <CheckCircle className="w-3 h-3" /> Sufficient
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setReorderItem(item);
                              setReorderQty(Math.max(item.min_stock_level * 2, 50));
                              setReorderMsg(null);
                            }}
                            className="px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 font-bold text-xs"
                          >
                            Indent Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONSULTATION SUITES & ROOMS */}
      {activeTab === 'rooms' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeRoomsList.map((room) => {
              const dept = departments.find((d) => d.id === room.department_id);
              return (
                <div
                  key={room.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {room.room_number}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{room.name}</h3>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept?.color }} />
                        <span>{dept?.name}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        room.status === 'open'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      {room.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold block text-slate-700 dark:text-slate-300">Active Schedule:</span>
                    <span>{room.current_slot_info || 'Ready for scheduled consultations & examinations'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Equipment Transfer Modal */}
      {transferItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Rebalance Asset: {transferItem.name}
              </h3>
              <button onClick={() => setTransferItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Recipient Hospital Department
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
                  Transfer Quantity (Available: {transferItem.available_qty})
                </label>
                <input
                  type="number"
                  min="1"
                  max={transferItem.available_qty}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Clinical Rationale & Handover Notes
                </label>
                <textarea
                  rows={2}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Temporary loan for surge coverage in Emergency Ward"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {transferMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold ${
                    transferMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
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
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  {transferring ? 'Transferring...' : 'Execute Rebalance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consumable Restock Modal */}
      {reorderItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Restock Medical Consumable: {reorderItem.name}
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">{reorderItem.item_code} • Current: {reorderItem.quantity_on_hand} {reorderItem.unit}</span>
              </div>
              <button onClick={() => setReorderItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleReorderConsumable} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Replenishment Quantity ({reorderItem.unit})
                </label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={reorderQty}
                  onChange={(e) => setReorderQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Minimum recommended buffer: {reorderItem.min_stock_level} {reorderItem.unit}.
                </span>
              </div>

              {reorderMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  {reorderMsg}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReorderItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reordering}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  {reordering ? 'Restocking...' : 'Confirm Restock Indent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
