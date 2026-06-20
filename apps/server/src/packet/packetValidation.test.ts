import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ReceiptPacket } from "@wcb/shared";
import { validatePacketForExport } from "./packetValidation.js";

const receiptId = "receipt-1";
const duplicateId = "receipt-2";

describe("validatePacketForExport", () => {
  let dataRoot: string;
  let receiptPath: string;
  let duplicatePath: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(join(tmpdir(), "wcb-validation-"));
    process.env.WCB_DATA_ROOT = dataRoot;
    receiptPath = join(dataRoot, "receipt-1.pdf");
    duplicatePath = join(dataRoot, "receipt-2.pdf");
    await writeFile(receiptPath, "%PDF-1.4\n");
    await writeFile(duplicatePath, "%PDF-1.4\n");
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
    if (process.env.WCB_DATA_ROOT === dataRoot) {
      delete process.env.WCB_DATA_ROOT;
    }
  });

  it("returns no issues for a complete packet", async () => {
    const validation = await validatePacketForExport(createPacket([createReceipt({ id: receiptId, filePath: receiptPath })]));

    expect(validation.canExport).toBe(true);
    expect(validation.errorCount).toBe(0);
    expect(validation.warningCount).toBe(0);
  });

  it("blocks export when required packet fields or reasons are missing", async () => {
    const validation = await validatePacketForExport(
      createPacket([
        createReceipt({
          id: receiptId,
          filePath: receiptPath,
          reason: "short",
        }),
      ], ""),
    );

    expect(validation.canExport).toBe(false);
    expect(validation.errorCount).toBe(2);
    expect(validation.issues.map((issue) => issue.code)).toEqual(["missing_claim_number", "missing_reason"]);
  });

  it("warns when duplicate receipt hashes are present", async () => {
    const validation = await validatePacketForExport(
      createPacket([
        createReceipt({ id: receiptId, filePath: receiptPath, sha256: "same-hash" }),
        createReceipt({ id: duplicateId, filePath: duplicatePath, sha256: "same-hash" }),
      ]),
    );

    expect(validation.canExport).toBe(true);
    expect(validation.warningCount).toBe(1);
    expect(validation.issues[0].code).toBe("duplicate_receipt");
  });

  it("blocks export when an included receipt file is missing", async () => {
    const validation = await validatePacketForExport(
      createPacket([
        createReceipt({
          id: receiptId,
          filePath: join(dataRoot, "missing.pdf"),
        }),
      ]),
    );

    expect(validation.canExport).toBe(false);
    expect(validation.issues.some((issue) => issue.code === "missing_receipt_file")).toBe(true);
  });
});

function createPacket(receipts: ReceiptPacket["receipts"], claimNumber = "WCB123"): ReceiptPacket {
  return {
    id: "packet-1",
    claimantName: "Dawson Block",
    claimNumber,
    preparedDate: "2026-06-19",
    packetTitle: "WCB Receipt Submission Packet",
    createdAt: "2026-06-19T00:00:00.000Z",
    updatedAt: "2026-06-19T00:00:00.000Z",
    receipts,
    exportHistory: [],
  };
}

function createReceipt(options: {
  id: string;
  filePath: string;
  reason?: string;
  sha256?: string;
}): ReceiptPacket["receipts"][number] {
  return {
    id: options.id,
    originalFileName: `${options.id}.pdf`,
    storedFileName: `${options.id}.pdf`,
    filePath: options.filePath,
    fileType: "pdf",
    mimeType: "application/pdf",
    sha256: options.sha256 ?? `${options.id}-hash`,
    vendor: "Test Vendor",
    purchaseDate: "2026-06-19",
    amount: "25.00",
    category: "other",
    reason: options.reason ?? "Valid expense reason for the WCB claim.",
    notes: "",
    includeInExport: true,
    reviewStatus: "reviewed",
    rotation: 0,
    createdAt: "2026-06-19T00:00:00.000Z",
    updatedAt: "2026-06-19T00:00:00.000Z",
  };
}
