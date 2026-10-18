import { describe, expect, it } from "vitest";
import { pollarDisplayName } from "@/features/pollar/pollar-display-name";

describe("pollarDisplayName", () => {
  it("prefers full name, then email local-part, then short address", () => {
    expect(
      pollarDisplayName(
        { first_name: "Ada", last_name: "Lovelace", mail: "a@x.com" },
        { address: "GABCDEFGHIJKLMNOP" },
      ),
    ).toBe("Ada Lovelace");

    expect(
      pollarDisplayName(
        { first_name: "", last_name: "", mail: "ada@test.app" },
        null,
      ),
    ).toBe("ada");

    expect(
      pollarDisplayName(null, { address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ" }),
    ).toBe("GABC…WXYZ");
  });
});
