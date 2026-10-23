import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole, department: string) => Promise<boolean>;
  logout: () => void;
  switchDemoUser: (role: UserRole) => void;
  canApprove: boolean;
  canOverride: boolean;
  canEditSettings: boolean;
  demoUsers: Array<{ label: string; email: string; role: UserRole; name: string; dept: string }>;
}

const DEMO_USERS = [
  {
    label: 'Hospital Administrator',
    email: 'admin@aihro.health',
    role: 'admin' as UserRole,
    name: 'Dr. Sarah Lin',
    dept: 'Hospital Administration',
  },
  {
    label: 'ED Department Director',
    email: 'manager.ed@aihro.health',
    role: 'department_manager' as UserRole,
    name: 'Marcus Vance, RN',
    dept: 'Emergency Medicine',
  },
  {
    label: 'ICU Critical Care Lead',
    email: 'manager.icu@aihro.health',
    role: 'department_manager' as UserRole,
    name: 'Dr. Elena Rostova',
    dept: 'Intensive Care Unit',
  },
  {
    label: 'Bed & Flow Coordinator',
    email: 'ops@aihro.health',
    role: 'operations_staff' as UserRole,
    name: 'David Chen',
    dept: 'Operations Command Center',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('aihro_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    // Default active demo user: Hospital Administrator
    return {
      id: 'usr_admin_1',
      email: DEMO_USERS[0].email,
      name: DEMO_USERS[0].name,
      role: DEMO_USERS[0].role,
      department: DEMO_USERS[0].dept,
    };
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('aihro_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('aihro_user');
    }
  }, [user]);

  const login = async (email: string, password: string = 'hospital123'): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    department: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, department }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Registration error:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const switchDemoUser = (role: UserRole) => {
    const target = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    setUser({
      id: `usr_${target.role}_demo`,
      email: target.email,
      name: target.name,
      role: target.role,
      department: target.dept,
    });
  };

  const canApprove = user?.role === 'admin' || user?.role === 'department_manager';
  const canOverride = user?.role === 'admin' || user?.role === 'department_manager';
  const canEditSettings = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        switchDemoUser,
        canApprove,
        canOverride,
        canEditSettings,
        demoUsers: DEMO_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
