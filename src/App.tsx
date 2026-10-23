/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { GeminiAssistantModal } from './components/GeminiAssistantModal';
import { ApprovalModal } from './components/ApprovalModal';
import { LoginModal } from './components/LoginModal';

// Views
import { OverviewView } from './views/OverviewView';
import { Hospital3DViewPage } from './views/Hospital3DViewPage';
import { ForecastingView } from './views/ForecastingView';
import { BedManagementView } from './views/BedManagementView';
import { StaffAllocationView } from './views/StaffAllocationView';
import { EquipmentView } from './views/EquipmentView';
import { RecommendationsView } from './views/RecommendationsView';
import { AlertsView } from './views/AlertsView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';

import { Department, KpiData, Recommendation, Alert } from './types';
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
  Settings as SettingsIcon,
  RefreshCw
} from 'lucide-react';

function MainApp() {
  const [currentView, setCurrentView] = useState<string>('overview');
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pendingRecs, setPendingRecs] = useState<Recommendation[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [approvalRec, setApprovalRec] = useState<Recommendation | null>(null);

  const fetchOverviewData = async () => {
    try {
      const res = await fetch('/api/overview');
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setDepartments(data.departments);
        setPendingRecs(data.pendingRecommendations || []);
        setRecentAlerts(data.recentAlerts || []);
      }
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-teal-500 selection:text-white transition-colors">
      {/* Top Navigation */}
      <Navbar
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        activeAlerts={recentAlerts}
        onNavigate={(v) => setCurrentView(v)}
      />

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentView={currentView}
          onNavigate={(v) => setCurrentView(v)}
          pendingRecsCount={pendingRecs.length}
          activeAlertsCount={recentAlerts.length}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {loading && !kpis ? (
            <div className="flex flex-col items-center justify-center h-80 text-slate-500 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
              <p className="text-xs font-semibold">Connecting to AI-HRO Hospital Telemetry...</p>
            </div>
          ) : (
            <>
              {currentView === 'overview' && (
                <OverviewView
                  kpis={kpis}
                  departments={departments}
                  pendingRecommendations={pendingRecs}
                  recentAlerts={recentAlerts}
                  onNavigate={(v) => setCurrentView(v)}
                  onOpenApproval={(r) => setApprovalRec(r)}
                  onRefresh={fetchOverviewData}
                />
              )}

              {currentView === '3d-twin' && (
                <Hospital3DViewPage
                  departments={departments}
                  onNavigate={(v) => setCurrentView(v)}
                />
              )}

              {currentView === 'forecasting' && (
                <ForecastingView departments={departments} />
              )}

              {currentView === 'beds' && (
                <BedManagementView
                  departments={departments}
                  onRefreshData={fetchOverviewData}
                />
              )}

              {currentView === 'staff' && (
                <StaffAllocationView
                  departments={departments}
                  onRefreshData={fetchOverviewData}
                />
              )}

              {currentView === 'equipment' && (
                <EquipmentView
                  departments={departments}
                  onRefreshData={fetchOverviewData}
                />
              )}

              {currentView === 'recommendations' && (
                <RecommendationsView
                  departments={departments}
                  onOpenApproval={(r) => setApprovalRec(r)}
                  onRefreshData={fetchOverviewData}
                />
              )}

              {currentView === 'alerts' && (
                <AlertsView
                  departments={departments}
                  onRefreshData={fetchOverviewData}
                />
              )}

              {currentView === 'analytics' && (
                <AnalyticsView departments={departments} />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  departments={departments}
                  onOpenLogin={() => setIsLoginOpen(true)}
                  onRefreshData={fetchOverviewData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (below md breakpoint) */}
      <div className="md:hidden sticky bottom-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around text-[10px]">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: '3d-twin', label: '3D Twin', icon: Box },
          { id: 'forecasting', label: 'Demand', icon: TrendingUp },
          { id: 'beds', label: 'Beds', icon: BedDouble },
          { id: 'staff', label: 'Staff', icon: Users },
          { id: 'equipment', label: 'Equip', icon: Cpu },
          { id: 'recommendations', label: 'AI Recs', icon: BrainCircuit },
        ].map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center py-1 px-2 rounded-lg transition-colors ${
                active ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Global Modals */}
      <GeminiAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />

      <ApprovalModal
        recommendation={approvalRec}
        isOpen={!!approvalRec}
        onClose={() => setApprovalRec(null)}
        onSuccess={() => fetchOverviewData()}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
