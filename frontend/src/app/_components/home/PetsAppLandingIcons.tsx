// Iconos SVG coherentes con la línea PetsApp (trazo, sin emojis genéricos).

const trazo = 1.65;

type Props = { color?: string; tamano?: number };

export function IconoPagoRechazado({ color = "currentColor", tamano = 28 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2.5"
        stroke={color}
        strokeWidth={trazo}
      />
      <path d="M3 10h18" stroke={color} strokeWidth={trazo} />
      <path
        d="M8 15h3M14 15h2"
        stroke={color}
        strokeWidth={trazo}
        strokeLinecap="round"
      />
      <path
        d="M5 19L19 5"
        stroke={color}
        strokeWidth={trazo}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BankFrictionIcon({ color = "currentColor", tamano = 28 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10h16v10H4V10Z"
        stroke={color}
        strokeWidth={trazo}
        strokeLinejoin="round"
      />
      <path d="M6 14h2M10 14h2M14 14h2" stroke={color} strokeWidth={trazo} strokeLinecap="round" />
      <path
        d="M3 10V8l9-4 9 4v2"
        stroke={color}
        strokeWidth={trazo}
        strokeLinejoin="round"
      />
      <circle cx="18" cy="6" r="3" stroke={color} strokeWidth={trazo} fill="none" />
      <path d="M16.5 7.5l3-3" stroke={color} strokeWidth={trazo} strokeLinecap="round" />
    </svg>
  );
}

export function IconoLatamRed({ color = "currentColor", tamano = 28 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={trazo} />
      <path
        d="M12 3c-2 4-2 14 0 18M3 12h18"
        stroke={color}
        strokeWidth={trazo * 0.85}
        strokeLinecap="round"
        opacity={0.45}
      />
      <circle cx="9" cy="14" r="1.35" fill={color} />
      <circle cx="15" cy="11" r="1.35" fill={color} />
      <circle cx="12" cy="8" r="1.35" fill={color} />
    </svg>
  );
}

export function IconoCuentaRapida({ color = "currentColor", tamano = 32 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="3.5" stroke={color} strokeWidth={trazo} />
      <path
        d="M6 19v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"
        stroke={color}
        strokeWidth={trazo}
        strokeLinecap="round"
      />
      <path
        d="M18 8v4M16 10h4"
        stroke={color}
        strokeWidth={trazo}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconoQrEnlace({ color = "currentColor", tamano = 32 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4h6v6H4V4Z"
        stroke={color}
        strokeWidth={trazo}
        strokeLinejoin="round"
      />
      <path d="M6 6h2v2H6V6Z" fill={color} />
      <path
        d="M14 4h6v6h-6V4Z"
        stroke={color}
        strokeWidth={trazo}
        strokeLinejoin="round"
      />
      <path d="M16 6h2v2h-2V6Z" fill={color} />
      <path
        d="M4 14h6v6H4v-6Z"
        stroke={color}
        strokeWidth={trazo}
        strokeLinejoin="round"
      />
      <path d="M6 16h2v2H6v-2Z" fill={color} />
      <path
        d="M14 14h2v2M14 18h2v2M18 14v2M16 16h4"
        stroke={color}
        strokeWidth={trazo}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconoCobroInstantaneo({ color = "currentColor", tamano = 32 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L3 14h7l-1 8 10-12h-7l1-8Z"
        stroke={color}
        strokeWidth={trazo}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconoGraficoMetricas({ color = "currentColor", tamano = 28 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19h16" stroke={color} strokeWidth={trazo} strokeLinecap="round" />
      <path
        d="M7 16V10M12 16V6M17 16v-5"
        stroke={color}
        strokeWidth={trazo}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconoMascota({ color = "currentColor", tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="14" rx="6" ry="5" stroke={color} strokeWidth={trazo} />
      <circle cx="9" cy="12" r="1" fill={color} />
      <circle cx="15" cy="12" r="1" fill={color} />
      <path
        d="M8 5l-2 3M16 5l2 3"
        stroke={color}
        strokeWidth={trazo}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconoCasaContrato({ color = "currentColor", tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10l8-6 8 6v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10Z"
        stroke={color}
        strokeWidth={trazo}
        strokeLinejoin="round"
      />
      <path d="M9 21V12h6v9" stroke={color} strokeWidth={trazo} strokeLinejoin="round" />
    </svg>
  );
}

export function IconoPaquete({ color = "currentColor", tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L3 7v10l9 5 9-5V7l-9-5Z"
        stroke={color}
        strokeWidth={trazo}
        strokeLinejoin="round"
      />
      <path d="M12 22V12" stroke={color} strokeWidth={trazo} />
      <path d="M3 7l9 5 9-5" stroke={color} strokeWidth={trazo} strokeLinejoin="round" />
    </svg>
  );
}

export function IconoCheckCirculo({ color = "currentColor", tamano = 18 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={trazo} opacity={0.5} />
      <path
        d="M8 12l2.5 2.5L16 9"
        stroke={color}
        strokeWidth={trazo}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconoLibroDocs({ color = "currentColor", tamano = 22 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 4h10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H6V4Z"
        stroke={color}
        strokeWidth={trazo}
        strokeLinejoin="round"
      />
      <path
        d="M6 4H5a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h1"
        stroke={color}
        strokeWidth={trazo}
        strokeLinejoin="round"
      />
      <path d="M9 8h5M9 12h5" stroke={color} strokeWidth={trazo} strokeLinecap="round" />
    </svg>
  );
}
