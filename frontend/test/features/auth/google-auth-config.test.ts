import { afterEach, describe, expect, it, vi } from "vitest";
import {
  googleClientId,
  isGoogleSignInConfigured,
} from "@/features/auth/google-auth-config";

describe("google-auth-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is unconfigured without a client id", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    expect(googleClientId()).toBe("");
    expect(isGoogleSignInConfigured()).toBe(false);
  });

  it("detects a configured client id", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
      "123.apps.googleusercontent.com",
    );
    expect(isGoogleSignInConfigured()).toBe(true);
    expect(googleClientId()).toBe("123.apps.googleusercontent.com");
  });
});
