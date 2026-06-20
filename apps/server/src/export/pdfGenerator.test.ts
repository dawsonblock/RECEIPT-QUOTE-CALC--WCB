import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateReceiptPacketPDF } from "./pdfGenerator.js";
import type { ReceiptPacket } from "@wcb/shared";

describe("generateReceiptPacketPDF", () => {
  let dataRoot: string;
  let receiptPath: string;

  beforeEach(async () => {
    dataRoot = await mkdtemp(join(tmpdir(), "wcb-pdf-"));
    process.env.WCB_DATA_ROOT = dataRoot;
    receiptPath = join(dataRoot, "receipt.pdf");
    await writeFile(receiptPath, createMinimalPdf("Sample Receipt"));
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
    if (process.env.WCB_DATA_ROOT === dataRoot) {
      delete process.env.WCB_DATA_ROOT;
    }
  });

  it("writes a PDF packet with cover, summary, receipt, and reason pages", async () => {
    const outputPath = join(dataRoot, "packet-1", "exports", "WCB_Receipt_Packet_WCB123_2026-06-19.pdf");
    const packet = createPacket([createReceipt(receiptPath)]);

    const record = await generateReceiptPacketPDF(packet, { outputPath });

    expect(record.filePath).toBe(outputPath);
    expect(record.receiptCount).toBe(1);
    const bytes = await import("node:fs/promises").then(({ readFile }) => readFile(outputPath));
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("skips receipts excluded from export", async () => {
    const outputPath = join(dataRoot, "packet-1", "exports", "WCB_Receipt_Packet_WCB123_2026-06-19.pdf");
    const packet = createPacket([createReceipt(receiptPath, false)]);

    const record = await generateReceiptPacketPDF(packet, { outputPath });

    expect(record.receiptCount).toBe(0);
    const bytes = await import("node:fs/promises").then(({ readFile }) => readFile(outputPath));
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

function createMinimalPdf(text: string): string {
  const escaped = text.replace(/[()\\]/g, "\\$&");
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 120 >>
stream
BT
/F1 18 Tf
100 700 Td
(${escaped}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000250 00000 n 
0000000419 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
496
%%EOF
`;
}

function createPacket(receipts: ReceiptPacket["receipts"]): ReceiptPacket {
  return {
    id: "packet-1",
    claimantName: "Dawson Block",
    claimNumber: "WCB123",
    preparedDate: "2026-06-19",
    packetTitle: "WCB Receipt Submission Packet",
    createdAt: "2026-06-19T00:00:00.000Z",
    updatedAt: "2026-06-19T00:00:00.000Z",
    receipts,
    exportHistory: [],
  };
}

function createReceipt(filePath: string, includeInExport = true): ReceiptPacket["receipts"][number] {
  return {
    id: "receipt-1",
    originalFileName: "receipt.pdf",
    storedFileName: "receipt.pdf",
    filePath,
    fileType: "pdf",
    mimeType: "application/pdf",
    sha256: "receipt-hash",
    vendor: "Test Vendor",
    purchaseDate: "2026-06-19",
    amount: "25.00",
    category: "other",
    reason: "Valid expense reason for the WCB claim.",
    notes: "",
    includeInExport,
    reviewStatus: "reviewed",
    rotation: 0,
    createdAt: "2026-06-19T00:00:00.000Z",
    updatedAt: "2026-06-19T00:00:00.000Z",
  };
}
