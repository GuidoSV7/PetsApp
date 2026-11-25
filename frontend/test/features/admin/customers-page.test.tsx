/**
 * @vitest-environment jsdom
 */
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import CustomersPage from "@/app/admin/customers/page";
import CustomersListTable from "@/app/admin/_components/customers/CustomersListTable";
import { savePetsAppSession, getPetsAppSession, clearSession, type PetsAppSessionData } from "@/stores/auth-session";
import type { AdminUserResponse } from "@/app/_lib/petsapp-api";

const { router } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function miembro(nombre: string): AdminUserResponse {
  return {
    id: `id-${nombre}`,
    userName: nombre,
    email: `${nombre.toLowerCase()}@test.app`,
    role: "member",
    country: "AR",
    isBlocked: false,
    isVerified: true,
  } as AdminUserResponse;
}

const adminSession: PetsAppSessionData = {
  token: "",
  user: {
    id: "admin-1",
    name: "Admin",
    email: "admin@test.app",
    role: "admin",
    roles: ["admin"],
    country: null,
  },
};

type Deferred = {
  resolve: (r: Response) => void;
};

function deferredFetch() {
  const pending: Deferred[] = [];
  const calls: { input: RequestInfo | URL; init?: RequestInit }[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Promise<Response>((resolve) => {
      pending.push({ resolve });
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    calls,
    settle(index: number, response: Response) {
      pending[index]!.resolve(response);
    },
    pendingCount: () => pending.length,
  };
}

beforeEach(() => {
  localStorage.clear();
  router.replace.mockClear();
  router.push.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  clearSession();
});

describe("admin customers page (S8/S9/S1)", () => {
  it("S9 ignores out-of-order responses: the latest request wins", async () => {
    savePetsAppSession({ ...adminSession, token: "tok" });
    const upstream = deferredFetch();
    render(
      <StrictMode>
        <CustomersPage />
      </StrictMode>,
    );

    // StrictMode double-invokes the mount effect: two requests in flight.
    await waitFor(() => expect(upstream.pendingCount()).toBe(2));
    // The later request answers first, the earlier one answers last.
    upstream.settle(
      1,
      new Response(JSON.stringify([miembro("Ultimo")]), { status: 200 }),
    );
    upstream.settle(
      0,
      new Response(JSON.stringify([miembro("Viejo")]), { status: 200 }),
    );

    await screen.findByText("Ultimo");
    expect(screen.queryByText("Viejo")).toBeNull();
  });

  it("S8 does not duplicate 401 handling: the shared handler clears the session and the page does not navigate itself", async () => {
    savePetsAppSession(adminSession);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ message: "expired" }), { status: 401 }))),
    );
    render(<CustomersPage />);
    await waitFor(() => expect(getPetsAppSession()).toBeNull());
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("S1 loads the list with cookie auth when no in-memory token exists", async () => {
    // Tokenless persisted session: cookie is the credential.
    savePetsAppSession({ ...adminSession, token: "" });
    const upstream = deferredFetch();
    render(<CustomersPage />);
    await waitFor(() => expect(upstream.pendingCount()).toBe(1));
    upstream.settle(
      0,
      new Response(JSON.stringify([miembro("Ana")]), { status: 200 }),
    );
    await screen.findByText("Ana");
    expect(new Headers(upstream.calls[0]!.init?.headers).get("authorization")).toBeNull();
  });
});

describe("admin customers table (S9)", () => {
  it("has a caption and column scopes", () => {
    render(
      <CustomersListTable usuarios={[miembro("Ana")]} onVerDetalle={() => {}} />,
    );
    const tabla = screen.getByRole("table");
    expect(tabla.querySelector("caption")).not.toBeNull();
    const columnas = within(tabla).getAllByRole("columnheader");
    expect(columnas.length).toBeGreaterThan(0);
    for (const columna of columnas) {
      expect(columna.getAttribute("scope")).toBe("col");
    }
  });
});
