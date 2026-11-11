/**
 * @vitest-environment jsdom
 */
/**
 * T5 — S10: /account styles live in a CSS module using the tokens (no inline
 * style attributes) and the signed-in home header links to "Mi cuenta".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { replace, push, signOutPetsAppUser, clearSession, getPetsAppSession } = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  signOutPetsAppUser: vi.fn(),
  clearSession: vi.fn(),
  getPetsAppSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));
vi.mock("@/features/auth/api/auth.service", () => ({ signOutPetsAppUser }));
vi.mock("@/stores/auth-session", () => ({
  clearSession,
  getPetsAppSession,
  isAdminRole: (role: string) => role === "admin" || role === "super_admin",
}));

import AccountPage from "@/app/account/page";
import HomeHeader from "@/app/_components/home/HomeHeader";

const memberSession = {
  token: "t",
  user: { id: "u", name: "Ana", email: "ana@correo.test", role: "member", roles: ["member"], country: "BO" },
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => cleanup());

describe("S10 /account presentation", () => {
  it("renders the account summary for a signed-in member without inline styles", async () => {
    getPetsAppSession.mockReturnValue(memberSession);
    const { container } = render(<AccountPage />);
    await act(async () => {});
    expect(screen.getByRole("heading", { name: "Mi cuenta" })).toBeTruthy();
    expect(container.textContent).toContain("ana@correo.test");
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("keeps the sesión check and redirects anonymous visitors home (preserved)", async () => {
    getPetsAppSession.mockReturnValue(null);
    render(<AccountPage />);
    await act(async () => {});
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("keeps admins routed to /admin (preserved)", async () => {
    getPetsAppSession.mockReturnValue({
      ...memberSession,
      user: { ...memberSession.user, role: "admin", roles: ["admin"] },
    });
    render(<AccountPage />);
    await act(async () => {});
    expect(replace).toHaveBeenCalledWith("/admin");
  });
});

describe("S10 home header entry to the account", () => {
  it("shows a 'Mi cuenta' link for signed-in users", () => {
    render(
      <HomeHeader
        coins={4}
        userName="Ana"
        onLogout={() => undefined}
      />,
    );
    const link = screen.getByRole("link", { name: "Mi cuenta" });
    expect(link.getAttribute("href")).toBe("/account");
  });

  it("keeps the anonymous header without a 'Mi cuenta' link", () => {
    render(<HomeHeader />);
    expect(screen.queryByRole("link", { name: "Mi cuenta" })).toBeNull();
  });

  it("keeps the logout button reachable (preserved)", () => {
    render(<HomeHeader userName="Ana" onLogout={() => undefined} />);
    expect(screen.getByRole("button", { name: "Cerrar sesión de Ana" })).toBeTruthy();
  });
});

describe("preserved: cerrar sesión flow", () => {
  it("clears the session and goes home", async () => {
    getPetsAppSession.mockReturnValue(memberSession);
    signOutPetsAppUser.mockResolvedValue(undefined);
    render(<AccountPage />);
    await act(async () => {});
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    });
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/");
  });
});
