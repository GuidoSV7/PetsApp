/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/features/auth/google-auth-config", () => ({
  googleClientId: () => mockClientId,
  isGoogleSignInConfigured: () => mockClientId.length > 0,
}));

let mockClientId = "";

import {
  GIS_SCRIPT_LOAD_TIMEOUT_MS,
  GoogleSignInButton,
} from "@/features/auth/components/GoogleSignInButton";

const GIS_SRC = "https://accounts.google.com/gsi/client";

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    mockClientId = "";
    vi.useRealTimers();
    document
      .querySelectorAll(`script[src="${GIS_SRC}"]`)
      .forEach((node) => node.remove());
    delete window.google;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document
      .querySelectorAll(`script[src="${GIS_SRC}"]`)
      .forEach((node) => node.remove());
    delete window.google;
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

  it("shows Reintentar after GIS load failure and retries on click", async () => {
    mockClientId = "client.apps.googleusercontent.com";
    const appendChild = document.head.appendChild.bind(document.head);
    vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
      const el = node as HTMLScriptElement;
      if (el?.tagName === "SCRIPT") {
        queueMicrotask(() => el.onerror?.(new Event("error") as never));
      }
      return appendChild(node);
    });

    render(<GoogleSignInButton onCredential={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/Google/i);
    });
    const retry = screen.getByRole("button", { name: "Reintentar" });
    expect(retry).toBeTruthy();

    vi.mocked(document.head.appendChild).mockRestore();
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: vi.fn(),
        },
      },
    };

    await act(async () => {
      fireEvent.click(retry);
    });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
    });
    expect(window.google.accounts.id.renderButton).toHaveBeenCalled();
  });

  it("times out when an existing GIS script never fires load", async () => {
    mockClientId = "client.apps.googleusercontent.com";
    vi.useFakeTimers();

    const existing = document.createElement("script");
    existing.src = GIS_SRC;
    document.head.appendChild(existing);

    render(<GoogleSignInButton onCredential={vi.fn()} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(GIS_SCRIPT_LOAD_TIMEOUT_MS);
    });

    expect(screen.getByRole("alert").textContent).toMatch(/Google/i);
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });
});
