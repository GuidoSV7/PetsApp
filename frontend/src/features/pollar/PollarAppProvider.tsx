"use client";

import type { ReactNode } from "react";
import { PollarProvider } from "@pollar/react";
import "@pollar/react/styles.css";
import {
  isPollarConfigured,
  pollarNetwork,
  pollarPublishableKey,
} from "@/features/pollar/pollar-config";

/** Wraps the tree with Pollar when a publishable key is present. */
export function PollarAppProvider({ children }: { children: ReactNode }) {
  if (!isPollarConfigured()) {
    return children;
  }

  return (
    <PollarProvider
      client={{
        apiKey: pollarPublishableKey(),
        stellarNetwork: pollarNetwork(),
        logLevel: "warn",
      }}
    >
      {children}
    </PollarProvider>
  );
}
