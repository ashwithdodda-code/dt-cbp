import React, { useState } from 'react';
import { Department } from '../types';
import { Hospital3DView } from '../components/Hospital3DView';
import { Box, Layers, Activity, Users, BedDouble, AlertCircle, Eye, ArrowRight } from 'lucide-react';

interface Hospital3DViewPageProps {
  departments: Department[];
  onNavigate: (view: string) => void;
}

export const Hospital3DViewPage: React.FC<Hospital3DViewPageProps> = ({ departments, onNavigate }) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  const activeDept = departments.find((d) => d.id === selectedDeptId) || departments[0];

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hospital 3D Digital Twin
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300">
              WebGL Accelerated
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time spatial visualization of hospital pavilions, patient transfer skyways, and dynamic ward occupancy heatmaps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('beds')}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <BedDouble className="w-3.5 h-3.5" />
            <span>Open Bed Matrix</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Hospital3DView
            departments={departments}
            selectedDeptId={selectedDeptId}
            onSelectDepartment={(id) => setSelectedDeptId(id)}
            heightClass="h-[520px]"
          />
        </div>

        {/* Right Ward Inspector Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeDept?.color }} />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {activeDept?.name}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {activeDept?.code}
              </span>
            </div>

            {/* Capacity KPI */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-500 block text-[11px]">Current Occupancy</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {activeDept?.occupancyPct}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {activeDept?.occupiedBeds} / {activeDept?.total_beds} beds
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-500 block text-[11px]">Available Beds</span>
                <span className="text-xl font-black text-teal-600 dark:text-teal-400">
                  {activeDept?.availableBeds}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Ready for intake</span>
              </div>
            </div>

            {/* Operational Thresholds */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Surge Threshold Limit:</span>
                <span className="font-bold">{activeDept?.surge_threshold_pct}%</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Active Nursing Roster:</span>
                <span className="font-bold">{activeDept?.onDutyStaff || 4} On-Duty</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>12h Projected Inflow:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">+{activeDept?.predicted12h || 0} patients</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-2">
              <button
                onClick={() => onNavigate('beds')}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Filter Ward Beds in Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate('forecasting')}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
              >
                Inspect Demand Forecast
              </button>
            </div>
          </div>

          {/* Quick Department Selectors */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Select Pavilion to Orbit
            </span>
            <div className="flex flex-wrap gap-1.5">
              {departments.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDeptId(d.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    (selectedDeptId === d.id || (!selectedDeptId && d.code === 'ED'))
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {d.name.split(' ')[0]} ({d.code})
                </button>
              ))}
            </div>
          </div>

          {/* Physical Facility Architecture vs Digital Twin Card */}
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-black via-slate-950 to-zinc-950 border border-slate-800 text-white shadow-xl text-xs space-y-3 p-4">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Physical Facility Architecture</span>
            </div>

            <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-700/80 relative">
              <img
                src="/assets/aistudio/file_00000000200482118613bf59a05df0cd_d3602e18.png"
                alt="Lotus Diagnostic Centre & Skin Clinic Jammikunta Facade"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-2 left-2.5 right-2.5">
                <span className="text-[11px] font-extrabold text-white block">LOTUS DIAGNOSTIC CENTRE & SKIN CLINIC</span>
                <span className="text-[10px] text-slate-300 block">Main Road • Jammikunta, Telangana</span>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] pt-1">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <strong className="text-teal-400 block font-bold">Ground Floor: Lotus Diagnostic Centre</strong>
                <span className="text-slate-300">128-Slice CT Scan, Color Doppler USG, Digital X-Ray, Casualty Triage, Sample Collection & Pharmacy</span>
              </div>
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <strong className="text-pink-400 block font-bold">First Floor: Lotus Skin Clinic</strong>
                <span className="text-slate-300">Dr. Sindhu Ravikanti OPD Consults, Phototherapy Laser Chamber, Skin Biopsy & Daycare Beds</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
