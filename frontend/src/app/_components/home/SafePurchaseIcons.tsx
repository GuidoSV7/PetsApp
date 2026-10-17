export function IconoEscrow({ color }: Readonly<{ color: string }>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 10V7a5 5 0 0 1 10 0v3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 10h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V10Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 14v4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconoVelocidad({ color }: Readonly<{ color: string }>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconoCodigo({ color }: Readonly<{ color: string }>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 9 5 12l3 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 9l3 3-3 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 5 10 19"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

