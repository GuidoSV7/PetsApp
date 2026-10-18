"use client";

import { useEffect, useRef, useState } from "react";
import { coatColorsFromFile } from "@/features/pet-home/coat-from-image";
import {
  cropCenterImageData,
  extractCoatColors,
  type PetCoatColors,
} from "@/features/pet-home/extract-coat-colors";
import styles from "./pet-home.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onColors: (colors: PetCoatColors) => void;
};

/** Live camera or gallery photo → coat palette (browser only). */
export function CameraCoatCapture({ open, onClose, onColors }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setCameraReady(false);

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este dispositivo no permite usar la cámara. Podés subir una foto.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setCameraReady(true);
      } catch {
        setError(
          "No pudimos abrir la cámara. Revisá los permisos o subí una foto.",
        );
      }
    };

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth < 2) {
      setError("Esperá un momento a que la cámara enfoque.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("No se pudo leer la imagen.");
      return;
    }
    ctx.drawImage(video, 0, 0);
    const full = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const image =
      canvas.width >= 48 && canvas.height >= 48
        ? cropCenterImageData(full, 0.72)
        : full;
    onColors(extractCoatColors(image));
    onClose();
  };

  const onGalleryPick = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const colors = await coatColorsFromFile(file);
      onColors(colors);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo leer la foto.",
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!open) return null;

  return (
    <div
      className={styles.cameraOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Colores de mi gato"
    >
      <div className={styles.cameraPanel}>
        <p className={styles.cameraHint}>
          Centrá al gato en el encuadre (cara o cuerpo de cerca). Sacá una foto
          o subí una de la galería para tomar los colores del pelaje.
        </p>
        {error ? (
          <p className={styles.cameraError} role="alert">
            {error}
          </p>
        ) : null}
        {cameraReady || !error ? (
          <video
            ref={videoRef}
            className={styles.cameraVideo}
            playsInline
            muted
            autoPlay
            hidden={!cameraReady}
          />
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className={styles.cameraFileInput}
          onChange={(event) => void onGalleryPick(event.target.files)}
        />
        <div className={styles.cameraActions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={capture}
            disabled={busy || !cameraReady}
          >
            Capturar colores
          </button>
          <button
            type="button"
            className={styles.actionButtonSecondary}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            Subir de galería
          </button>
          <button
            type="button"
            className={styles.actionButtonSecondary}
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
