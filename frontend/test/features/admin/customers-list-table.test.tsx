/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CustomersListTable from "@/app/admin/_components/customers/CustomersListTable";
import type { AdminUserResponse } from "@/app/_lib/petsapp-api";

const member: AdminUserResponse = {
  id: "u1",
  userName: "Michi",
  email: "michi@pets.app",
  role: "member",
  country: "BO",
  isBlocked: false,
  isVerified: true,
};

describe("CustomersListTable loading / empty / error / a11y", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows loading copy instead of empty search results", () => {
    render(
      <CustomersListTable
        usuarios={[]}
        cargando
        onVerDetalle={vi.fn()}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(/Cargando usuarios/i);
    expect(screen.queryByText(/No hay resultados/i)).toBeNull();
  });

  it("shows error with Reintentar and not empty search copy", () => {
    const onReintentar = vi.fn();
    render(
      <CustomersListTable
        usuarios={[]}
        error="No se pudo cargar el listado."
        onReintentar={onReintentar}
        onVerDetalle={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/No se pudo cargar/i);
    expect(screen.queryByText(/No hay resultados/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/i }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });

  it("shows empty search copy only when idle with no rows", () => {
    render(<CustomersListTable usuarios={[]} onVerDetalle={vi.fn()} />);
    expect(screen.getByText(/No hay resultados para esta búsqueda/i)).toBeTruthy();
  });

  it("exposes caption, scope=col headers, and named Acciones column", () => {
    render(
      <CustomersListTable usuarios={[member]} onVerDetalle={vi.fn()} />,
    );
    const table = screen.getByRole("table", {
      name: /Listado de cuentas de miembros/i,
    });
    expect(table).toBeTruthy();
    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent)).toEqual([
      "Usuario",
      "Correo",
      "Rol",
      "País",
      "Estado",
      "Verificado",
      "Acciones",
    ]);
    for (const th of headers) {
      expect(th.getAttribute("scope")).toBe("col");
    }
  });
});
