/**
 * HEIC/HEIF conversion using macOS `sips`.
 *
 * iPhone camera photos are commonly HEIC. pdf-lib can embed JPEG/PNG only, so
 * we convert HEIC/HEIF to JPEG at upload time. `sips` is built into macOS.
 */

import { spawn } from "node:child_process";
import { unlink } from "node:fs/promises";

export async function ensureJpegIfNeeded(filePath: string, mimeType: string): Promise<{ filePath: string; mimeType: string }> {
  if (mimeType !== "image/heic" && mimeType !== "image/heif") {
    return { filePath, mimeType };
  }

  const jpegPath = `${filePath}.jpg`;
  await runSips(["-s", "format", "jpeg", filePath, "-o", jpegPath]);
  await unlink(filePath);
  return { filePath: jpegPath, mimeType: "image/jpeg" };
}

function runSips(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/sips", args);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`sips failed with code ${code}: ${stderr.trim()}`));
      }
    });
  });
}
