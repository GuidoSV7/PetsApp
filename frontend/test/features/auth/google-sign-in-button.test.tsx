/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/features/auth/google-auth-config", () => ({
  googleClientId: () => mockClientId,
  isGoogleSignInConfigured: () => mockClientId.length > 0,
}));

let mockClientId = "";

import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    mockClientId = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a gray Próximamente Google button when client id is missing", () => {
    render(<GoogleSignInButton onCredential={vi.fn()} />);

    const button = screen.getByRole("button", { name: /Próximamente/i });
    expect(button).toBeTruthy();
    expect(button).toHaveProperty("disabled", true);
    expect(screen.getByLabelText(/Google/i)).toBeTruthy();
    expect(screen.queryByText(/NEXT_PUBLIC_GOOGLE_CLIENT_ID/i)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mounts the GIS host when a client id is configured", () => {
    mockClientId = "client.apps.googleusercontent.com";
    render(<GoogleSignInButton onCredential={vi.fn()} />);

    expect(screen.getByLabelText("Continuar con Google")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Próximamente/i })).toBeNull();
  });
});
