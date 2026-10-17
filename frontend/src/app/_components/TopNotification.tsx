"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import estilos from "./notification.module.css";

type Props = Readonly<{
  mensaje: string;
  durationMs?: number;
  alTerminar?: () => void;
}>;

// Toast superior derecha: cuenta atrás real; al pasar el mouse se pausa el tiempo.
export default function TopNotification({
  mensaje,
  durationMs = 12_000,
  alTerminar,
}: Props) {
  const [visible, setVisible] = useState(true);
  const [pausado, setPausado] = useState(false);
  const [restanteMs, setRestanteMs] = useState(durationMs);

  const deadlineRef = useRef(Date.now() + durationMs);
  const pausaRestanteRef = useRef<number | null>(null);
  const alTerminarRef = useRef(alTerminar);
  const yaNotificoFinRef = useRef(false);

  alTerminarRef.current = alTerminar;

  useLayoutEffect(() => {
    deadlineRef.current = Date.now() + durationMs;
    pausaRestanteRef.current = null;
    yaNotificoFinRef.current = false;
    setRestanteMs(durationMs);
    setVisible(true);
  }, [durationMs, mensaje]);

  useEffect(() => {
    if (!visible) return;

    let frameId = 0;

    const tick = () => {
      if (pausado) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const r = Math.max(0, deadlineRef.current - Date.now());
      setRestanteMs(r);

      if (r <= 0) {
        if (!yaNotificoFinRef.current) {
          yaNotificoFinRef.current = true;
          alTerminarRef.current?.();
        }
        setVisible(false);
        return;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [visible, pausado]);

  const alEntrar = () => {
    const r = Math.max(0, deadlineRef.current - Date.now());
    pausaRestanteRef.current = r;
    setRestanteMs(r);
    setPausado(true);
  };

  const alSalir = () => {
    const guardado = pausaRestanteRef.current;
    if (guardado !== null && guardado > 0) {
      deadlineRef.current = Date.now() + guardado;
    }
    pausaRestanteRef.current = null;
    setPausado(false);
  };

  if (!visible) return null;

  const porcentaje =
    durationMs > 0 ? Math.max(0, Math.min(100, (restanteMs / durationMs) * 100)) : 0;

  return (
    <div
      className={estilos.notificationCard}
      role="status"
      onMouseEnter={alEntrar}
      onMouseLeave={alSalir}
    >
      <div className={estilos.notificationBody}>
        <span className={estilos.notificationIcon} aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M12 8v5M12 16h.01"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <p className={estilos.notificationText}>{mensaje}</p>
      </div>
      <div className={estilos.notificationBarTrack} aria-hidden>
        <div
          className={estilos.notificationBarFill}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
