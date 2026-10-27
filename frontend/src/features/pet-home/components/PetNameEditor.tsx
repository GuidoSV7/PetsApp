"use client";

import { useEffect, useState, type FormEvent } from "react";
import { renameHint } from "@/features/pet-home/pet-status";
import styles from "./pet-home.module.css";

type Props = {
  name: string;
  renameCount: number;
  disabled?: boolean;
  onSave: (name: string) => void | Promise<void>;
};

/** Inline editable pet name; every rename is free. */
export function PetNameEditor({
  name,
  renameCount,
  disabled,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  const startEdit = () => {
    if (disabled) return;
    setDraft(name);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    if (!next || next === name || disabled) {
      cancel();
      return;
    }
    await onSave(next);
    setEditing(false);
  };

  if (editing) {
    return (
      <form className={styles.nameEditor} onSubmit={(e) => void submit(e)}>
        <label className={styles.nameEditorLabel} htmlFor="pet-name-input">
          Nombre
        </label>
        <div className={styles.nameEditorRow}>
          <input
            id="pet-name-input"
            className={styles.nameInput}
            value={draft}
            maxLength={16}
            autoFocus
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            aria-describedby="pet-rename-hint"
          />
          <button
            type="submit"
            className={styles.nameSave}
            disabled={disabled || !draft.trim()}
          >
            Guardar
          </button>
          <button
            type="button"
            className={styles.nameCancel}
            disabled={disabled}
            onClick={cancel}
          >
            Cancelar
          </button>
        </div>
        <p id="pet-rename-hint" className={styles.renameHint}>
          {renameHint(renameCount)}
        </p>
      </form>
    );
  }

  return (
    <button
      type="button"
      className={styles.petNameButton}
      onClick={startEdit}
      disabled={disabled}
      aria-label={`Editar nombre: ${name}`}
    >
      <span className={styles.petName}>{name}</span>
      <span className={styles.nameEditGlyph} aria-hidden="true">
        ✎
      </span>
    </button>
  );
}
