// Neutral PetsApp brand mark (paw print) used by the public header and the admin sidebar.
type Props = Readonly<{
  size?: number;
  className?: string;
}>;

export default function BrandMark({ size = 40, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="PetsApp"
    >
      <circle cx="24" cy="24" r="23" fill="var(--primario, #00f2ff)" opacity="0.18" />
      <ellipse cx="15" cy="18" rx="4" ry="5" fill="var(--primario, #00f2ff)" />
      <ellipse cx="33" cy="18" rx="4" ry="5" fill="var(--primario, #00f2ff)" />
      <ellipse cx="10" cy="27" rx="3.5" ry="4.5" fill="var(--primario, #00f2ff)" />
      <ellipse cx="38" cy="27" rx="3.5" ry="4.5" fill="var(--primario, #00f2ff)" />
      <path
        d="M24 24c-6 0-11 5.5-11 10.5 0 3 2 4.5 4.5 4.5 2.2 0 4-1.2 6.5-1.2s4.3 1.2 6.5 1.2c2.5 0 4.5-1.5 4.5-4.5C35 29.5 30 24 24 24Z"
        fill="var(--primario, #00f2ff)"
      />
    </svg>
  );
}
