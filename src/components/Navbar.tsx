import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sparkles,
  Moon,
  Sun,
  Bell,
  Activity,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  UserPlus,
  LogIn,
  LogOut,
  Info
} from 'lucide-react';
import { Alert } from '../types';

interface NavbarProps {
  onOpenAssistant: () => void;
  onOpenLogin: () => void;
  activeAlerts: Alert[];
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAssistant,
  onOpenLogin,
  activeAlerts,
  onNavigate,
}) => {
  const { user, logout, switchDemoUser, demoUsers } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Academic Prototype Indicator */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onNavigate('overview')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {/* Lotus Emblem Icon matching photo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 via-teal-800 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform border border-teal-400/30 relative overflow-hidden">
              <span className="text-xl select-none" role="img" aria-label="Lotus">🪷</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base leading-tight">
                  LOTUS <span className="text-teal-600 dark:text-teal-400 font-bold">DIAGNOSTIC & SKIN CLINIC</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700/60 uppercase tracking-wide">
                  JAMMIKUNTA
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Karimnagar District, Telangana • Dr. Ravikanti Murali & Dr. Sindhu Ravikanti
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-[11px] font-medium border border-teal-200/80 dark:border-teal-800/40">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span className="font-mono font-semibold">IST: {new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST</span>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-medium border border-amber-200/80 dark:border-amber-800/40">
            <Info className="w-3.5 h-3.5" />
            <span>Academic Demonstration • Simulated Data</span>
          </div>
        </div>

        {/* Right Action Tools: Copilot, Alerts, Theme, User Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Ask Gemini AI Copilot */}
          <button
            onClick={onOpenAssistant}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/10 hover:from-teal-500/20 hover:to-indigo-500/20 border border-teal-500/30 dark:border-teal-400/20 text-slate-800 dark:text-teal-300 font-semibold text-xs transition-all shadow-sm group"
            title="Ask AI Operations Assistant"
          >
            <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-pulse" />
            <span className="hidden sm:inline">Ask AI Copilot</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-bold">
              3.8 Flash
            </span>
          </button>

          {/* Alerts Bell */}
          <div className="relative">
            <button
              onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Hospital Alerts"
              aria-label="Hospital Alerts"
            >
              <Bell className="w-5 h-5" />
              {activeAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  {activeAlerts.length}
                </span>
              )}
            </button>

            {showAlertsDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Active Operational Alerts</span>
                  <button
                    onClick={() => {
                      setShowAlertsDropdown(false);
                      onNavigate('alerts');
                    }}
                    className="text-[11px] font-semibold text-teal-600 hover:underline"
                  >
                    View All
                  </button>
                </div>
                {activeAlerts.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No active critical alerts.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activeAlerts.slice(0, 4).map((alt) => (
                      <div
                        key={alt.id}
                        onClick={() => {
                          setShowAlertsDropdown(false);
                          onNavigate('alerts');
                        }}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                      >
                        <div className="flex items-center justify-between font-semibold">
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
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {alt.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          {/* User Account / Demo Role Switcher */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors border border-slate-200 dark:border-slate-700 text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {user.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-medium">
                    {user.role.replace('_', ' ')}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-semibold shadow hover:bg-teal-700 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
            )}

            {/* Role Switcher & Account Menu */}
            {showRoleMenu && user && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                    Role: {user.role.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="py-2">
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Demo Role
                  </p>
                  {demoUsers.map((d) => (
                    <button
                      key={d.email}
                      onClick={() => {
                        switchDemoUser(d.role);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        user.email === d.email ? 'font-bold text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div>{d.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{d.dept}</div>
                      </div>
                      {user.email === d.email && <ShieldCheck className="w-4 h-4 text-teal-500" />}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      onOpenLogin();
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Create New Account / Sign In</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setShowRoleMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
