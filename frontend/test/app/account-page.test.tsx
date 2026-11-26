/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  replace,
  push,
  router,
  signOutPetsAppUser,
  fetchAuthProfile,
  changePetsAppPassword,
  deleteCurrentUserAccount,
  isPollarConfigured,
  pollarLogout,
  getUserProfile,
} = vi.hoisted(() => {
  const replace = vi.fn();
  const push = vi.fn();
  return {
    replace,
    push,
    router: { replace, push },
    signOutPetsAppUser: vi.fn(),
    fetchAuthProfile: vi.fn(),
    changePetsAppPassword: vi.fn(),
    deleteCurrentUserAccount: vi.fn(),
    isPollarConfigured: vi.fn(() => false),
    pollarLogout: vi.fn(),
    getUserProfile: vi.fn(() => null as null | {
      mail: string;
      first_name: string;
      last_name: string;
    }),
  };
});

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/auth/api/auth.service", () => ({
  signOutPetsAppUser,
  fetchAuthProfile,
}));
vi.mock("@/app/_lib/petsapp-api", () => ({
  changePetsAppPassword,
  deleteCurrentUserAccount,
}));
vi.mock("@/features/pollar/pollar-config", () => ({
  isPollarConfigured: () => isPollarConfigured(),
}));
vi.mock("@pollar/react", () => ({
  usePollar: () => ({
    isAuthenticated: getUserProfile() !== null,
    wallet: getUserProfile()
      ? { address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ" }
      : null,
    logout: pollarLogout,
    getClient: () => ({ getUserProfile }),
  }),
}));

import AccountPage from "@/app/account/page";
import HomeHeader from "@/app/_components/home/HomeHeader";
import {
  clearSession,
  getPetsAppSession,
  savePetsAppSession,
} from "@/stores/auth-session";

const member = {
  id: "u",
  name: "Ana",
  email: "ana@correo.test",
  role: "member" as const,
  roles: ["member" as const],
  country: "BO",
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  clearSession();
  isPollarConfigured.mockReturnValue(false);
  getUserProfile.mockReturnValue(null);
  fetchAuthProfile.mockResolvedValue(member);
  signOutPetsAppUser.mockResolvedValue(undefined);
  changePetsAppPassword.mockResolvedValue(undefined);
  deleteCurrentUserAccount.mockResolvedValue(undefined);
});
afterEach(() => cleanup());

describe("Nest /account presentation", () => {
  it("renders the account summary for a signed-in member without inline styles", async () => {
    savePetsAppSession({ token: "t", user: member });
    const { container } = render(<AccountPage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Mi cuenta" })).toBeTruthy(),
    );
    expect(container.textContent).toContain("ana@correo.test");
    expect(container.querySelector("[style]")).toBeNull();
    expect(fetchAuthProfile).toHaveBeenCalled();
  });

  it("keeps the sesión check and redirects anonymous visitors home (preserved)", async () => {
    render(<AccountPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  it("keeps admins routed to /admin (preserved)", async () => {
    savePetsAppSession({
      token: "t",
      user: { ...member, role: "admin", roles: ["admin"] },
    });
    render(<AccountPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
  });

  it("shows profile error with retry when revalidate fails (#77)", async () => {
    savePetsAppSession({ token: "t", user: member });
    fetchAuthProfile.mockRejectedValue(new Error("API caída"));
    render(<AccountPage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy(),
    );
    expect(screen.getByText(/API caída/i)).toBeTruthy();
    fetchAuthProfile.mockResolvedValue(member);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(fetchAuthProfile).toHaveBeenCalledTimes(2));
  });

  it("wires change-password via changePetsAppPassword (#77)", async () => {
    savePetsAppSession({ token: "t", user: member });
    render(<AccountPage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Cambiar contraseña" })).toBeTruthy(),
    );
    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "vieja-clave1" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "nueva-clave1" },
    });
    fireEvent.change(screen.getByLabelText("Confirmá la contraseña nueva"), {
      target: { value: "nueva-clave1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
    await waitFor(() =>
      expect(changePetsAppPassword).toHaveBeenCalledWith(
        expect.anything(),
        "vieja-clave1",
        "nueva-clave1",
      ),
    );
    expect(screen.getByText("Contraseña actualizada.")).toBeTruthy();
  });

  it("wires delete-account via deleteCurrentUserAccount (#77)", async () => {
    savePetsAppSession({ token: "t", user: member });
    render(<AccountPage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Eliminar cuenta" })).toBeTruthy(),
    );
    const deleteSection = screen
      .getByRole("heading", { name: "Eliminar cuenta" })
      .closest("section")!;
    const deleteInput = deleteSection.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;
    fireEvent.change(deleteInput, { target: { value: "mi-clave" } });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
    await waitFor(() =>
      expect(deleteCurrentUserAccount).toHaveBeenCalledWith(
        expect.anything(),
        "mi-clave",
      ),
    );
    expect(push).toHaveBeenCalledWith("/");
    expect(getPetsAppSession()).toBeNull();
  });

  it("clears local UI and marks cookie retry when logout fails (#82)", async () => {
    savePetsAppSession({ token: "t", user: member });
    signOutPetsAppUser.mockRejectedValue(new Error("down"));
    render(<AccountPage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(getPetsAppSession()).toBeNull();
    expect(sessionStorage.getItem("petsapp_logout_cookie_pending")).toBe("1");
  });
});

describe("Pollar-aware /account (#63)", () => {
  beforeEach(() => {
    isPollarConfigured.mockReturnValue(true);
  });

  it("shows Pollar name/wallet and does not bounce to /", async () => {
    getUserProfile.mockReturnValue({
      mail: "ada@test.app",
      first_name: "Ada",
      last_name: "Lovelace",
    });
    render(<AccountPage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Mi cuenta" })).toBeTruthy(),
    );
    expect(replace).not.toHaveBeenCalledWith("/");
    expect(screen.getByText(/Ada Lovelace/)).toBeTruthy();
    expect(screen.getByText(/GABCDEFGHIJKLMNOPQRSTUVWXYZ/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Cambiar contraseña" })).toBeNull();
  });

  it("logs out via Pollar path", async () => {
    getUserProfile.mockReturnValue({
      mail: "a@test.app",
      first_name: "Ada",
      last_name: "",
    });
    render(<AccountPage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    });
    await waitFor(() => expect(pollarLogout).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith("/");
  });
});

describe("home header entry to the account", () => {
  it("shows a 'Mi cuenta' link for signed-in users", () => {
    render(
      <HomeHeader coins={4} userName="Ana" onLogout={() => undefined} />,
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
