"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createAppQueryClient } from "@/lib/query-client";
import { PollarAppProvider } from "@/features/pollar/PollarAppProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(createAppQueryClient);
  return (
    <QueryClientProvider client={client}>
      <PollarAppProvider>{children}</PollarAppProvider>
    </QueryClientProvider>
  );
}
