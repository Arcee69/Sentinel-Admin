import apiInstance from "./instance";
import { API } from "./api";
import { getAllPages, getMethod, postMethod } from "./requests";

export type ApiTaskStatus = "open" | "in_progress" | "completed" | "cancelled";
export type ApiPriority = "high" | "medium" | "low";
export type ApiTaskCategory = "opinion_poll" | "election_report" | "incident_report";

export interface ApiTask {
  id: string;
  organization_id: string;
  campaign_id: string;
  assignment_id: string;
  assigned_membership_id: string;
  geographic_unit_id: string | null;
  title: string;
  instructions: string | null;
  priority: ApiPriority;
  category: ApiTaskCategory | null;
  subject: string | null;
  target_count: number | null;
  status: ApiTaskStatus;
  due_at: string | null;
  completed_at: string | null;
  /** Send back as `expected_revision` on every transition. */
  revision: number;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  actor_membership_id: string | null;
  action: string;
  previous_status: ApiTaskStatus | null;
  new_status: ApiTaskStatus;
  revision: number;
  occurred_at: string;
}

export type CollectionMethod = "rally" | "door_to_door" | "town_hall" | "media" | "distribution";

export interface ApiFieldReport {
  id: string;
  organization_id: string;
  campaign_id: string;
  assignment_id: string;
  author_membership_id: string;
  task_id: string | null;
  geographic_unit_id: string | null;
  activity_type: string;
  collection_method: CollectionMethod | null;
  people_reached: number | null;
  narrative: string;
  observed_at: string;
  received_at: string;
  client_submission_id: string;
}

/**
 * A file an agent attached to a report or incident. It can only be
 * downloaded once the scanner marks it clean and a reviewer approves it.
 */
export interface MediaEvidence {
  id: string;
  campaign_id: string;
  uploaded_by_membership_id: string;
  incident_id: string | null;
  field_report_id: string | null;
  polling_report_id: string | null;
  original_filename: string;
  media_type: string;
  byte_size: number;
  scan_state: string;
  review_state: string;
  review_reason: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  organization_id: string;
  campaign_id: string;
  agent_membership_id: string;
  geography_version_id: string;
  geographic_unit_id: string;
  duty: string;
  starts_at: string;
  /** Null while the assignment is active. */
  ends_at: string | null;
}

export interface CreateTaskPayload {
  assignment_id: string;
  title: string;
  priority: ApiPriority;
  category?: ApiTaskCategory;
  subject?: string;
  instructions?: string;
  target_count?: number;
  /** ISO timestamp with an offset. */
  due_at?: string;
}

export const operationsApi = {
  tasks: (campaignId: string) => getAllPages<ApiTask>(API.campaign.tasks(campaignId)),
  createTask: (campaignId: string, payload: CreateTaskPayload) =>
    postMethod<ApiTask>(API.campaign.tasks(campaignId), payload),
  task: (taskId: string) => getMethod<ApiTask>(API.task.show(taskId)),
  cancelTask: (taskId: string, expectedRevision: number) =>
    postMethod<ApiTask>(API.task.cancel(taskId), { expected_revision: expectedRevision }),
  taskEvents: (taskId: string) => getAllPages<TaskEvent>(API.task.events(taskId)),
  fieldReports: (campaignId: string) =>
    getAllPages<ApiFieldReport>(API.campaign.fieldReports(campaignId)),
  assignments: (campaignId: string) =>
    getAllPages<Assignment>(API.campaign.assignments(campaignId)),
  media: (campaignId: string) => getAllPages<MediaEvidence>(API.campaign.media(campaignId)),
  /** A short-lived signed URL; refused until the file is scanned clean and approved. */
  mediaDownloadLink: (mediaId: string) =>
    getMethod<{ url: string; expires_at: string }>(API.media.downloadLink(mediaId)),
  downloadMedia: async (url: string) => {
    const res = await apiInstance.get<Blob>(url, { responseType: "blob" });
    return res.data;
  },
};
