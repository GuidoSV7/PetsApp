"use client";

import { useId, useState } from "react";
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

/** Compact top toggle; presets open in a small popover. */
export function PersonalizeStrip({
  petName = DEFAULT_PET_NAME,
  activeCoat,
  disabled,
  onSelectCoat,
  onOpenCamera,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={styles.personalizeWrap}>
      <button
        type="button"
        className={styles.personalizeToggle}
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.personalizeToggleIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M12 3a4 4 0 0 0-4 4v1H6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v1a4 4 0 0 0 8 0v-1h2a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V7a4 4 0 0 0-4-4zm-2 8.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"
            />
          </svg>
        </span>
        Personalizar
        <span className={styles.personalizeToggleChevron} aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className={styles.personalizePanel}
          role="region"
          aria-label={`Personalizar a ${petName}`}
        >
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
        </div>
      ) : null}
    </div>
  );
}
