import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/axios", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import api from "@/lib/axios";
import { signInPetsAppUser } from "@/features/auth/api/auth.service";

describe("signInPetsAppUser", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it("envía email, password y wallet opcional a /auth/login", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { token: "t", user: { id: "1", email: "a@test.app" } },
    });

    await signInPetsAppUser("  a@test.app  ", "secret", "  wallet123  ");

    expect(api.post).toHaveBeenCalledWith("/auth/login", {
      email: "a@test.app",
      password: "secret",
      walletAddress: "wallet123",
    });
  });

  it("omite walletAddress si viene vacía", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { token: "t", user: { id: "1", email: "a@test.app" } },
    });

    await signInPetsAppUser("a@test.app", "secret", "   ");

    expect(api.post).toHaveBeenCalledWith("/auth/login", {
      email: "a@test.app",
      password: "secret",
    });
  });
});

describe("registerPetsAppUser", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it("normaliza email y wallet en POST /auth/register", async () => {
    const { registerPetsAppUser } = await import(
      "@/features/auth/api/auth.service"
    );
    vi.mocked(api.post).mockResolvedValue({
      data: { token: "t", user: { id: "1", email: "n@test.app" } },
    });

    await registerPetsAppUser({
      email: "  n@test.app ",
      password: "123456",
      fullName: "  Nombre ",
      country: " Bolivia ",
      walletAddress: "  wallet ",
    });

    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      email: "n@test.app",
      password: "123456",
      fullName: "Nombre",
      country: "Bolivia",
      walletAddress: "wallet",
    });
  });
});
