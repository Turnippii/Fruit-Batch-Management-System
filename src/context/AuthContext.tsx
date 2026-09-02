import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { USE_MOCK } from '../config';
import { mockUsers } from '../mocks/users';
import {
  getUserProfile,
  registerUser,
  signIn,
  signOutUser,
  subscribeAuthState,
  type Role,
  type UserProfile,
} from '../services/auth';

export type { Role };

export interface AuthProfile extends UserProfile {
  uid: string;
  email: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  orgName: string;
  role: Role;
}

interface AuthContextValue {
  profile: AuthProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<Role>;
  register: (input: RegisterInput) => Promise<Role>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  // Mock mode không có phiên nào để khôi phục lúc mở app — khỏi cần màn chờ.
  const [loading, setLoading] = useState(!USE_MOCK);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (USE_MOCK) return;
    // Bắt phiên đăng nhập cũ (AsyncStorage persistence) khi mở lại app — điều
    // hướng theo vai trò ở app/index.tsx dựa trên profile này.
    const unsubscribe = subscribeAuthState(async (user) => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const userProfile = await getUserProfile(user.uid);
        if (!userProfile) {
          setError('Tài khoản chưa có hồ sơ vai trò trong users/{uid} — liên hệ quản trị viên.');
          setProfile(null);
        } else {
          setProfile({ uid: user.uid, email: user.email ?? '', ...userProfile });
          setError(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không đọc được hồ sơ người dùng.');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      error,

      async login(email, password) {
        setError(null);
        if (USE_MOCK) {
          const found = mockUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
          if (!found) {
            const message = `Tài khoản demo không tồn tại. Dùng ${mockUsers.map((u) => u.email).join(' hoặc ')}.`;
            setError(message);
            throw new Error(message);
          }
          const nextProfile: AuthProfile = {
            uid: `mock-${found.role}`,
            email: found.email,
            role: found.role,
            name: found.name,
            orgName: found.orgName,
          };
          setProfile(nextProfile);
          return nextProfile.role;
        }

        try {
          const user = await signIn(email, password);
          const userProfile = await getUserProfile(user.uid);
          if (!userProfile) {
            const message = 'Tài khoản chưa có hồ sơ vai trò trong users/{uid} — liên hệ quản trị viên.';
            setError(message);
            throw new Error(message);
          }
          setProfile({ uid: user.uid, email: user.email ?? email, ...userProfile });
          return userProfile.role;
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Đăng nhập thất bại.';
          setError(message);
          throw e instanceof Error ? e : new Error(message);
        }
      },

      async register(input) {
        setError(null);
        if (USE_MOCK) {
          const nextProfile: AuthProfile = {
            uid: `mock-${input.role}-${Date.now()}`,
            email: input.email,
            role: input.role,
            name: input.name,
            orgName: input.orgName,
          };
          setProfile(nextProfile);
          return nextProfile.role;
        }

        try {
          const user = await registerUser(input);
          setProfile({ uid: user.uid, email: user.email ?? input.email, role: input.role, name: input.name, orgName: input.orgName });
          return input.role;
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Đăng ký thất bại.';
          setError(message);
          throw e instanceof Error ? e : new Error(message);
        }
      },

      async logout() {
        setProfile(null);
        if (!USE_MOCK) await signOutUser();
      },
    }),
    [profile, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được gọi bên trong AuthProvider');
  return ctx;
}
