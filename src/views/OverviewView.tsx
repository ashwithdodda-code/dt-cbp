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
  RefreshCw,
  MapPin,
  Phone,
  Clock,
  Stethoscope,
  Building2
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
      {/* Real Facility Showcase Feature Card: LOTUS DIAGNOSTIC CENTRE AND SKIN CLINIC JAMMIKUNTA */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-black via-slate-950 to-zinc-950 border border-slate-800/90 shadow-2xl text-white">
        {/* Subtle decorative background light */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-5 sm:p-6 lg:p-7 flex flex-col lg:flex-row items-center gap-6">
          {/* Facility Photo Frame */}
          <div className="relative w-full lg:w-72 xl:w-80 shrink-0 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900 group">
            <div className="aspect-[3/4] w-full overflow-hidden relative">
              <img
                src="/assets/aistudio/file_00000000200482118613bf59a05df0cd_d3602e18.png"
                alt="Lotus Diagnostic Centre and Skin Clinic Jammikunta"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none" />
            </div>

            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Facility Node
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 text-left">
              <div className="flex items-center gap-1.5 text-white font-extrabold text-xs">
                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Lotus Facility Campus</span>
              </div>
              <p className="text-[10px] text-slate-300 font-medium mt-0.5 line-clamp-1">
                Main Road, Jammikunta • Karimnagar Dist
              </p>
            </div>
          </div>

          {/* Facility Information & Clinical Operations */}
          <div className="flex-1 space-y-4 text-left w-full">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  Telangana State Healthcare Node
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-slate-800 text-slate-300 border border-slate-700">
                  Jammikunta Core • Karimnagar Dist
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Single Hospital Deployment
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-snug">
                LOTUS DIAGNOSTIC CENTRE AND SKIN CLINIC JAMMIKUNTA
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                Integrated diagnostic imaging, outpatient dermatology laser suites, 24/7 acute casualty triage, and AI-driven dynamic resource headroom optimization.
              </p>
            </div>

            {/* Doctors & Clinical Directors Spotlight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md">
                  RM
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate">Dr. Ravikanti Murali, MD (RD)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">HOD</span>
                  </div>
                  <div className="text-[11px] text-teal-400 font-semibold truncate">Managing Director & Chief Radiologist</div>
                  <div className="text-[10px] text-slate-400 truncate">128-Slice CT • Doppler USG • Digital X-Ray</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md">
                  SR
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-white truncate">Dr. Sindhu Ravikanti, MD (DVL)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">Lead</span>
                  </div>
                  <div className="text-[11px] text-pink-400 font-semibold truncate">Senior Consultant Dermatologist & Director</div>
                  <div className="text-[10px] text-slate-400 truncate">Lotus Skin Clinic • Biopsy • Phototherapy</div>
                </div>
              </div>
            </div>

            {/* Quick Facility Details & Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  <span>Main Road, Beside Old Bus Stand, Jammikunta (505122)</span>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Emergency: 108 / 102 • Direct: +91 8727 255 678</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Casualty: 24/7 • Diagnostics: 08:30 - 20:30 IST</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onRefresh}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sync Telemetry</span>
                </button>
                <button
                  onClick={() => onNavigate('recommendations')}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-900/30 transition-colors flex items-center gap-1.5"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>Review Approvals ({kpis.pendingApprovalsCount})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Bed Occupancy */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Bed Occupancy</span>
            <BedDouble className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.systemOccupancyPct}%
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
            <span>{kpis.occupiedBeds}/{kpis.totalBeds} in use</span>
            <span className="font-bold text-teal-600 dark:text-teal-400">{kpis.availableBeds} open</span>
          </div>
        </div>

        {/* 12h Predicted Admissions */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">12h Forecast</span>
            <TrendingUp className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            +{kpis.totalPredicted12h}
          </div>
          <div className="mt-2 text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">
            Inflow projected
          </div>
        </div>

        {/* Available Staff */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Staff</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.availableStaff || kpis.availableNurses}
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            On-duty & surge pool
          </div>
        </div>

        {/* Equipment Margin */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Spare Apparatus</span>
            <Cpu className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.availableCriticalEquipment}
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Ready for deployment
          </div>
        </div>

        {/* Consumables Low Stock Alert */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Supplies Alert</span>
            <AlertTriangle className={`w-4 h-4 ${(kpis.lowStockConsumablesCount || 0) > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>
          <div className={`text-2xl font-black ${(kpis.lowStockConsumablesCount || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {kpis.lowStockConsumablesCount || 0}
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            {(kpis.lowStockConsumablesCount || 0) > 0 ? 'Reorder threshold breached' : 'Buffer optimal'}
          </div>
        </div>

        {/* Casualty Surge Risk */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Casualty Risk</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black capitalize text-rose-600 dark:text-rose-400">
            {kpis.edSurgeRisk || kpis.surgeRisk}
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Threshold: 80%
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">AI Indents</span>
            <BrainCircuit className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {kpis.pendingApprovalsCount}
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Requires clinician approval
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
