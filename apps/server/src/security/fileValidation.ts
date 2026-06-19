/**
 * File validation and MIME detection.
 *
 * v1 accepts:
 * - JPG/JPEG/PNG/HEIC/HEIF images
 * - PDFs
 *
 * HEIC/HEIF are accepted at upload but converted to JPEG using macOS `sips`
 * before storage/export. That keeps iPhone camera uploads working without
 * depending on sharp/libvips HEIC support.
 */

import { extname } from "node:path";
import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES } from "@wcb/shared";
import { sanitizeFileName } from "./safePaths.js";

export interface FileValidationResult {
  originalName: string;
  storedName: string;
  ext: string;
  mimeType: string;
  isPdf: boolean;
  isImage: boolean;
}

export function assertUploadSize(bytes: number): void {
  if (bytes > MAX_UPLOAD_BYTES) {
    throw new Error(`Receipt file is too large. Maximum is ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
  }
}

export function validateReceiptFile(originalName: string, mimeType: string, bytes: number): FileValidationResult {
  assertUploadSize(bytes);

  const cleanName = sanitizeFileName(originalName || "receipt");
  const ext = extname(cleanName).toLowerCase();

  if (!ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
    throw new Error(`Unsupported receipt file type: ${ext || "unknown extension"}`);
  }

  const normalizedMime = normalizeMime(mimeType, ext);

  if (!["image/jpeg", "image/png", "image/heic", "image/heif", "application/pdf"].includes(normalizedMime)) {
    throw new Error(`Unsupported receipt MIME type: ${mimeType || "unknown"}`);
  }

  return {
    originalName: cleanName,
    storedName: cleanName,
    ext,
    mimeType: normalizedMime,
    isPdf: normalizedMime === "application/pdf",
    isImage: normalizedMime.startsWith("image/"),
  };
}

export function normalizeMime(mimeType: string | undefined, ext: string): string {
  if (mimeType && mimeType.trim().length > 0) {
    return mimeType.trim().toLowerCase();
  }

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".heic":
      return "image/heic";
    case ".heif":
      return "image/heif";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
