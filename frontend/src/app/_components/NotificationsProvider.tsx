"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import estilos from "./notification.module.css";
import TopNotification from "./TopNotification";

export type NotificationsValue = {
  showNotification: (mensaje: string, durationMs?: number) => void;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function useNotification(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotification debe usarse dentro de NotificationsProvider (layout raíz).");
  }
  return ctx;
}

/** Si el componente puede montarse fuera del árbol principal (tests / story). */
export function useOptionalNotification(): NotificationsValue | null {
  return useContext(NotificationsContext);
}

// Proveedor global: home, /admin, /cliente comparten el mismo toast superior derecha.
export default function NotificationsProvider({
  children: hijos,
}: Readonly<{ children: ReactNode }>) {
  const [activa, setActiva] = useState<{
    id: number;
    mensaje: string;
    durationMs: number;
  } | null>(null);

  const showNotification = useCallback((mensaje: string, durationMs = 12_000) => {
    setActiva({ id: Date.now(), mensaje, durationMs });
  }, []);

  const valor = useMemo(() => ({ showNotification }), [showNotification]);

  return (
    <NotificationsContext.Provider value={valor}>
      {hijos}
      {activa ? (
        <div className={estilos.notificationTopRightAnchor}>
          <TopNotification
            key={activa.id}
            mensaje={activa.mensaje}
            durationMs={activa.durationMs}
            alTerminar={() => setActiva(null)}
          />
        </div>
      ) : null}
    </NotificationsContext.Provider>
  );
}
