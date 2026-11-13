import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { electionsApi, type Contest } from "../../services/elections";

/** The catalog changes only when a record is sourced and published. */
const CATALOG_STALE = 10 * 60_000;

/** Largest page the contests list serves. */
const CONTESTS_MAX_PAGE = 100;
/** Pages of the full race list requested at once. */
const ALL_CONTESTS_CONCURRENCY = 3;

export const electionKeys = {
  cycles: ["catalog", "election-cycles"] as const,
  contests: (cycleIds: string[]) => ["catalog", "contests", cycleIds] as const,
  contestsPage: (page: number, perPage: number) =>
    ["catalog", "contests-page", perPage, page] as const,
  allContests: ["catalog", "contests-all"] as const,
  milestones: (cycleIds: string[]) => ["catalog", "milestones", cycleIds] as const,
  candidatesPage: (page: number, perPage: number) =>
    ["catalog", "candidates-page", perPage, page] as const,
  parties: ["catalog", "election-parties"] as const,
  districtCount: ["catalog", "electoral-districts", "count"] as const,
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

/** One page of races: a single request per page shown. */
export function useContestsPage(page: number, perPage: number, enabled = true) {
  return useQuery({
    queryKey: electionKeys.contestsPage(page, perPage),
    queryFn: () => electionsApi.contestsPage(page, perPage),
    enabled,
    staleTime: CATALOG_STALE,
    placeholderData: keepPreviousData,
  });
}

/**
 * Every race. The contests list has no search or filters, so searching,
 * filtering and exporting need the whole list; it is fetched in the largest
 * pages the API serves, a few at a time, and only when one of those is used.
 */
export async function fetchAllContests(): Promise<Contest[]> {
  const first = await electionsApi.contestsPage(1, CONTESTS_MAX_PAGE);
  const last = Number(first.meta?.last_page ?? 1);
  const pages: Contest[][] = [first.data];
  let next = 2;
  async function worker() {
    while (next <= last) {
      const page = next++;
      pages[page - 1] = (await electionsApi.contestsPage(page, CONTESTS_MAX_PAGE)).data;
    }
  }
  await Promise.all(Array.from({ length: ALL_CONTESTS_CONCURRENCY }, worker));
  return pages.flat();
}

export const allContestsQuery = {
  queryKey: electionKeys.allContests,
  queryFn: fetchAllContests,
  staleTime: CATALOG_STALE,
};

export function useAllContests(enabled: boolean) {
  return useQuery({ ...allContestsQuery, enabled });
}

export function useMilestones(cycleIds: string[]) {
  return useQuery({
    queryKey: electionKeys.milestones(cycleIds),
    queryFn: async () => (await Promise.all(cycleIds.map(electionsApi.milestones))).flat(),
    enabled: cycleIds.length > 0,
    staleTime: CATALOG_STALE,
  });
}

/** One page of candidates across every race, with race and party embedded. */
export function useCandidatesPage(page: number, perPage: number, enabled = true) {
  return useQuery({
    queryKey: electionKeys.candidatesPage(page, perPage),
    queryFn: () => electionsApi.candidatesPage(page, perPage),
    enabled,
    staleTime: CATALOG_STALE,
    placeholderData: keepPreviousData,
  });
}

export function useParties(enabled = true) {
  return useQuery({
    queryKey: electionKeys.parties,
    queryFn: electionsApi.parties,
    enabled,
    staleTime: CATALOG_STALE,
  });
}

export function useDistrictCount() {
  return useQuery({
    queryKey: electionKeys.districtCount,
    queryFn: electionsApi.districtCount,
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
