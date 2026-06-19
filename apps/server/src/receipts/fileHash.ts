/** SHA-256 hashing for duplicate detection. */

import { createHash } from "node:crypto";
import type { Readable } from "node:stream";

export async function sha256Stream(stream: Readable): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });
  return hash.digest("hex");
}

export function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
