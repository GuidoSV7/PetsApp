import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPollarConfigured,
  pollarNetwork,
  pollarPublishableKey,
} from "@/features/pollar/pollar-config";

describe("pollar-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is unconfigured without a publishable key", () => {
    vi.stubEnv("NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY", "");
    expect(pollarPublishableKey()).toBe("");
    expect(isPollarConfigured()).toBe(false);
  });

  it("detects a configured key and infers network from prefix", () => {
    vi.stubEnv("NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY", "pub_testnet_abc");
    expect(isPollarConfigured()).toBe(true);
    expect(pollarNetwork()).toBe("testnet");

    vi.stubEnv("NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY", "pub_mainnet_xyz");
    expect(pollarNetwork()).toBe("mainnet");
  });
});
