"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { bindSessionQueryClient, createAppQueryClient } from "@/lib/query-client";
import { PollarAppProvider } from "@/features/pollar/PollarAppProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(createAppQueryClient);
  useEffect(() => bindSessionQueryClient(client), [client]);
  return (
    <QueryClientProvider client={client}>
      <PollarAppProvider>{children}</PollarAppProvider>
    </QueryClientProvider>
  );
}
