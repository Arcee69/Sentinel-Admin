import apiInstance from "./instance";
import { API } from "./api";
import { getAllPages } from "./requests";

export interface ElectionCycle {
  id: string;
  reference_source_id: string;
  official_code: string;
  name: string;
  year: number;
  status: string;
  published_at: string | null;
}

export type OfficeType =
  | "presidential"
  | "senate"
  | "house_of_representatives"
  | "governor"
  | "state_assembly"
  | "chairman"
  | "councillor"
  | (string & {});

export interface Contest {
  id: string;
  election_cycle_id: string;
  geography_version_id: string;
  electoral_district_id: string;
  reference_source_id: string;
  office_type: OfficeType;
  name: string;
  election_date: string | null;
  incumbent_name: string | null;
  registered_count: number | null;
  status: string;
}

export interface ElectoralDistrict {
  id: string;
  geography_version_id: string;
  reference_source_id: string;
  office_type: OfficeType;
  official_code: string;
  name: string;
  status: string;
  published_at: string | null;
}

export interface ElectionParty {
  id: string;
  reference_source_id: string;
  /** The party's short code, e.g. "APC". */
  official_code: string;
  name: string;
  ideology: string | null;
  founded_year: number | null;
  coverage: "national" | "regional" | (string & {}) | null;
}

export interface ContestCandidate {
  id: string;
  contest_id: string;
  reference_source_id: string;
  election_party_id: string | null;
  official_code: string;
  name: string;
  age_at_election: number | null;
  home_state_id: string | null;
}

export interface ElectionMilestone {
  id: string;
  election_cycle_id: string;
  reference_source_id: string;
  official_code: string;
  title: string;
  scheduled_on: string;
}

export interface ReferenceSource {
  id: string;
  publisher: string | null;
  title: string;
  kind: string;
  original_filename: string | null;
  sha256: string;
  byte_size: number;
  status: "reviewed" | "pending_review" | (string & {});
  reviewed_at: string | null;
}

export const electionsApi = {
  cycles: () => getAllPages<ElectionCycle>(API.catalog.electionCycles),
  contests: (cycleId: string) =>
    getAllPages<Contest>(API.catalog.contests, { election_cycle_id: cycleId }),
  candidates: (contestId: string) => getAllPages<ContestCandidate>(API.catalog.candidates(contestId)),
  milestones: (cycleId: string) => getAllPages<ElectionMilestone>(API.catalog.milestones(cycleId)),
  parties: () => getAllPages<ElectionParty>(API.catalog.parties),
  districts: () => getAllPages<ElectoralDistrict>(API.catalog.electoralDistricts),
  sources: () => getAllPages<ReferenceSource>(API.catalog.referenceSources),
  /** The original file; a binary response, not the JSON envelope. */
  downloadSource: async (sourceId: string) => {
    const res = await apiInstance.get<Blob>(API.catalog.referenceSourceDownload(sourceId), {
      responseType: "blob",
    });
    return res.data;
  },
};
