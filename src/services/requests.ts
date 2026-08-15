import apiInstance from "./instance";

export function getQueryString(
  obj?: Record<string, string | number | boolean>,
) {
  if (!obj || typeof obj !== "object") return "";

  return Object.entries(obj)
    .filter(([, value]) => value != null && value !== "") // Exclude null, undefined, and empty string
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");
}
export const postMethod = async (url: string, payload?: unknown) => {
  const res = await apiInstance.post(url, payload);
  return res;
};

export const getList = async <T = unknown>(
  url: string,
  query?: Record<string, string | number | boolean>,
): Promise<T> => {
  const res = await apiInstance.get(`${url}?${getQueryString(query)}`);
  return res.data.data;
};

export const getMethod = async <T = unknown>(
  url: string,
  id?: string,
): Promise<T> => {
  const readyUrl = id ? `${url}/${id}` : url;
  const res = await apiInstance.get(readyUrl);
  return res.data;
};

export const patchMethod = async (url: string, payload?: unknown) => {
  const res = await apiInstance.patch(url, payload);
  return res;
};

export const deleteMethod = async (url: string, id?: string) => {
  const readyUrl = id ? `${url}/${id}` : url;
  const res = await apiInstance.delete(readyUrl);
  return res;
};

export const putMethod = async (customUrl: string, payload?: unknown) => {
  const res = await apiInstance.put(customUrl, payload);
  return res;
};