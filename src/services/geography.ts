import { API } from "./api";
import { getList } from "./requests";

export type GeoUnitKind = "country" | "state" | "lga" | "ward" | "polling_unit" | (string & {});

export interface GeoUnit {
  id: string;
  geography_version_id: string;
  parent_id: string | null;
  kind: GeoUnitKind;
  official_code: string;
  name: string;
}

export const geographyApi = {
  /**
   * One level of the hierarchy. With no `parent_id` the API returns the
   * root units (the country); pass a unit's ID to list its children.
   */
  units: (versionId: string, query?: { parent_id?: string; kind?: GeoUnitKind; page?: number }) =>
    getList<GeoUnit>(API.geography.units(versionId), query),
};
