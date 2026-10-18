import {
  cropCenterImageData,
  extractCoatColors,
  type PetCoatColors,
} from "@/features/pet-home/extract-coat-colors";

/**
 * Decode a local image file into ImageData (canvas sample).
 * Prefers createImageBitmap; falls back to HTMLImageElement.
 */
export async function loadImageDataFromFile(file: File): Promise<ImageData> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elegí un archivo de imagen.");
  }

  const bitmap =
    typeof createImageBitmap === "function"
      ? await createImageBitmap(file).catch(() => null)
      : null;

  if (bitmap) {
    try {
      return drawToImageData(bitmap, bitmap.width, bitmap.height);
    } finally {
      bitmap.close();
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await loadHtmlImage(url);
    return drawToImageData(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function coatColorsFromFile(file: File): Promise<PetCoatColors> {
  const image = await loadImageDataFromFile(file);
  const focused =
    image.width >= 64 && image.height >= 64
      ? cropCenterImageData(image, 0.75)
      : image;
  return extractCoatColors(focused);
}

function drawToImageData(
  source: CanvasImageSource,
  width: number,
  height: number,
): ImageData {
  if (width < 1 || height < 1) {
    throw new Error("La imagen está vacía.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo leer la imagen.");
  }
  ctx.drawImage(source, 0, 0);
  return ctx.getImageData(0, 0, width, height);
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo abrir la imagen."));
    image.src = url;
  });
}
