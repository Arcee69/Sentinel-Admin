import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface ParticipationValue {
  /** Register version picked on the National page; null means the default published one. */
  versionId: string | null;
  setVersionId: (id: string | null) => void;
}

const ParticipationContext = createContext<ParticipationValue | null>(null);

/**
 * Selection shared by every participation surface. The figures themselves
 * come from the API (hooks/api/useParticipation), so switching register
 * version here re-scopes every page at once.
 */
export function ParticipationProvider({ children }: { children: ReactNode }) {
  const [versionId, setVersionId] = useState<string | null>(null);
  const value = useMemo(() => ({ versionId, setVersionId }), [versionId]);

  return (
    <ParticipationContext.Provider value={value}>{children}</ParticipationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useParticipation(): ParticipationValue {
  const ctx = useContext(ParticipationContext);
  if (!ctx) throw new Error("useParticipation must be used inside <ParticipationProvider>");
  return ctx;
}
