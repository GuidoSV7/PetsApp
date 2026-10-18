"use client";

import { useEffect, useRef, useState } from "react";
import { extractCoatColors } from "@/features/pet-home/extract-coat-colors";
import type { PetCoatColors } from "@/features/pet-home/extract-coat-colors";
import styles from "./pet-home.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onColors: (colors: PetCoatColors) => void;
};

/** Live camera → snapshot → coat palette (browser only). */
export function CameraCoatCapture({ open, onClose, onColors }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este dispositivo no permite usar la cámara.");
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
      } catch {
        setError("No pudimos abrir la cámara. Revisá los permisos.");
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
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    onColors(extractCoatColors(image));
    onClose();
  };

  if (!open) return null;

  return (
    <div className={styles.cameraOverlay} role="dialog" aria-modal="true" aria-label="Colores de mi gato">
      <div className={styles.cameraPanel}>
        <p className={styles.cameraHint}>
          Enfocá a tu gato y capturá: Michi tomará los colores del pelaje.
        </p>
        {error ? (
          <p className={styles.cameraError} role="alert">
            {error}
          </p>
        ) : (
          <video
            ref={videoRef}
            className={styles.cameraVideo}
            playsInline
            muted
            autoPlay
          />
        )}
        <div className={styles.cameraActions}>
          <button type="button" className={styles.actionButton} onClick={capture} disabled={Boolean(error)}>
            Capturar colores
          </button>
          <button type="button" className={styles.actionButtonSecondary} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
