/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { savePetsAppSession } from "@/stores/auth-session";
import type { AdminUserResponse } from "@/features/auth/types/auth.types";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), detail: vi.fn(), update: vi.fn(), toggle: vi.fn(),
  notification: vi.fn(), replace: vi.fn(),
}));
const router = { replace: mocks.replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/app/_components/NotificationsProvider", () => ({
  useNotification: () => ({ showNotification: mocks.notification }),
}));
vi.mock("@/app/_lib/petsapp-api", async (load) => ({
  ...await load<typeof import("@/app/_lib/petsapp-api")>(),
  listAdminUsers: mocks.list, getAdminUserById: mocks.detail,
  updateAdminUser: mocks.update, toggleAdminUserBlock: mocks.toggle,
}));
import CustomersPage from "@/app/admin/customers/page";
import AdminUserDetailView from "@/app/admin/_components/customers/AdminUserDetailView";

const wallet = {
  id: "001", userName: "Michi", email: null, role: "member", roles: ["member"],
  country: "BO", isBlocked: false, isVerified: false,
  createdAt: "2026-01-01", updatedAt: "2026-01-01", lastLogin: null,
} as unknown as AdminUserResponse;
const email = { ...wallet, id: "002", userName: "Email", email: "member@example.test" };

describe("admin nullable customers through the UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savePetsAppSession({ token: "admin-token", user: {
      id: "admin", name: "Admin", email: "admin@example.test", role: "admin", roles: ["admin"], country: null,
    } });
    mocks.list.mockResolvedValue([wallet, email]);
    mocks.detail.mockResolvedValue(wallet);
    mocks.update.mockResolvedValue(undefined);
  });
  afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

  it("shows the wallet label, keeps order and searches name, email and ID without mutation", async () => {
    render(<CustomersPage />);
    await screen.findByText("Michi");
    expect(screen.getByText("Sin email · Freighter")).toBeTruthy();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["Michi001", "Email002"]);
    for (const [query, result] of [["michi", "Michi"], ["001", "Michi"], ["member@example", "Email"]]) {
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: query } });
      expect(screen.getAllByRole("row")).toHaveLength(2);
      expect(within(screen.getAllByRole("row")[1]).getByText(result)).toBeTruthy();
    }
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.toggle).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("searches an email after a NULL-email row without throwing or mutating", async () => {
    render(<CustomersPage />);
    await screen.findByText("Michi");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "member@example" } });
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(within(screen.getAllByRole("row")[1]).getByText("Email")).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.toggle).not.toHaveBeenCalled();
  });

  it("exports unchanged CSV columns/order with an empty wallet email cell", async () => {
    let exported: Blob | undefined;
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn((blob: Blob) => { exported = blob; return "blob:owned"; }) });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<CustomersPage />);
    await screen.findByText("Michi");
    fireEvent.click(screen.getByRole("button", { name: /Exportar/ }));
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(exported!);
    });
    expect(text).toBe('id,userName,email,role,country,isBlocked,isVerified\n001,"Michi",,member,BO,false,false\n002,"Email",member@example.test,member,BO,false,false');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:owned");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("omits unchanged NULL email when changing wallet name/country", async () => {
    const { container } = render(<AdminUserDetailView idUsuario="001" mostrarConfiguracion />);
    await screen.findByRole("heading", { name: "Michi" });
    fireEvent.change(container.querySelector("#nombre-usuario")!, { target: { value: "Nuevo" } });
    fireEvent.change(container.querySelector("#pais-usuario")!, { target: { value: "AR" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledExactlyOnceWith("admin-token", "001", { name: "Nuevo", country: "AR" }));
    expect(mocks.toggle).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("preserves email edits and existing email customer display", async () => {
    mocks.detail.mockResolvedValue(email);
    const { container } = render(<AdminUserDetailView idUsuario="002" mostrarConfiguracion />);
    await screen.findByRole("heading", { name: "Email" });
    expect((container.querySelector("#correo-usuario") as HTMLInputElement).value).toBe(email.email);
    fireEvent.change(container.querySelector("#correo-usuario")!, { target: { value: "new@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledExactlyOnceWith("admin-token", "002", { name: "Email", email: "new@example.test", country: "BO" }));
  });

  it("preserves unchanged email in an email customer's PATCH", async () => {
    mocks.detail.mockResolvedValue(email);
    render(<AdminUserDetailView idUsuario="002" mostrarConfiguracion />);
    await screen.findByRole("heading", { name: "Email" });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledExactlyOnceWith("admin-token", "002", { name: "Email", email: email.email, country: "BO" }));
  });

  it("shows the wallet label in read-only detail", async () => {
    render(<AdminUserDetailView idUsuario="001" />);
    expect(await screen.findByText("Sin email · Freighter")).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
