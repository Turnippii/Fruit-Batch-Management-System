import { createContext, useContext, useMemo, useState } from 'react';

export type Role = 'grower' | 'retailer';

export interface Session {
  email: string;
  name: string;
  role: Role;
  orgName: string;
}

interface SessionContextValue {
  session: Session | null;
  login: (session: Session) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      login: (next) => setSession(next),
      logout: () => setSession(null),
    }),
    [session]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession phải được gọi bên trong SessionProvider');
  return ctx;
}
