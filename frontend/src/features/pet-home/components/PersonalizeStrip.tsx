import { COAT_PRESETS } from "@/features/pet-home/pet-customize";
import type { PetCoatColors } from "@/features/pet-home/extract-coat-colors";
import { DEFAULT_PET_NAME } from "@/features/pet-home/pet-status";
import styles from "./pet-home.module.css";

type Props = {
  petName?: string;
  activeCoat: PetCoatColors;
  disabled?: boolean;
  onSelectCoat: (coat: PetCoatColors) => void;
  onOpenCamera: () => void;
};

/** Personalizar card: coat presets + open camera/gallery. */
export function PersonalizeStrip({
  petName = DEFAULT_PET_NAME,
  activeCoat,
  disabled,
  onSelectCoat,
  onOpenCamera,
}: Props) {
  return (
    <section
      className={styles.personalize}
      aria-label={`Personalizar a ${petName}`}
    >
      <button
        type="button"
        className={styles.personalizeHeader}
        onClick={onOpenCamera}
        disabled={disabled}
      >
        <span className={styles.personalizeIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M15.7 3.8 14 2H10L8.3 3.8 4 6.2V9l3.2-1.1V20h9.6V7.9L20 9V6.2l-4.3-2.4z"
            />
          </svg>
        </span>
        <span className={styles.personalizeText}>
          <span className={styles.personalizeTitle}>
            Personalizar a {petName}
          </span>
          <span className={styles.personalizeSub}>
            Colores, accesorios y más
          </span>
        </span>
        <span className={styles.personalizeChevron} aria-hidden="true">
          ›
        </span>
      </button>

      <div className={styles.presetRow}>
        {COAT_PRESETS.map((preset) => {
          const selected =
            preset.coat.primary.toLowerCase() ===
            activeCoat.primary.toLowerCase();
          return (
            <button
              key={preset.id}
              type="button"
              className={`${styles.presetTile} ${selected ? styles.presetTileActive : ""}`}
              style={{
                background: `linear-gradient(145deg, ${preset.coat.secondary}, ${preset.coat.primary})`,
              }}
              aria-label={`Pelaje ${preset.label}`}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onSelectCoat(preset.coat)}
            />
          );
        })}
        <button
          type="button"
          className={`${styles.presetTile} ${styles.presetCamera}`}
          aria-label="Colores de mi gato"
          disabled={disabled}
          onClick={onOpenCamera}
        >
          Foto
        </button>
      </div>
    </section>
  );
}
