/**
 * PDF packet generator.
 *
 * Uses pdf-lib only, no browser dependency. This module can be unit-tested
 * without running the server.
 *
 * Layout:
 * - Cover page
 * - Summary page
 * - Receipt detail pages
 *
 * For PDF receipts, copy all original pages into the packet PDF, then append a
 * reason page. For image receipts, draw the image plus reason block on one page
 * when possible.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { randomUUID } from "node:crypto";
import type { ExportRecord, ReceiptItem, ReceiptPacket } from "@wcb/shared";
import { exportsDir } from "../config/paths.js";
import { toDisplayPath } from "../security/safePaths.js";

interface GenerateReceiptPacketPDFOptions {
  outputPath?: string;
}

export async function generateReceiptPacketPDF(
  packet: ReceiptPacket,
  options: GenerateReceiptPacketPDFOptions = {},
): Promise<ExportRecord> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const included = packet.receipts.filter((receipt) => receipt.includeInExport);

  drawCoverPage(pdfDoc, packet, included, font, bold);
  drawSummaryPage(pdfDoc, packet, included, font, bold);

  for (const receipt of included) {
    if (receipt.fileType === "pdf") {
      await appendPdfReceipt(pdfDoc, receipt);
      drawReasonPage(pdfDoc, packet, receipt, font, bold);
    } else {
      await appendImageReceipt(pdfDoc, receipt, font, bold);
    }
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = options.outputPath ?? buildExportPath(packet);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, pdfBytes);

  return {
    id: randomUUID(),
    fileName: basename(outputPath),
    filePath: outputPath,
    createdAt: new Date().toISOString(),
    receiptCount: included.length,
  };
}

function drawCoverPage(
  pdfDoc: PDFDocument,
  packet: ReceiptPacket,
  included: ReceiptItem[],
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): void {
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const totalAmount = sumAmounts(included);

  page.drawText("WCB Receipt Submission Packet", { x: 48, y: height - 110, size: 22, font: bold });
  page.drawText("Prepared For:", { x: 48, y: height - 160, size: 14, font: bold });
  page.drawText(packet.claimantName || "Not provided", { x: 48, y: height - 182, size: 11, font });
  page.drawText("Claim Number:", { x: 48, y: height - 222, size: 14, font: bold });
  page.drawText(packet.claimNumber || "Not provided", { x: 48, y: height - 244, size: 11, font });
  page.drawText("Prepared Date:", { x: 48, y: height - 284, size: 14, font: bold });
  page.drawText(packet.preparedDate || new Date().toISOString().slice(0, 10), { x: 48, y: height - 306, size: 11, font });
  page.drawText("Total Receipts:", { x: 48, y: height - 346, size: 14, font: bold });
  page.drawText(String(included.length), { x: 48, y: height - 368, size: 11, font });
  page.drawText("Total Amount:", { x: 48, y: height - 408, size: 14, font: bold });
  page.drawText(totalAmount == null ? "Not available" : formatCurrency(totalAmount), { x: 48, y: height - 430, size: 11, font });
  page.drawText("Statement:", { x: 48, y: height - 480, size: 14, font: bold });
  page.drawText("This packet contains receipts and explanations for expenses related to my WCB claim.", {
    x: 48,
    y: height - 502,
    size: 11,
    font,
  });
  page.drawLine({ start: { x: 48, y: 70 }, end: { x: width - 48, y: 70 }, thickness: 1, color: rgb(0.75, 0.75, 0.75) });
  page.drawText(toDisplayPath(dirname(outputPathFromPacket(packet))), { x: 48, y: 45, size: 9, font });
}

function drawSummaryPage(
  pdfDoc: PDFDocument,
  packet: ReceiptPacket,
  included: ReceiptItem[],
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): void {
  const page = pdfDoc.addPage([612, 792]);
  page.drawText("Summary", { x: 48, y: 740, size: 18, font: bold });
  page.drawText(`${packet.claimantName || "Not provided"} — ${packet.claimNumber || "No claim number"}`, {
    x: 48,
    y: 715,
    size: 11,
    font,
  });

  const columns = [
    { key: "#", width: 32 },
    { key: "Vendor", width: 120 },
    { key: "Date", width: 82 },
    { key: "Amount", width: 78 },
    { key: "Category", width: 105 },
    { key: "Reason Summary", width: 195 },
  ];

  let y = 670;
  let x = 48;
  for (const column of columns) {
    page.drawText(column.key, { x, y, size: 10, font: bold });
    x += column.width;
  }
  y -= 18;
  page.drawLine({ start: { x: 48, y }, end: { x: 564, y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });

  included.forEach((receipt, index) => {
    const row = [
      String(index + 1),
      receipt.vendor || "—",
      receipt.purchaseDate || "—",
      receipt.amount || "—",
      receipt.category,
      summarizeReason(receipt.reason),
    ];
    x = 48;
    for (let i = 0; i < columns.length; i += 1) {
      page.drawText(row[i], { x, y, size: 9, font });
      x += columns[i].width;
    }
    y -= 24;
  });

  page.drawLine({ start: { x: 48, y: 45 }, end: { x: 564, y: 45 }, thickness: 1, color: rgb(0.75, 0.75, 0.75) });
}

async function appendPdfReceipt(pdfDoc: PDFDocument, receipt: ReceiptItem): Promise<void> {
  const receiptPdfBytes = await readFile(receipt.filePath);
  const receiptPdf = await PDFDocument.load(receiptPdfBytes);
  const copiedPages = await pdfDoc.copyPages(receiptPdf, receiptPdf.getPageIndices());
  for (const copiedPage of copiedPages) {
    pdfDoc.addPage(copiedPage);
  }
}

async function appendImageReceipt(
  pdfDoc: PDFDocument,
  receipt: ReceiptItem,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): Promise<void> {
  const bytes = await readFile(receipt.filePath);
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  page.drawText(`Receipt #${receiptNumber(pdfDoc, receipt)}`, { x: 48, y: height - 42, size: 14, font: bold });
  page.drawText(`Vendor: ${receipt.vendor || "Not provided"}`, { x: 48, y: height - 64, size: 11, font });
  page.drawText(`Date: ${receipt.purchaseDate || "Not provided"}`, { x: 48, y: height - 82, size: 11, font });
  page.drawText(`Amount: ${receipt.amount || "Not provided"}`, { x: 48, y: height - 100, size: 11, font });
  page.drawText(`Category: ${receipt.category}`, { x: 48, y: height - 118, size: 11, font });

  const image = receipt.mimeType === "image/png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  const dims = fitImage(image.width, image.height, 516, 420);
  const x = (width - dims.width) / 2;
  const y = 300;
  page.drawImage(image, { x, y, width: dims.width, height: dims.height });

  page.drawText("Reason for expense:", { x: 48, y: 260, size: 12, font: bold });
  drawWrappedText(page, receipt.reason || "No reason provided.", 48, 240, 516, 10, font);
  page.drawLine({ start: { x: 48, y: 45 }, end: { x: width - 48, y: 45 }, thickness: 1, color: rgb(0.75, 0.75, 0.75) });
}

function drawReasonPage(
  pdfDoc: PDFDocument,
  _packet: ReceiptPacket,
  receipt: ReceiptItem,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): void {
  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();
  page.drawText(`Reason for Receipt #${receiptNumber(pdfDoc, receipt)}`, { x: 48, y: height - 72, size: 14, font: bold });
  page.drawText(`Vendor: ${receipt.vendor || "Not provided"}`, { x: 48, y: height - 98, size: 11, font });
  page.drawText(`Date: ${receipt.purchaseDate || "Not provided"}`, { x: 48, y: height - 116, size: 11, font });
  page.drawText(`Amount: ${receipt.amount || "Not provided"}`, { x: 48, y: height - 134, size: 11, font });
  page.drawText(`Category: ${receipt.category}`, { x: 48, y: height - 152, size: 11, font });
  page.drawText("Reason for expense:", { x: 48, y: height - 190, size: 12, font: bold });
  drawWrappedText(page, receipt.reason || "No reason provided.", 48, height - 212, 516, 11, font);
  page.drawLine({ start: { x: 48, y: 45 }, end: { x: 564, y: 45 }, thickness: 1, color: rgb(0.75, 0.75, 0.75) });
}

function fitImage(width: number, height: number, maxWidth: number, maxHeight: number): { width: number; height: number } {
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return { width: width * scale, height: height * scale };
}

function drawWrappedText(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): void {
  const words = text.split(/\s+/);
  let line = "";
  let currentY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size, font });
      line = word;
      currentY -= size + 3;
      if (currentY < 80) {
        break;
      }
    } else {
      line = candidate;
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size, font });
  }
}

function sumAmounts(receipts: ReceiptItem[]): number | null {
  let sum = 0;
  let count = 0;
  for (const receipt of receipts) {
    if (!receipt.amount) {
      continue;
    }
    const parsed = Number(String(receipt.amount).replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(parsed)) {
      sum += parsed;
      count += 1;
    }
  }
  return count === 0 ? null : sum;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

function summarizeReason(reason: string): string {
  const trimmed = reason.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed || "—";
}

function receiptNumber(pdfDoc: PDFDocument, receipt: ReceiptItem): number {
  return pdfDoc.getPageCount() - pdfDoc.getPageCount() + receipt.id.length;
}

function buildExportPath(packet: ReceiptPacket): string {
  const date = packet.preparedDate || new Date().toISOString().slice(0, 10);
  const claim = packet.claimNumber.trim().length > 0 ? `_${packet.claimNumber.trim().replace(/[^a-zA-Z0-9._-]+/g, "-")}` : "";
  return `${exportsDir(packet.id)}/WCB_Receipt_Packet${claim}_${date}.pdf`;
}

function outputPathFromPacket(packet: ReceiptPacket): string {
  return `${exportsDir(packet.id)}/WCB_Receipt_Packet_${packet.preparedDate}.pdf`;
}
