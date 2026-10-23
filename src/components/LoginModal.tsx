import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LogIn, UserPlus, X, Shield, Lock, Mail, User, Building2, Check } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, register, demoUsers, switchDemoUser } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('operations_staff');
  const [department, setDepartment] = useState('Emergency Medicine');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name || !email || !password) {
          setError('Please fill in all required fields.');
          setLoading(false);
          return;
        }
        const success = await register(name, email, password, role, department);
        if (success) {
          onClose();
        } else {
          setError('Failed to create account. Email may already be registered.');
        }
      } else {
        if (!email) {
          setError('Please enter your email.');
          setLoading(false);
          return;
        }
        const success = await login(email, password);
        if (success) {
          onClose();
        } else {
          setError('Invalid email or password. Default demo password is "hospital123".');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isRegister ? 'Create Hospital Account' : 'Sign In to AI-HRO'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isRegister ? 'Register new staff credentials' : 'Enter registered credentials or select demo role'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Fast-Login Strip */}
        {!isRegister && (
          <div className="p-4 bg-slate-50/60 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Instant Demo Access (1-Click)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {demoUsers.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => {
                    switchDemoUser(d.role);
                    onClose();
                  }}
                  className="p-2 text-left rounded-lg bg-white dark:bg-slate-800 hover:border-teal-500 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs group"
                >
                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 line-clamp-1">
                    {d.name}
                  </div>
                  <div className="text-[10px] text-slate-500">{d.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Full Name & Title
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Julian Parker, MD"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@aihro.health"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Password {isRegister ? '' : '(Default: hospital123)'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {isRegister && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="operations_staff">Operations Staff</option>
                  <option value="department_manager">Department Manager</option>
                  <option value="admin">Hospital Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Emergency Medicine">Emergency Medicine</option>
                  <option value="Intensive Care Unit">Intensive Care Unit</option>
                  <option value="General Medicine & Surgery">General Medicine</option>
                  <option value="Pediatrics & Neonatal">Pediatrics</option>
                  <option value="Cardiology">Cardiology</option>
                </select>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-600 dark:text-red-400 text-xs font-semibold p-2 rounded-lg bg-red-50 dark:bg-red-950/40">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>{isRegister ? 'Register Account' : 'Sign In'}</span>
          </button>
        </form>

        {/* Toggle Switch */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
          >
            {isRegister ? 'Already have an account? Sign in' : 'Need a new account? Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};
