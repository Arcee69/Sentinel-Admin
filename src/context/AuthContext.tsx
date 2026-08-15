import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { CURRENT_USER } from "../lib/data";

const STORAGE_KEY = "sentinel.session";

interface SessionUser {
  name: string;
  initials: string;
  role: string;
  email: string;
}

interface AuthValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  signIn: (email: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function readStoredSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readStoredSession);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      signIn: (email: string) => {
        // No API yet — the demo session is the fixed national-admin profile.
        const next = { ...CURRENT_USER, email: email || CURRENT_USER.email };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setUser(next);
      },
      signOut: () => {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
