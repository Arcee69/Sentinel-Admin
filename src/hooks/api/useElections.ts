import { useQuery } from "@tanstack/react-query";
import { electionsApi } from "../../services/elections";

/** The catalog changes only when a record is sourced and published. */
const CATALOG_STALE = 10 * 60_000;

export const electionKeys = {
  cycles: ["catalog", "election-cycles"] as const,
  contests: (cycleIds: string[]) => ["catalog", "contests", cycleIds] as const,
  milestones: (cycleIds: string[]) => ["catalog", "milestones", cycleIds] as const,
  candidates: (contestIds: string[]) => ["catalog", "candidates", contestIds] as const,
  parties: ["catalog", "election-parties"] as const,
  districts: ["catalog", "electoral-districts"] as const,
  sources: ["catalog", "reference-sources"] as const,
};

export function useElectionCycles() {
  return useQuery({
    queryKey: electionKeys.cycles,
    queryFn: electionsApi.cycles,
    staleTime: CATALOG_STALE,
  });
}

export function useContests(cycleIds: string[]) {
  return useQuery({
    queryKey: electionKeys.contests(cycleIds),
    queryFn: async () => (await Promise.all(cycleIds.map(electionsApi.contests))).flat(),
    enabled: cycleIds.length > 0,
    staleTime: CATALOG_STALE,
  });
}

export function useMilestones(cycleIds: string[]) {
  return useQuery({
    queryKey: electionKeys.milestones(cycleIds),
    queryFn: async () => (await Promise.all(cycleIds.map(electionsApi.milestones))).flat(),
    enabled: cycleIds.length > 0,
    staleTime: CATALOG_STALE,
  });
}

/** Candidates are listed per contest; this gathers them for every contest shown. */
export function useCandidates(contestIds: string[]) {
  return useQuery({
    queryKey: electionKeys.candidates(contestIds),
    queryFn: async () => (await Promise.all(contestIds.map(electionsApi.candidates))).flat(),
    enabled: contestIds.length > 0,
    staleTime: CATALOG_STALE,
  });
}

export function useParties() {
  return useQuery({
    queryKey: electionKeys.parties,
    queryFn: electionsApi.parties,
    staleTime: CATALOG_STALE,
  });
}

export function useElectoralDistricts() {
  return useQuery({
    queryKey: electionKeys.districts,
    queryFn: electionsApi.districts,
    staleTime: CATALOG_STALE,
  });
}

/** Organization admins currently get 403 here; the Sources tab shows that. */
export function useReferenceSources() {
  return useQuery({
    queryKey: electionKeys.sources,
    queryFn: electionsApi.sources,
    staleTime: CATALOG_STALE,
    meta: { expectForbidden: true },
  });
}
