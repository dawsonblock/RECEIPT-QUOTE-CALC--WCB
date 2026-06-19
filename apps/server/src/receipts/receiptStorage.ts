/**
 * Receipt storage manager.
 *
 * Responsibilities:
 * - copy uploaded file into packet receipts folder
 * - convert HEIC/HEIF to JPEG using macOS sips
 * - compute SHA-256
 * - detect duplicate hashes
 */

import { readFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import type { ReceiptItem, ReceiptCategory, ReviewStatus } from "@wcb/shared";
import { randomUUID } from "node:crypto";
import { receiptsDir, thumbnailsDir } from "../config/paths.js";
import { ensureJpegIfNeeded } from "./heicConverter.js";
import { sha256Buffer } from "./fileHash.js";
import { safeJoin, receiptFileName, sanitizeFileName } from "../security/safePaths.js";

export interface CreateReceiptOptions {
  packetId: string;
  sourceBuffer: Buffer;
  originalName: string;
  mimeType: string;
  category?: ReceiptCategory;
}

export class ReceiptStorage {
  async createReceipt(options: CreateReceiptOptions): Promise<ReceiptItem> {
    const now = new Date().toISOString();
    const packetReceiptsDir = receiptsDir(options.packetId);
    await mkdir(packetReceiptsDir, { recursive: true });
    await mkdir(thumbnailsDir(options.packetId), { recursive: true });

    const ext = basename(options.originalName).includes(".")
      ? `.${basename(options.originalName).split(".").pop()}`
      : ".bin";

    const index = (await listReceiptFiles(packetReceiptsDir)).length + 1;
    const storedFileName = receiptFileName(index, ext);
    const targetPath = safeJoin(packetReceiptsDir, storedFileName);

    await writeFile(targetPath, options.sourceBuffer);
    const converted = await ensureJpegIfNeeded(targetPath, options.mimeType);
    const bytes = await readFile(converted.filePath);
    const sha256 = sha256Buffer(bytes);

    return {
      id: randomUUID(),
      originalFileName: sanitizeFileName(options.originalName),
      storedFileName: basename(converted.filePath),
      filePath: converted.filePath,
      fileType: converted.mimeType === "application/pdf" ? "pdf" : "image",
      mimeType: converted.mimeType,
      sha256,
      vendor: "",
      purchaseDate: null,
      amount: null,
      category: options.category ?? "other",
      reason: "",
      notes: "",
      includeInExport: true,
      reviewStatus: "needs_review" as ReviewStatus,
      rotation: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findDuplicate(packetId: string, sha256: string): Promise<ReceiptItem | null> {
    const packetReceiptsDir = receiptsDir(packetId);
    const receipts = await listReceiptFiles(packetReceiptsDir);
    for (const file of receipts) {
      const bytes = await readFile(file);
      if (sha256Buffer(bytes) === sha256) {
        return {
          id: "",
          originalFileName: basename(file),
          storedFileName: basename(file),
          filePath: file,
          fileType: "image",
          mimeType: "image/jpeg",
          sha256,
          vendor: "",
          purchaseDate: null,
          amount: null,
          category: "other",
          reason: "",
          notes: "",
          includeInExport: true,
          reviewStatus: "needs_review",
          rotation: 0,
          createdAt: "",
          updatedAt: "",
        };
      }
    }
    return null;
  }
}

async function listReceiptFiles(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((name) => !name.startsWith(".")).sort();
  } catch {
    return [];
  }
}

