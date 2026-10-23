import React from 'react';
import {
  LayoutDashboard,
  Box,
  TrendingUp,
  BedDouble,
  Users,
  Cpu,
  BrainCircuit,
  AlertTriangle,
  BarChart3,
  Settings,
  Shield,
  Layers
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  pendingRecsCount: number;
  activeAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  pendingRecsCount,
  activeAlertsCount,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: '3d-twin', label: '3D Digital Twin', icon: Box, highlightBadge: '3D' },
    { id: 'forecasting', label: 'Patient Demand', icon: TrendingUp },
    { id: 'beds', label: 'Bed Management', icon: BedDouble },
    { id: 'staff', label: 'Staff Allocation', icon: Users },
    { id: 'equipment', label: 'Equipment Tracking', icon: Cpu },
    { id: 'recommendations', label: 'AI Recommendations', icon: BrainCircuit, badge: pendingRecsCount > 0 ? pendingRecsCount : undefined, badgeColor: 'bg-teal-500 text-white' },
    { id: 'alerts', label: 'Alerts & Surge', icon: AlertTriangle, badge: activeAlertsCount > 0 ? activeAlertsCount : undefined, badgeColor: 'bg-red-500 text-white' },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Audit', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 hidden md:block bg-slate-50/70 dark:bg-slate-900/50 border-r border-slate-200/80 dark:border-slate-800 p-4 transition-colors">
      <div className="flex flex-col h-full justify-between">
        <div className="space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Operations Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                  <span>{item.label}</span>
                </div>
                {item.highlightBadge && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                    {item.highlightBadge}
                  </span>
                )}
                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* System Technical Footprint (Understated as requested) */}
        <div className="mt-8 p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold mb-1">
            <Shield className="w-3.5 h-3.5 text-teal-500" />
            <span>AI-HRO Core v2.5</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Persistent SQLite • Diurnal EWMA • Deterministic Constraint Optimizer
          </p>
        </div>
      </div>
    </aside>
  );
};
