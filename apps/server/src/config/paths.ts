/**
 * Filesystem path resolution for the WCB Receipt Builder.
 *
 * All local data lives under ~/Documents/WCB Receipt Packets/.
 * Each packet is a self-contained folder so it can be moved/backed up whole.
 *
 * Layout (per build plan §6):
 *   ~/Documents/WCB Receipt Packets/
 *     packet-YYYY-MM-DD-HHMM/
 *       packet.json
 *       receipts/
 *       thumbnails/
 *       exports/
 */

import { homedir } from "node:os";
import { join } from "node:path";

/** Root directory for all packet data. Override with WCB_DATA_ROOT. */
export const DATA_ROOT =
  process.env.WCB_DATA_ROOT ??
  join(homedir(), "Documents", "WCB Receipt Packets");

/** Where generated PDFs are written for a given packet. */
export function packetDir(packetId: string): string {
  return join(DATA_ROOT, `packet-${packetId}`);
}

export function receiptsDir(packetId: string): string {
  return join(packetDir(packetId), "receipts");
}

export function thumbnailsDir(packetId: string): string {
  return join(packetDir(packetId), "thumbnails");
}

export function exportsDir(packetId: string): string {
  return join(packetDir(packetId), "exports");
}

export function packetJsonPath(packetId: string): string {
  return join(packetDir(packetId), "packet.json");
}

/**
 * Format a folder-safe timestamp for packet folder names: YYYY-MM-DD-HHMM.
 */
export function folderTimestamp(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}`
  );
}