import { QueryClient } from "@tanstack/react-query";
import { subscribeSession } from "@/stores/auth-session";

export function bindSessionQueryClient(client: QueryClient) {
  return subscribeSession(() => {
    void client.cancelQueries();
    client.clear();
  });
}

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  });
}
