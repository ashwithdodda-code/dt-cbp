import React, { useState, useEffect } from 'react';
import { Department } from '../types';
import {
  BarChart3,
  Download,
  Printer,
  PieChart as PieIcon,
  TrendingUp,
  RefreshCw,
  Users,
  Cpu,
  CheckCircle,
  XCircle,
  Sliders,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface AnalyticsViewProps {
  departments: Department[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ departments }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const exportToCsv = () => {
    if (!data) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Emergency Dept,ICU,MedSurg,Other Wards,Total Admissions\n';

    data.admissionsTrend.forEach((row: any) => {
      csvContent += `${row.date},${row.ed},${row.icu},${row.medsurg},${row.other},${row.total}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AI_HRO_Admissions_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mr-2" />
        <span>Aggregating longitudinal hospital telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Operational Analytics & Clinical Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Historical admissions trajectory, bed distribution, staff utilization, and algorithmic recommendation approval audit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCsv}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Decision Audit Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Clinical Decisions</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{data.summary.totalDecisions}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Approved Actions</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{data.summary.approvalCount}</span>
          <span className="text-[10px] text-slate-400 block">{data.summary.approvalRatePct}% adoption rate</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Human Overrides</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">{data.summary.overrideCount}</span>
          <span className="text-[10px] text-slate-400 block">Tailored allocations</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Rejected Proposals</span>
          <span className="text-xl font-black text-red-600 dark:text-red-400">{data.summary.rejectCount}</span>
          <span className="text-[10px] text-slate-400 block">Declined by staff</span>
        </div>
      </div>

      {/* Charts Grid: Admissions Longitudinal + Bed Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Admissions Trend */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <span>10-Day Historical Admissions Trajectory by Ward</span>
            </h3>
            <span className="text-[11px] text-slate-400">Daily Observations</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.admissionsTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b825" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="ed" name="Emergency (ED)" fill="#ef4444" stackId="a" />
                <Bar dataKey="icu" name="Intensive Care (ICU)" fill="#f59e0b" stackId="a" />
                <Bar dataKey="medsurg" name="MedSurg" fill="#3b82f6" stackId="a" />
                <Bar dataKey="other" name="Other Wards" fill="#10b981" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bed Status Distribution */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-teal-600" />
              <span>Bed Status Census</span>
            </h3>
            <span className="text-[11px] text-slate-400">Live Breakdown</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.bedDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {data.bedDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {data.bedDistribution.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{item.count} beds</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff & Equipment Utilization Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Staff Workload Utilization */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" />
              <span>Nursing Workload Capacity by Department</span>
            </h3>
            <span className="text-[11px] text-slate-400">Current Shift</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.staffWorkload} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b825" />
                <XAxis dataKey="dept" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="assignedLoad" name="Assigned Patient Load" fill="#0d9488" />
                <Bar dataKey="maxCapacity" name="Safe Capacity Limit" fill="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Equipment Utilization */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-teal-600" />
              <span>Biomedical Equipment Deployment Rates</span>
            </h3>
            <span className="text-[11px] text-slate-400">In-Use vs Total</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-64 pr-2 text-xs">
            {data.equipmentUtilization.map((eq: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">{eq.name}</span>
                  <span className="font-mono font-bold text-teal-600">{eq.utilizationPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      eq.utilizationPct > 85 ? 'bg-red-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${eq.utilizationPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{eq.inUse} deployed in patient rooms</span>
                  <span>{eq.available} in central reserve</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
