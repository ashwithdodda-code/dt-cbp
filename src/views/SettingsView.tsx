import React, { useState, useEffect } from 'react';
import { Department, AuditLog, HospitalProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_HOSPITAL_PROFILE, formatIndianDateTime } from '../config/hospitalProfile';
import {
  Settings,
  Users,
  Shield,
  Clock,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Lock,
  UserCheck,
  FileText,
  RefreshCw,
  Building,
  Save,
  ToggleLeft,
  ToggleRight,
  Phone,
  MapPin
} from 'lucide-react';

interface SettingsViewProps {
  departments: Department[];
  onOpenLogin: () => void;
  onRefreshData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  departments,
  onOpenLogin,
  onRefreshData,
}) => {
  const { user, canEditSettings, demoUsers, switchDemoUser } = useAuth();
  const [profile, setProfile] = useState<HospitalProfile>(DEFAULT_HOSPITAL_PROFILE);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Department management state
  const [deptList, setDeptList] = useState<Department[]>(departments);
  const [updatingDeptId, setUpdatingDeptId] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch('/api/hospital-profile');
      const data = await res.json();
      if (data && data.name) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching hospital profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setAuditLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchLogs();
    setDeptList(departments);
  }, [departments]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/hospital-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          user_id: user?.id,
          user_email: user?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update hospital profile');
      setProfileMsg({ type: 'success', text: 'Hospital profile updated successfully in persistent database.' });
      onRefreshData?.();
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleDept = async (dept: Department) => {
    setUpdatingDeptId(dept.id);
    const newEnabled = dept.is_enabled === 0 ? 1 : 0;
    try {
      const res = await fetch(`/api/departments/${dept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_enabled: newEnabled,
          user_id: user?.id,
          user_email: user?.email,
        }),
      });
      if (res.ok) {
        setDeptList((prev) =>
          prev.map((d) => (d.id === dept.id ? { ...d, is_enabled: newEnabled } : d))
        );
        onRefreshData?.();
      }
    } catch (err) {
      console.error('Failed to toggle department:', err);
    } finally {
      setUpdatingDeptId(null);
    }
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await fetch('/api/system/reset-demo', { method: 'POST' });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Hospital Profile, Governance & Clinical Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Telangana single-hospital regional profile, department activation toggles, and immutable IST audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchProfile();
              fetchLogs();
            }}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            <span>Sync Settings</span>
          </button>
        </div>
      </div>

      {/* Grid: Hospital Profile Configuration + User Account */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hospital Profile Form */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Building className="w-4 h-4 text-teal-600" />
              <span>LOTUS DIAGNOSTIC CENTRE & SKIN CLINIC Profile</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">
              Jammikunta Core
            </span>
          </div>

          {/* Facility Photo Preview */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-950 text-white border border-slate-800">
            <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 border border-slate-700/80 relative">
              <img
                src="/assets/aistudio/file_00000000200482118613bf59a05df0cd_d3602e18.png"
                alt="Lotus Diagnostic Centre & Skin Clinic Jammikunta"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400">Verified Physical Facility</span>
              <h4 className="font-extrabold text-sm text-white truncate">LOTUS DIAGNOSTIC CENTRE AND SKIN CLINIC</h4>
              <p className="text-[11px] text-slate-300">Main Road, Near Old Bus Stand, Jammikunta, Karimnagar Dist, Telangana - 505122</p>
              <div className="text-[10px] text-slate-400">Directors: Dr. Ravikanti Murali & Dr. Sindhu Ravikanti</div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Hospital Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Expanded / Display Header
                </label>
                <input
                  type="text"
                  value={profile.expanded_name}
                  onChange={(e) => setProfile({ ...profile, expanded_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={profile.state}
                  disabled
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-xs text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  City / District
                </label>
                <input
                  type="text"
                  value={profile.city_district}
                  onChange={(e) => setProfile({ ...profile, city_district: e.target.value })}
                  placeholder="e.g. Hyderabad, Warangal"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  value={`${profile.currency} (${profile.currency_symbol})`}
                  disabled
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-xs text-slate-500 font-mono font-bold cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Emergency Helpline
                </label>
                <input
                  type="text"
                  value={profile.emergency_helpline || '108 / 102'}
                  onChange={(e) => setProfile({ ...profile, emergency_helpline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Hospital Reception Phone
                </label>
                <input
                  type="text"
                  value={profile.contact_phone || '+91 40 2345 6789'}
                  onChange={(e) => setProfile({ ...profile, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {profileMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs font-semibold ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProfile ? 'Saving...' : 'Save Hospital Profile'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* User Identity & Fast Profiles */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" />
              <span>Current Session & Role Authorization</span>
            </h3>
            <button
              onClick={onOpenLogin}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
            >
              Sign In
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                {user?.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{user?.email}</p>
                <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
                  Dept: {user?.department}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">
              {user?.role.replace('_', ' ')}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Telangana Leadership Profiles (Demonstration Switcher)
            </span>
            <div className="grid grid-cols-1 gap-2">
              {demoUsers.map((d) => (
                <button
                  key={d.email}
                  onClick={() => switchDemoUser(d.role)}
                  className={`p-2.5 text-left rounded-xl border transition-all ${
                    user?.email === d.email
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{d.name}</div>
                  <div className="text-[10px] text-slate-500">{d.label} • {d.dept}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 12 Departments Directory with Enable/Disable & Surge Thresholds */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Telangana Hospital Service Units & Department Configuration (12 Departments)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Toggle status & surge trigger thresholds
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {deptList.map((d) => {
            const isEnabled = d.is_enabled !== 0;
            return (
              <div
                key={d.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isEnabled
                    ? 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    : 'bg-slate-100 dark:bg-slate-800/20 border-slate-200/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{d.name}</span>
                  </div>
                  <button
                    onClick={() => handleToggleDept(d)}
                    disabled={updatingDeptId === d.id}
                    title={isEnabled ? 'Deactivate Department' : 'Activate Department'}
                    className="text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors"
                  >
                    {isEnabled ? (
                      <ToggleRight className="w-6 h-6 text-teal-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Category: <strong className="text-slate-700 dark:text-slate-300 capitalize">{d.category || 'clinical'}</strong></span>
                  <span>Surge Trigger: <strong className="text-slate-700 dark:text-slate-300 font-mono">{d.surge_threshold_pct}%</strong></span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Beds: {d.total_beds} • Baseline Staff: {d.baseline_staff}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Audit Trail Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Immutable Clinical Operations Audit Trail (IST Timestamps)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {auditLogs.length} Events Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Timestamp (IST)</th>
                <th className="py-2.5 px-3">Authorized User</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(Array.isArray(auditLogs) ? auditLogs : []).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-mono text-[11px]">
                  <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                    {formatIndianDateTime(log.timestamp)}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {log.user_email}
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                    {log.entity_type} ({log.entity_id})
                  </td>
                  <td className="py-2 px-3 text-slate-500 max-w-xs truncate">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Reset Demo Data Button */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">
              Demonstration Database Reset
            </span>
            <span className="text-[11px] text-slate-500">
              Reseeds pristine SQLite cohort across all 12 Telangana hospital departments.
            </span>
          </div>
          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              className="px-3.5 py-1.5 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              Reset Demo Data
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResetConfirm(false)}
                className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDemo}
                disabled={resetting}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
