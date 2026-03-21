import { BSKY_IMAGE_MAX_BYTES, BSKY_IMAGE_MAX_DIMENSION } from "./bsky";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const LOSSY_QUALITIES = [0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36];

export type ProcessedImageResult =
  | {
      ok: true;
      file: File;
      width: number;
      height: number;
      bytes: number;
      resized: boolean;
      outputType: string;
      convertedFrom: string | null;
    }
  | {
      ok: false;
      error: string;
      width: number;
      height: number;
      bytes: number;
    };

type LoadedImage = {
  bitmap: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  cleanup: () => void;
};

export async function preprocessImage(file: File): Promise<ProcessedImageResult> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return {
      ok: false,
      error: "JPEG / PNG / WebP のみ対応しています。",
      width: 0,
      height: 0,
      bytes: file.size,
    };
  }

  const loaded = await loadImage(file);
  const { width, height } = fitWithinBounds(loaded.width, loaded.height, BSKY_IMAGE_MAX_DIMENSION);
  const resized = width !== loaded.width || height !== loaded.height;

  try {
    if (!resized && file.size <= BSKY_IMAGE_MAX_BYTES) {
      return {
        ok: true,
        file,
        width: loaded.width,
        height: loaded.height,
        bytes: file.size,
        resized: false,
        outputType: file.type,
        convertedFrom: null,
      };
    }

    const canvas = renderToCanvas(loaded.bitmap, width, height);
    if (!canvas) {
      return {
        ok: false,
        error: "画像処理に失敗しました。",
        width,
        height,
        bytes: file.size,
      };
    }

    if (file.type === "image/png") {
      const pngBlob = await canvasToBlob(canvas, file.type);
      if (!pngBlob) {
        return {
          ok: false,
          error: "PNG の変換に失敗しました。",
          width,
          height,
          bytes: file.size,
        };
      }
      if (pngBlob.size > BSKY_IMAGE_MAX_BYTES) {
        const jpegCanvas = renderToCanvas(loaded.bitmap, width, height, "#ffffff");
        if (!jpegCanvas) {
          return {
            ok: false,
            error: "PNG の JPEG 変換に失敗しました。",
            width,
            height,
            bytes: pngBlob.size,
          };
        }
        const jpegResult = await encodeLossyWithinLimit(jpegCanvas, file, "image/jpeg");
        if (jpegResult) {
          return {
            ok: true,
            file: jpegResult.file,
            width,
            height,
            bytes: jpegResult.file.size,
            resized: true,
            outputType: jpegResult.file.type,
            convertedFrom: file.type,
          };
        }
        return {
          ok: false,
          error: `PNG は JPEG 変換後も上限 ${formatKB(BSKY_IMAGE_MAX_BYTES)}KB に収まりませんでした。`,
          width,
          height,
          bytes: pngBlob.size,
        };
      }

      return {
        ok: true,
        file: new File([pngBlob], file.name, {
          type: file.type,
          lastModified: Date.now(),
        }),
        width,
        height,
        bytes: pngBlob.size,
        resized: true,
        outputType: file.type,
        convertedFrom: null,
      };
    }

    const lossyResult = await encodeLossyWithinLimit(canvas, file, file.type);
    if (lossyResult) {
      return {
        ok: true,
        file: lossyResult.file,
        width,
        height,
        bytes: lossyResult.file.size,
        resized: true,
        outputType: lossyResult.file.type,
        convertedFrom: lossyResult.convertedFrom,
      };
    }

    return {
      ok: false,
      error: `${mimeLabel(file.type)} は縮小・圧縮後も上限 ${formatKB(
        BSKY_IMAGE_MAX_BYTES
      )}KB に収まりませんでした。`,
      width,
      height,
      bytes: file.size,
    };
  } finally {
    loaded.cleanup();
  }
}

export function fitWithinBounds(width: number, height: number, maxDimension: number) {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function renderToCanvas(
  bitmap: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  background?: string
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

async function loadImage(file: File): Promise<LoadedImage> {
  const objectUrl = URL.createObjectURL(file);

  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return {
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => {
        bitmap.close();
        URL.revokeObjectURL(objectUrl);
      },
    };
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    img.src = objectUrl;
  });

  return {
    bitmap: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function encodeLossyWithinLimit(
  canvas: HTMLCanvasElement,
  file: File,
  outputType: "image/jpeg" | "image/webp" | string
) {
  for (const quality of LOSSY_QUALITIES) {
    const blob = await canvasToBlob(canvas, outputType, quality);
    if (!blob) continue;
    if (blob.size <= BSKY_IMAGE_MAX_BYTES) {
      return {
        file: new File([blob], renameFileExtension(file.name, outputType), {
          type: outputType,
          lastModified: Date.now(),
        }),
        convertedFrom: outputType === file.type ? null : file.type,
      };
    }
  }
  return null;
}

export function renameFileExtension(fileName: string, type: string) {
  const suffix = type === "image/jpeg" ? ".jpg" : type === "image/webp" ? ".webp" : "";
  if (!suffix) return fileName;
  return fileName.replace(/\.[^.]+$/u, "") + suffix;
}

export function formatKB(bytes: number) {
  return (bytes / 1024).toFixed(2);
}

export function mimeLabel(type: string) {
  if (type === "image/jpeg") return "JPEG";
  if (type === "image/webp") return "WebP";
  if (type === "image/png") return "PNG";
  return "画像";
}
