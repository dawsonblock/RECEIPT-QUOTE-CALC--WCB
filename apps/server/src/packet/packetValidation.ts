/**
 * Export validation rules.
 *
 * Block export if:
 * - no receipts included
 * - claim number is empty
 * - any included receipt has no reason
 * - receipt file is missing
 * - receipt file cannot be read
 *
 * Warn for:
 * - missing vendor/date/amount
 * - duplicate receipt hash
 * - low image resolution (later)
 */

import { access } from "node:fs/promises";
import type { ReceiptPacket, PacketValidationResult, ValidationIssue } from "@wcb/shared";
import { MIN_REASON_LENGTH } from "@wcb/shared";

export async function validatePacketForExport(packet: ReceiptPacket): Promise<PacketValidationResult> {
  const issues: ValidationIssue[] = [];

  const included = packet.receipts.filter((receipt) => receipt.includeInExport);

  if (packet.claimNumber.trim().length === 0) {
    issues.push({
      level: "error",
      code: "missing_claim_number",
      message: "Claim number is required before export.",
    });
  }

  if (included.length === 0) {
    issues.push({
      level: "error",
      code: "no_included_receipts",
      message: "At least one receipt must be included in the PDF.",
    });
  }

  for (const receipt of included) {
    if (receipt.reason.trim().length < MIN_REASON_LENGTH) {
      issues.push({
        level: "error",
        code: "missing_reason",
        message: `Receipt "${receipt.originalFileName}" needs a reason of at least ${MIN_REASON_LENGTH} characters.`,
        receiptId: receipt.id,
      });
    }

    if (receipt.vendor.trim().length === 0) {
      issues.push({
        level: "warning",
        code: "missing_vendor",
        message: `Receipt "${receipt.originalFileName}" is missing vendor.`,
        receiptId: receipt.id,
      });
    }

    if (!receipt.purchaseDate) {
      issues.push({
        level: "warning",
        code: "missing_date",
        message: `Receipt "${receipt.originalFileName}" is missing date.`,
        receiptId: receipt.id,
      });
    }

    if (!receipt.amount || receipt.amount.trim().length === 0) {
      issues.push({
        level: "warning",
        code: "missing_amount",
        message: `Receipt "${receipt.originalFileName}" is missing amount.`,
        receiptId: receipt.id,
      });
    }

    try {
      await access(receipt.filePath);
    } catch {
      issues.push({
        level: "error",
        code: "missing_receipt_file",
        message: `Receipt file is missing for "${receipt.originalFileName}".`,
        receiptId: receipt.id,
      });
    }
  }

  const seen = new Set<string>();
  for (const receipt of included) {
    if (seen.has(receipt.sha256)) {
      issues.push({
        level: "warning",
        code: "duplicate_receipt",
        message: `Receipt "${receipt.originalFileName}" appears to be a duplicate.`,
        receiptId: receipt.id,
      });
    }
    seen.add(receipt.sha256);
  }

  return {
    canExport: issues.filter((issue) => issue.level === "error").length === 0,
    issues,
    errorCount: issues.filter((issue) => issue.level === "error").length,
    warningCount: issues.filter((issue) => issue.level === "warning").length,
  };
}
