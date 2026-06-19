/**
 * JSON packet persistence.
 *
 * Storage format follows the build plan:
 *   packet.json
 *   receipts/
 *   thumbnails/
 *   exports/
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ReceiptPacket } from "@wcb/shared";
import { DATA_ROOT, packetJsonPath } from "../config/paths.js";

export class PacketStore {
  /** Persist a packet to its packet.json file. */
  async save(packet: ReceiptPacket): Promise<void> {
    const path = packetJsonPath(packet.id);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  }

  /** Load a packet by id from disk. */
  async load(packetId: string): Promise<ReceiptPacket> {
    const path = packetJsonPath(packetId);
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as ReceiptPacket;
  }

  /** Ensure the root data directory exists. */
  async ensureRoot(): Promise<void> {
    await mkdir(DATA_ROOT, { recursive: true });
  }
}
