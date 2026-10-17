export type DateFilterPreset = "hoy" | "semana" | "mes" | "calendario";

export type DateFilterIsoRange = {
  from: string;
  to: string;
};

export function ymdLocal(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfLocalDay(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
}

function parseYmdLocal(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(year, month, day, 12, 0, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
    return null;
  }
  return d;
}

/** ISO-8601 con offset local, válido para Zod datetime({ offset: true }). */
export function toIsoWithOffset(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = fecha.getFullYear();
  const mo = pad(fecha.getMonth() + 1);
  const d = pad(fecha.getDate());
  const h = pad(fecha.getHours());
  const mi = pad(fecha.getMinutes());
  const s = pad(fecha.getSeconds());
  const ms = String(fecha.getMilliseconds()).padStart(3, "0");
  const offsetMin = -fecha.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = pad(Math.floor(abs / 60));
  const om = pad(abs % 60);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${ms}${sign}${oh}:${om}`;
}

export function resolveDateFilterRange(args: {
  preset: DateFilterPreset;
  calendarDateYmd: string;
  ahora: Date;
}): DateFilterIsoRange {
  const { preset, calendarDateYmd, ahora } = args;

  if (preset === "calendario") {
    const elegido = parseYmdLocal(calendarDateYmd) ?? ahora;
    return {
      from: toIsoWithOffset(startOfLocalDay(elegido)),
      to: toIsoWithOffset(endOfLocalDay(elegido)),
    };
  }

  if (preset === "semana") {
    const desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 6);
    return {
      from: toIsoWithOffset(startOfLocalDay(desde)),
      to: toIsoWithOffset(endOfLocalDay(ahora)),
    };
  }

  if (preset === "mes") {
    const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    return {
      from: toIsoWithOffset(startOfLocalDay(desde)),
      to: toIsoWithOffset(endOfLocalDay(ahora)),
    };
  }

  return {
    from: toIsoWithOffset(startOfLocalDay(ahora)),
    to: toIsoWithOffset(endOfLocalDay(ahora)),
  };
}
