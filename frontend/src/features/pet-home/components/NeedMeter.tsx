import styles from "./pet-home.module.css";

type Tone = "hunger" | "fun" | "energy" | "hygiene";

type Props = {
  label: string;
  value: number;
  tone: Tone;
};

function ToneIcon({ tone }: { tone: Tone }) {
  if (tone === "hunger") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.needSvg}>
        <path
          fill="currentColor"
          d="M7 3v8a2 2 0 1 0 2 0V3h2v8a4 4 0 0 1-8 0V3h2zm10 0c-1.7 0-3 1.8-3 4v6h2v8h2V3h-1z"
        />
      </svg>
    );
  }
  if (tone === "fun") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.needSvg}>
        <path
          fill="currentColor"
          d="M12 2a5 5 0 0 0-5 5v1H5a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h2v1a5 5 0 0 0 10 0v-1h2a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3h-2V7a5 5 0 0 0-5-5zm-3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
        />
      </svg>
    );
  }
  if (tone === "energy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.needSvg}>
        <path fill="currentColor" d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.needSvg}>
      <path
        fill="currentColor"
        d="M12 2c-3.5 4.5-6 8-6 11a6 6 0 0 0 12 0c0-3-2.5-6.5-6-11z"
      />
    </svg>
  );
}

/** Single need card with percent and tone-colored bar. */
export function NeedMeter({ label, value, tone }: Props) {
  return (
    <div className={`${styles.needCard} ${styles[`needTone_${tone}`]}`}>
      <div className={styles.needTop}>
        <span className={styles.needIconWell} aria-hidden="true">
          <ToneIcon tone={tone} />
        </span>
        <span className={styles.needLabel}>{label}</span>
        <span className={styles.needValue}>{value}%</span>
      </div>
      <div
        className={styles.needTrack}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div className={styles.needFill} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
