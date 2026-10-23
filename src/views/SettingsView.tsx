import React, { useState, useEffect } from 'react';
import { Department, AuditLog } from '../types';
import { useAuth } from '../context/AuthContext';
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
  RefreshCw
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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      setAuditLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await fetch('/api/system/reset-demo', { method: 'POST' });
      // Give server a moment to reload
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
            System Settings & Clinical Governance Audit
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access control policies, operational surge thresholds, and immutable chronological action logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            <span>Refresh Audit Log</span>
          </button>
        </div>
      </div>

      {/* Account & Role Switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User Identity & Roles */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" />
              <span>Current Session & Role Authorization</span>
            </h3>
            <button
              onClick={onOpenLogin}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
            >
              Add / Switch Account
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
                  Assigned Ward: {user?.department}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">
              {user?.role.replace('_', ' ')}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Fast Demonstration Profiles
            </span>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((d) => (
                <button
                  key={d.email}
                  onClick={() => switchDemoUser(d.role)}
                  className={`p-2.5 text-left rounded-xl border transition-all ${
                    user?.email === d.email
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{d.name}</div>
                  <div className="text-[10px] text-slate-500">{d.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* System Thresholds & Reset */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-teal-600" />
              <span>Surge Protocol Thresholds</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Configured Limits</span>
          </div>

          <div className="space-y-2.5">
            {departments.map((d) => (
              <div
                key={d.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Surge Limit:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {d.surge_threshold_pct}% Occupancy
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Reset Demo Data Button */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  Demonstration Database Reset
                </span>
                <span className="text-[11px] text-slate-500">
                  Reseeds pristine SQLite cohort across all departments.
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
      </div>

      {/* System Audit Trail Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Immutable Clinical Operations Audit Trail
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
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Authorized User</th>
                <th className="py-2.5 px-3">Operational Action</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 dark:text-slate-200">
                    {log.user_email}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 dark:bg-slate-700 text-teal-600 dark:text-teal-400">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {log.entity_type} ({log.entity_id})
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-sans line-clamp-1 max-w-xs">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
