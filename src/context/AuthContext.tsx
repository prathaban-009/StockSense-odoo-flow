import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { api, getStoredToken, setStoredToken } from '../services/api.ts';
import { User, UserRole } from '../types.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  requestOtp: (email: string) => Promise<{ success: boolean; message: string; testOtpCode?: string }>;
  verifyOtpResetPassword: (email: string, otpCode: string, newPass: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);

  // Auto-authenticate on load if stored token exists; otherwise user stays null to display the full-screen login gate
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (res.user) {
            setUser(res.user);
            setLoading(false);
            return;
          }
        } catch (_err) {
          // Token expired or invalid
          setStoredToken(null);
          setToken(null);
        }
      }

      // Mandatory full-screen login first
      setUser(null);
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      setToken(res.token);
      setStoredToken(res.token);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole = 'Inventory Manager') => {
    setLoading(true);
    try {
      const res = await api.register({ name, email, password, role });
      setUser(res.user);
      setToken(res.token);
      setStoredToken(res.token);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      const res = await api.firebaseSync(idToken);
      setUser(res.user);
      setToken(res.token);
      setStoredToken(res.token);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setStoredToken(null);
  };

  const switchRole = (newRole: UserRole) => {
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  const requestOtp = async (email: string) => {
    return await api.requestOtp(email);
  };

  const verifyOtpResetPassword = async (email: string, otpCode: string, newPassword: string) => {
    return await api.verifyOtpResetPassword({ email, otpCode, newPassword });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        switchRole,
        requestOtp,
        verifyOtpResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
