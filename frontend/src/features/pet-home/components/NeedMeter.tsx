import styles from "./pet-home.module.css";

type Props = {
  label: string;
  value: number;
  tone: "hunger" | "fun" | "energy" | "hygiene";
};

/** Single need card with percent and bar. */
export function NeedMeter({ label, value, tone }: Props) {
  return (
    <div className={`${styles.needCard} ${styles[`needTone_${tone}`]}`}>
      <div className={styles.needTop}>
        <span className={styles.needMark} aria-hidden="true" />
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
