/**
 * Safe path helpers — prevent path traversal and keep all writes inside the
 * packet's data folder. Receipts are private medical/financial documents, so
 * we treat every user-supplied filename as untrusted.
 */

import { resolve, relative, join, sep } from "node:path";

/** True if `target` is `root` or lives somewhere inside `root`. */
export function isInside(root: string, target: string): boolean {
  const rootPath = resolve(root);
  const targetPath = resolve(target);
  const rel = relative(rootPath, targetPath);
  return rel === "" || (!rel.startsWith("..") && !resolve(rel).startsWith(rootPath));
}

/** Join `root` with `untrustedName` and reject anything that escapes `root`. */
export function safeJoin(root: string, untrustedName: string): string {
  const target = resolve(root, untrustedName);
  if (!isInside(root, target)) {
    throw new Error(`Path escapes data root: ${untrustedName}`);
  }
  return target;
}

/** Normalize an arbitrary filename into something safe to store on disk. */
export function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "file";
}

/** Build a sequential stored filename like `receipt-001.jpg`. */
export function receiptFileName(index: number, ext: string): string {
  const padded = String(index).padStart(3, "0");
  const cleanExt = ext.startsWith(".") ? ext : `.${ext}`;
  return `receipt-${padded}${cleanExt}`;
}

/** Ensure a path uses OS-native separators (used only for display). */
export function toDisplayPath(p: string): string {
  return p.split("/").join(sep);
}

export { join };