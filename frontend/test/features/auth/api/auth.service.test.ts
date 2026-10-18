import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/axios", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import api from "@/lib/axios";
import {
  signInPetsAppUser,
  registerPetsAppUser,
} from "@/features/auth/api/auth.service";

describe("signInPetsAppUser", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it("posts trimmed email and password to /auth/login", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        token: "t",
        user: {
          id: "1",
          name: "Ada",
          email: "a@test.app",
          role: "member",
          roles: ["member"],
          country: null,
        },
      },
    });

    await signInPetsAppUser("  a@test.app  ", "secret");

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

  it("normalizes email, name and country on POST /auth/register", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        token: "t",
        user: {
          id: "1",
          name: "Nombre",
          email: "n@test.app",
          role: "member",
          roles: ["member"],
          country: "BO",
        },
      },
    });

    await registerPetsAppUser({
      email: "  n@test.app ",
      password: "12345678",
      name: "  Nombre ",
      country: " bo ",
    });

    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      email: "n@test.app",
      password: "12345678",
      name: "Nombre",
      country: "BO",
    });
  });

  it("omits country when absent or blank", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        token: "t",
        user: {
          id: "1",
          name: "Nombre",
          email: "n@test.app",
          role: "member",
          roles: ["member"],
          country: null,
        },
      },
    });

    await registerPetsAppUser({
      email: "n@test.app",
      password: "12345678",
      name: "Nombre",
      country: "   ",
    });

    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      email: "n@test.app",
      password: "12345678",
      name: "Nombre",
    });
  });
});
