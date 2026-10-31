import React, { useState, useEffect } from 'react';
import { Department, Alert, AlertSeverity, AlertStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatIndianDateTime } from '../config/hospitalProfile';
import {
  AlertTriangle,
  Search,
  CheckCircle,
  Clock,
  RefreshCw,
  Bell,
  ShieldAlert,
  AlertCircle,
  Info
} from 'lucide-react';

interface AlertsViewProps {
  departments: Department[];
  onRefreshData?: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  departments,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [search, setSearch] = useState<string>('');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedSeverity !== 'all') q.append('severity', selectedSeverity);
      if (selectedStatus !== 'all') q.append('status', selectedStatus);

      const res = await fetch(`/api/alerts?${q.toString()}`);
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedSeverity, selectedStatus]);

  const handleUpdateStatus = async (alertId: string, nextStatus: AlertStatus) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          userId: user?.id,
          userEmail: user?.email,
        }),
      });
      if (!res.ok) throw new Error('Failed to update alert');
      await fetchAlerts();
      onRefreshData?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
            <AlertTriangle className="w-3 h-3" /> Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <AlertCircle className="w-3 h-3" /> Warning
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
            <Info className="w-3 h-3" /> Info
          </span>
        );
    }
  };

  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const criticalCount = safeAlerts.filter((a) => a.severity === 'critical' && a.status === 'active').length;
  const warningCount = safeAlerts.filter((a) => a.severity === 'warning' && a.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hospital Operations Alert Center
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300">
              Surge Monitoring
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time threshold breaches, emergency department surge predictions, and critical equipment margins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAlerts}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Alerts</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Active Critical Alerts</span>
          <span className="text-xl font-black text-red-600 dark:text-red-400">{criticalCount}</span>
          <span className="text-[10px] text-slate-400 block">Immediate risk</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Warning Thresholds</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">{warningCount}</span>
          <span className="text-[10px] text-slate-400 block">Elevated capacity</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Deduplication Guard</span>
          <span className="text-xl font-black text-teal-600 dark:text-teal-400">Active</span>
          <span className="text-[10px] text-slate-400 block">Prevents alert fatigue</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Emergency Surge Protocol</span>
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">Standby</span>
          <span className="text-[10px] text-slate-400 block">Triggers at 80% ED occupancy</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {['active', 'acknowledged', 'resolved', 'all'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                selectedStatus === st
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st} Alerts
            </button>
          ))}
        </div>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-semibold"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Informational</option>
        </select>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {safeAlerts.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
            No alerts found for the selected status. All department operating telemetry is nominal.
          </div>
        ) : (
          safeAlerts.map((alt) => {
            const dept = departments.find((d) => d.id === alt.department_id);
            return (
              <div
                key={alt.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(alt.severity)}
                    <span className="font-mono text-[10px] text-slate-400">{alt.alert_code}</span>
                    {dept && (
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                        {dept.name}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {alt.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    {alt.description}
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Logged: {formatIndianDateTime(alt.created_at)}
                    {alt.resolved_at && ` • Resolved: ${formatIndianDateTime(alt.resolved_at)}`}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {alt.status === 'active' && (
                    <button
                      onClick={() => handleUpdateStatus(alt.id, 'acknowledged')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-bold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alt.status !== 'resolved' && (
                    <button
                      onClick={() => handleUpdateStatus(alt.id, 'resolved')}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors shadow-2xs"
                    >
                      Resolve Alert
                    </button>
                  )}
                  {alt.status === 'resolved' && (
                    <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-teal-500" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
