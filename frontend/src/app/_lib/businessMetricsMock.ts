// Métricas de ventas simuladas por negocio hasta que exista endpoint real. Estables por id (mismo id => mismos números).

function mezclarSemilla(cadena: string) {
  let h = 2166136261;
  for (let i = 0; i < cadena.length; i++) {
    h ^= cadena.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function siguientePseudo(semilla: number) {
  return (semilla * 1664525 + 1013904223) >>> 0;
}

function enRango(semilla: number, min: number, max: number) {
  const x = semilla / 0xffffffff;
  return Math.floor(min + x * (max - min + 1));
}

export type BusinessMetricsMock = {
  ventasUltimos7Dias: number;
  ventasUltimos30Dias: number;
  ticketPromedioLamports: number;
  ingresosUltimos30DiasLamports: number;
};

/** Genera cifras plausibles derivadas del id del negocio (no cambian entre renders). */
export function getBusinessMockMetrics(idNegocio: string): BusinessMetricsMock {
  let s = mezclarSemilla(idNegocio);
  s = siguientePseudo(s);
  const v7 = enRango(s, 3, 48);
  s = siguientePseudo(s);
  const v30 = enRango(s, Math.max(v7, 12), 220);
  s = siguientePseudo(s);
  const ticket = enRango(s, 2_500_000, 95_000_000);
  s = siguientePseudo(s);
  const ingresos = Math.floor((v30 * ticket) / enRango(s, 3, 8));

  return {
    ventasUltimos7Dias: v7,
    ventasUltimos30Dias: v30,
    ticketPromedioLamports: ticket,
    ingresosUltimos30DiasLamports: ingresos,
  };
}

export function formatLamportsAsSol(lamports: number): string {
  const sol = lamports / 1_000_000_000;
  if (sol >= 1) return `${sol.toFixed(2)} SOL`;
  if (sol >= 0.01) return `${sol.toFixed(3)} SOL`;
  return `${sol.toFixed(6)} SOL`;
}
