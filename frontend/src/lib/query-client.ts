import { QueryClient } from "@tanstack/react-query";

/** Soft defaults until more useQuery call sites exist (#57 / S5). */
export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  });
}
