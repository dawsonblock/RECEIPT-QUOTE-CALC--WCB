/**
 * In-memory packet state for the local server.
 *
 * The authoritative persisted state is packet.json in the packet folder. This
 * module keeps a single active packet in memory and saves it after every write.
 */

import { randomUUID } from "node:crypto";
import type { ReceiptPacket, ReceiptItem, ExportRecord } from "@wcb/shared";

export class PacketModel {
  private packet: ReceiptPacket | null = null;

  get current(): ReceiptPacket | null {
    return this.packet;
  }

  createNewPacket(claimantName = "Dawson Block", claimNumber = ""): ReceiptPacket {
    const now = new Date().toISOString();
    this.packet = {
      id: randomUUID(),
      claimantName,
      claimNumber,
      preparedDate: now.slice(0, 10),
      packetTitle: "WCB Receipt Submission Packet",
      createdAt: now,
      updatedAt: now,
      receipts: [],
      exportHistory: [],
    };
    return this.packet;
  }

  setPacket(packet: ReceiptPacket): void {
    this.packet = packet;
  }

  updatePacket(patch: Partial<ReceiptPacket>): ReceiptPacket {
    if (!this.packet) {
      throw new Error("No packet loaded.");
    }

    this.packet = {
      ...this.packet,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    return this.packet;
  }

  addReceipt(receipt: ReceiptItem): ReceiptPacket {
    if (!this.packet) {
      throw new Error("No packet loaded.");
    }

    this.packet.receipts = [...this.packet.receipts, receipt];
    this.packet.updatedAt = new Date().toISOString();
    return this.packet;
  }

  updateReceipt(receiptId: string, patch: Partial<ReceiptItem>): ReceiptPacket {
    const packet = this.requirePacket();
    const index = packet.receipts.findIndex((receipt) => receipt.id === receiptId);

    if (index < 0) {
      throw new Error(`Receipt not found: ${receiptId}`);
    }

    packet.receipts[index] = {
      ...packet.receipts[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    packet.updatedAt = new Date().toISOString();
    return packet;
  }

  deleteReceipt(receiptId: string): ReceiptPacket {
    const packet = this.requirePacket();
    packet.receipts = packet.receipts.filter((receipt) => receipt.id !== receiptId);
    packet.updatedAt = new Date().toISOString();
    return packet;
  }

  reorderReceipts(receiptIds: string[]): ReceiptPacket {
    const packet = this.requirePacket();
    const byId = new Map(packet.receipts.map((receipt) => [receipt.id, receipt]));
    const ordered = receiptIds.map((id) => byId.get(id)).filter((receipt): receipt is ReceiptItem => Boolean(receipt));

    if (ordered.length !== packet.receipts.length) {
      throw new Error("Receipt reorder list does not match loaded receipts.");
    }

    packet.receipts = ordered;
    packet.updatedAt = new Date().toISOString();
    return packet;
  }

  addExportRecord(record: ExportRecord): ReceiptPacket {
    const packet = this.requirePacket();
    packet.exportHistory = [...packet.exportHistory, record];
    packet.updatedAt = new Date().toISOString();
    return packet;
  }

  private requirePacket(): ReceiptPacket {
    if (!this.packet) {
      throw new Error("No packet loaded.");
    }
    return this.packet;
  }
}
