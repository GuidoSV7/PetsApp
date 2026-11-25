import { describe, expect, it } from "vitest";
import { createAppQueryClient } from "@/lib/query-client";

describe("createAppQueryClient defaults (#57 / S5)", () => {
  it("uses a soft staleTime and a reasonable gcTime", () => {
    const client = createAppQueryClient();
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(30_000);
    expect(defaults?.gcTime).toBe(5 * 60_000);
    expect(defaults?.retry).toBe(1);
  });
});
