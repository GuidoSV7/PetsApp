"use client";

import { useCallback, useEffect, useState } from "react";

import {
  PetsAppApiError,
  updateAdminCommission,
  getAdminCommission,
} from "../../../_lib/petsapp-api";
import { getSessionToken } from "../../../demoAuth";
import estilos from "./commissions-section.module.css";

function bpsAPorcentaje(bps: number): string {
  return (bps / 100).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function AdminCommissionsSection() {
  const [porcentaje, setPorcentaje] = useState("1");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const r = await getAdminCommission(token);
      setPorcentaje(String(r.commissionBps / 100));
      setActualizadoEn(r.updatedAt);
    } catch (e) {
      setError(e instanceof PetsAppApiError ? e.message : "No se pudo cargar la comisión.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async () => {
    const token = getSessionToken();
    if (!token) return;
    const n = Number(String(porcentaje).replace(",", "."));
    if (Number.isNaN(n) || n < 0 || n > 100) {
      setError("Ingresá un porcentaje entre 0 y 100.");
      return;
    }
    const commissionBps = Math.round(n * 100);
    setGuardando(true);
    setError(null);
    setOk(null);
    try {
      const r = await updateAdminCommission(token, commissionBps);
      setPorcentaje(String(r.commissionBps / 100));
      setActualizadoEn(r.updatedAt);
      setOk("Comisión actualizada.");
    } catch (e) {
      setError(e instanceof PetsAppApiError ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className={estilos.tarjeta}>
        <p className={estilos.descripcion}>Cargando configuración…</p>
      </div>
    );
  }

  return (
    <div className={estilos.tarjeta}>
      <h2 className={estilos.titulo}>Comisión por transacción (API / QR)</h2>
      <p className={estilos.descripcion}>
        El campo <code style={{ color: "#a5b4fc" }}>amount</code> en{" "}
        <code style={{ color: "#a5b4fc" }}>POST /api/payments/qr</code> es el monto del pedido (lo que
        recibe el vendedor en escrow). El comprador paga ese monto <strong>más</strong> esta comisión en la
        misma transacción (ej. pedido 100 + 1% = paga 101).
      </p>

      {error ? <p className={estilos.error}>{error}</p> : null}
      {ok ? (
        <p style={{ color: "#86efac", fontSize: "0.9rem", marginBottom: 12 }}>{ok}</p>
      ) : null}

      <div className={estilos.fila}>
        <div>
          <label className={estilos.label} htmlFor="comision-pct">
            Comisión (%)
          </label>
          <input
            id="comision-pct"
            className={estilos.input}
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={porcentaje}
            onChange={(e) => {
              setOk(null);
              setPorcentaje(e.target.value);
            }}
          />
        </div>
        <button type="button" className={estilos.boton} disabled={guardando} onClick={() => void guardar()}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <p className={estilos.hint}>
        Equivalente a <strong>{bpsAPorcentaje(Math.round(Number(String(porcentaje).replace(",", ".")) * 100) || 0)}%</strong>{" "}
        (internamente: {Math.round(Number(String(porcentaje).replace(",", ".")) * 100) || 0} bps).
        {actualizadoEn ? (
          <>
            {" "}
            Última actualización: {new Date(actualizadoEn).toLocaleString("es-AR")}.
          </>
        ) : null}
      </p>
    </div>
  );
}
