import { PET_NAME } from "@/features/pet-home/pet-status";
import styles from "./pet-home.module.css";

/** Friendly flat cat SVG for the home stage. */
export function CatIllustration() {
  return (
    <svg
      className={styles.catSvg}
      viewBox="0 0 200 200"
      role="img"
      aria-label={PET_NAME}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="100" cy="168" rx="48" ry="8" className={styles.catShadow} />
      <path
        d="M58 78 L48 28 L78 58 Z"
        className={styles.catEar}
      />
      <path
        d="M142 78 L152 28 L122 58 Z"
        className={styles.catEar}
      />
      <ellipse cx="100" cy="108" rx="58" ry="52" className={styles.catBody} />
      <circle cx="100" cy="72" r="42" className={styles.catBody} />
      <ellipse cx="82" cy="70" rx="7" ry="10" className={styles.catEye} />
      <ellipse cx="118" cy="70" rx="7" ry="10" className={styles.catEye} />
      <circle cx="83" cy="68" r="2.5" className={styles.catPupil} />
      <circle cx="119" cy="68" r="2.5" className={styles.catPupil} />
      <path
        d="M100 82 L94 90 L106 90 Z"
        className={styles.catNose}
      />
      <path
        d="M100 90 Q88 98 78 92"
        className={styles.catMouth}
        fill="none"
      />
      <path
        d="M100 90 Q112 98 122 92"
        className={styles.catMouth}
        fill="none"
      />
      <path
        d="M42 100 Q18 88 22 110 Q28 128 48 118"
        className={styles.catWhisker}
        fill="none"
      />
      <path
        d="M158 100 Q182 88 178 110 Q172 128 152 118"
        className={styles.catWhisker}
        fill="none"
      />
      <path
        d="M148 130 Q178 120 168 160 Q140 155 148 130"
        className={styles.catTail}
      />
    </svg>
  );
}
