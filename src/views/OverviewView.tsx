import React, { useState } from 'react';
import {
  Department,
  KpiData,
  Recommendation,
  Alert
} from '../types';
import {
  BedDouble,
  TrendingUp,
  Users,
  Cpu,
  BrainCircuit,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Eye,
  Activity,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Hospital3DView } from '../components/Hospital3DView';

interface OverviewViewProps {
  kpis: KpiData | null;
  departments: Department[];
  pendingRecommendations: Recommendation[];
  recentAlerts: Alert[];
  onNavigate: (view: string) => void;
  onOpenApproval: (rec: Recommendation) => void;
  onRefresh: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  kpis,
  departments,
  pendingRecommendations,
  recentAlerts,
  onNavigate,
  onOpenApproval,
  onRefresh,
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  if (!kpis) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mr-2" />
        <span>Loading live hospital telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Hospital Operations Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time bed utilization, 12-hour admission forecasting, and explainable AI allocation recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync Telemetry</span>
          </button>
          <button
            onClick={() => onNavigate('recommendations')}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Review Pending Approvals ({kpis.pendingApprovalsCount})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Bed Occupancy */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bed Occupancy</span>
            <BedDouble className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.systemOccupancyPct}%
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{kpis.occupiedBeds} occupied / {kpis.totalBeds}</span>
            <span className="font-bold text-teal-600 dark:text-teal-400">{kpis.availableBeds} open</span>
          </div>
        </div>

        {/* 12h Predicted Admissions */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">12h Forecast Inflow</span>
            <TrendingUp className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            +{kpis.totalPredicted12h}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Diurnal model</span>
            <span className="font-bold text-cyan-600 dark:text-cyan-400">Incoming</span>
          </div>
        </div>

        {/* Available Nurses */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available Staff</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.availableNurses}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Active on-duty / on-call
          </div>
        </div>

        {/* Equipment Margin */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Spare Equipment</span>
            <Cpu className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.availableCriticalEquipment}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Units ready for deployment
          </div>
        </div>

        {/* ED Surge Risk */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">ED Surge Risk</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black capitalize text-amber-600 dark:text-amber-400">
            {kpis.edSurgeRisk}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Trigger threshold: 80%
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Actions</span>
            <BrainCircuit className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {kpis.pendingApprovalsCount}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Require human sign-off
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive 3D Digital Twin + Department Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Twin Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                3D Hospital Digital Twin & Resource Node Status
              </h2>
            </div>
            <button
              onClick={() => onNavigate('3d-twin')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>Full 3D Campus View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <Hospital3DView
            departments={departments}
            selectedDeptId={selectedDeptId}
            onSelectDepartment={(id) => {
              setSelectedDeptId(id);
              if (id) {
                onNavigate('beds');
              }
            }}
            heightClass="h-[380px]"
          />
        </div>

        {/* Right Column: Department Capacity Telemetry */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Ward Utilization & Headroom</span>
            </h2>
            <button
              onClick={() => onNavigate('beds')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              Manage Beds
            </button>
          </div>

          <div className="space-y-2.5">
            {departments.map((d) => {
              const occPct = d.occupancyPct || 0;
              const isOverThreshold = occPct >= d.surge_threshold_pct;
              return (
                <div
                  key={d.id}
                  onClick={() => onNavigate('beds')}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-teal-500 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span className={`font-bold ${isOverThreshold ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {occPct}%
                      </span>
                      <span className="text-[10px] text-slate-400">({d.occupiedBeds}/{d.total_beds})</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        occPct >= 85
                          ? 'bg-red-500'
                          : occPct >= 75
                          ? 'bg-amber-500'
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(occPct, 100)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>12h Forecast: +{d.predicted12h || 0} pts</span>
                    <span className="font-medium text-teal-600 dark:text-teal-400">
                      {d.availableBeds} beds open
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Pending AI Recommendations & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Pending AI Recommendations */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Explainable Allocation Recommendations
              </h2>
            </div>
            <button
              onClick={() => onNavigate('recommendations')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              View All ({pendingRecommendations.length})
            </button>
          </div>

          {pendingRecommendations.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
              No pending recommendations. All ward resources operating within nominal parameters.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRecommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {rec.rec_code}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          rec.priority === 'critical'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                        }`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{rec.forecast_horizon_hours}h Horizon</span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {rec.proposed_action}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-500">
                      Requires clinical officer approval
                    </span>
                    <button
                      onClick={() => onOpenApproval(rec)}
                      className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <span>Review & Decide</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Operational Alerts */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Operational Alerts
              </h2>
            </div>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              Alert Center
            </button>
          </div>

          <div className="space-y-2.5">
            {recentAlerts.slice(0, 4).map((alt) => (
              <div
                key={alt.id}
                onClick={() => onNavigate('alerts')}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs cursor-pointer hover:border-slate-400 transition-all text-xs"
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span
                    className={
                      alt.severity === 'critical'
                        ? 'text-red-600 dark:text-red-400'
                        : alt.severity === 'warning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }
                  >
                    {alt.title}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(alt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  {alt.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
