type Props = {
  className?: string;
  /** Decorative by default when paired with a labelled balance. */
  title?: string;
};

/** Stylized gold coin SVG (PetsApp mint). */
export function GoldCoinIcon({ className, title }: Props) {
  const labelled = Boolean(title);
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width="28"
      height="28"
      role={labelled ? "img" : "presentation"}
      aria-hidden={labelled ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <radialGradient id="coinFace" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="45%" stopColor="#f0c14b" />
          <stop offset="100%" stopColor="#b8860b" />
        </radialGradient>
        <linearGradient id="coinRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="50%" stopColor="#d4a017" />
          <stop offset="100%" stopColor="#8a6a0a" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#coinRim)" />
      <circle cx="32" cy="32" r="25" fill="url(#coinFace)" />
      <circle
        cx="32"
        cy="32"
        r="21"
        fill="none"
        stroke="#c9a227"
        strokeWidth="1.6"
        opacity="0.9"
      />
      <text
        x="32"
        y="39"
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fontFamily="Georgia, 'Times New Roman', serif"
        fill="#7a5a08"
      >
        P
      </text>
      <ellipse
        cx="22"
        cy="20"
        rx="8"
        ry="4"
        fill="#fff8dc"
        opacity="0.45"
        transform="rotate(-28 22 20)"
      />
    </svg>
  );
}
