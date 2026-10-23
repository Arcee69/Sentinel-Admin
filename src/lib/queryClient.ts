import { MutationCache, QueryCache, QueryClient, type QueryKey } from "@tanstack/react-query";
import { toApiError } from "../services/errors";

/** Query-key roots, so invalidation stays consistent across screens. */
export const queryKeys = {
  authContext: ["auth", "context"] as const,
  me: ["auth", "me"] as const,
};

/**
 * A 403 means the user's grants changed under them: refresh `/auth/context`
 * so navigation and action flags catch up (frontend-integration-guide.md).
 */
function refreshAccessOn403(error: unknown, key?: QueryKey) {
  if (!toApiError(error).isForbidden) return;
  const isContext = key?.[0] === queryKeys.authContext[0] && key?.[1] === queryKeys.authContext[1];
  if (isContext) return;
  void queryClient.invalidateQueries({ queryKey: queryKeys.authContext });
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => refreshAccessOn403(error, query.queryKey),
  }),
  mutationCache: new MutationCache({
    onError: (error) => refreshAccessOn403(error),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retrying a 4xx only repeats the same refusal; retry network/5xx once.
      retry: (failureCount, error) => {
        const { status } = toApiError(error);
        if (status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
