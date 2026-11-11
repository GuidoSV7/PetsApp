"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import estilos from "./notification.module.css";

/** Default visibility: ~6s, per audit S6. */
const DURACION_DEFAULT_MS = 6000;

type Props = Readonly<{
  mensaje: string;
  durationMs?: number;
  alTerminar?: () => void;
}>;

// Toast superior derecha: la barra avanza por CSS; hover o foco pausan el tiempo.
export default function TopNotification({
  mensaje,
  durationMs = DURACION_DEFAULT_MS,
  alTerminar,
}: Props) {
  const [visible, setVisible] = useState(true);
  const [pausado, setPausado] = useState(false);

  const inicioRef = useRef(Date.now());
  const restanteRef = useRef(durationMs);
  const alTerminarRef = useRef(alTerminar);
  const finNotificadoRef = useRef(false);

  alTerminarRef.current = alTerminar;

  useLayoutEffect(() => {
    inicioRef.current = Date.now();
    restanteRef.current = durationMs;
    finNotificadoRef.current = false;
    setPausado(false);
    setVisible(true);
  }, [durationMs, mensaje]);

  const terminar = () => {
    if (finNotificadoRef.current) return;
    finNotificadoRef.current = true;
    alTerminarRef.current?.();
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;

    if (pausado) return;

    const restante = Math.max(0, restanteRef.current);
    if (restante <= 0) {
      terminar();
      return;
    }

    const id = window.setTimeout(terminar, restante);
    return () => window.clearTimeout(id);
    // `terminar` es estable por cierre sobre refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, pausado]);

  const pausar = () => {
    if (pausado || !visible || finNotificadoRef.current) return;
    restanteRef.current = Math.max(
      0,
      restanteRef.current - (Date.now() - inicioRef.current),
    );
    setPausado(true);
  };

  const reanudar = () => {
    if (!pausado || !visible || finNotificadoRef.current) return;
    inicioRef.current = Date.now();
    setPausado(false);
  };

  if (!visible) return null;

  return (
    <div
      className={estilos.notificationCard}
      role="status"
      onMouseEnter={pausar}
      onMouseLeave={reanudar}
      onFocus={pausar}
      onBlur={reanudar}
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
        <button
          type="button"
          className={estilos.notificationClose}
          aria-label="Cerrar notificación"
          onClick={terminar}
        >
          ×
        </button>
      </div>
      <div className={estilos.notificationBarTrack} aria-hidden>
        <div
          className={estilos.notificationBarFill}
          style={{
            animationDuration: `${durationMs}ms`,
            animationPlayState: pausado ? "paused" : "running",
          }}
        />
      </div>
    </div>
  );
}
