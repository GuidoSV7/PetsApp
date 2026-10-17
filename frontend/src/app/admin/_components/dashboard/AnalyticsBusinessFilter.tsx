"use client";

import { useEffect, useState } from "react";
import { getSessionToken } from "../../../demoAuth";
import { listPetsAppBusinesses } from "../../../_lib/petsapp-api";
import estilos from "./dashboard-header.module.css";

type Props = {
  valor: string;
  alCambiar: (negocioId: string) => void;
};

export default function AnalyticsBusinessFilter({ valor, alCambiar }: Props) {
  const [opciones, setOpciones] = useState<Array<{ id: string; nombre: string }>>([]);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;
    let cancelado = false;
    void (async () => {
      try {
        const r = await listPetsAppBusinesses(token, 1, 100);
        if (cancelado) return;
        setOpciones(r.negocios.map((n) => ({ id: n.id, nombre: n.name })));
      } catch {
        if (!cancelado) setOpciones([]);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <label className={estilos.labelCalendario}>
      <span className={estilos.textoSr}>Filtrar analítica por negocio</span>
      <select
        className={estilos.selectNegocio}
        aria-label="Filtrar por negocio"
        value={valor}
        onChange={(ev) => alCambiar(ev.target.value)}
      >
        <option value="">Todos los negocios</option>
        {opciones.map((n) => (
          <option key={n.id} value={n.id}>
            {n.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
