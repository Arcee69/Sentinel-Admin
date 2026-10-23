import type { AxiosRequestConfig } from "axios";
import apiInstance from "./instance";

/** Every ordinary JSON response: `{success, message, data, meta}`. */
export interface ApiEnvelope<T, M = Record<string, unknown>> {
  success: boolean;
  message: string;
  data: T;
  meta: M;
}

/** `meta` on paginated list routes. */
export interface PageMeta {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
  next_cursor?: string | null;
  prev_cursor?: string | null;
  [key: string]: unknown;
}

export type Query = Record<string, string | number | boolean | null | undefined>;

/** Drops null, undefined and empty-string values so they never reach the URL. */
export function cleanQuery(obj?: Query) {
  if (!obj || typeof obj !== "object") return undefined;
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value != null && value !== ""),
  );
}

export function getQueryString(obj?: Query) {
  const clean = cleanQuery(obj);
  if (!clean) return "";
  return Object.entries(clean)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

export const getMethod = async <T = unknown, M = Record<string, unknown>>(
  url: string,
  query?: Query,
  config?: AxiosRequestConfig,
): Promise<ApiEnvelope<T, M>> => {
  const res = await apiInstance.get<ApiEnvelope<T, M>>(url, {
    ...config,
    params: cleanQuery(query),
  });
  return res.data;
};

export const getList = <T = unknown>(url: string, query?: Query, config?: AxiosRequestConfig) =>
  getMethod<T[], PageMeta>(url, query, config);

export const postMethod = async <T = unknown>(
  url: string,
  payload?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiEnvelope<T>> => {
  const res = await apiInstance.post<ApiEnvelope<T>>(url, payload, config);
  return res.data;
};

export const patchMethod = async <T = unknown>(
  url: string,
  payload?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiEnvelope<T>> => {
  const res = await apiInstance.patch<ApiEnvelope<T>>(url, payload, config);
  return res.data;
};

export const putMethod = async <T = unknown>(
  url: string,
  payload?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiEnvelope<T>> => {
  const res = await apiInstance.put<ApiEnvelope<T>>(url, payload, config);
  return res.data;
};

export const deleteMethod = async <T = unknown>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiEnvelope<T>> => {
  const res = await apiInstance.delete<ApiEnvelope<T>>(url, config);
  return res.data;
};
