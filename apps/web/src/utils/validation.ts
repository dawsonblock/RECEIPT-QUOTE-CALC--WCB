import type { ReceiptPacket, ValidationIssue } from "@wcb/shared";
import { MIN_REASON_LENGTH } from "@wcb/shared";

export function validatePacket(packet: ReceiptPacket): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (packet.claimNumber.trim().length === 0) {
    issues.push({ level: "error", code: "missing_claim_number", message: "Claim number is required before export." });
  }

  const included = packet.receipts.filter((receipt) => receipt.includeInExport);
  if (included.length === 0) {
    issues.push({ level: "error", code: "no_included_receipts", message: "At least one receipt must be included." });
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
    if (!receipt.vendor) {
      issues.push({ level: "warning", code: "missing_vendor", message: `Receipt "${receipt.originalFileName}" is missing vendor.`, receiptId: receipt.id });
    }
    if (!receipt.purchaseDate) {
      issues.push({ level: "warning", code: "missing_date", message: `Receipt "${receipt.originalFileName}" is missing date.`, receiptId: receipt.id });
    }
    if (!receipt.amount) {
      issues.push({ level: "warning", code: "missing_amount", message: `Receipt "${receipt.originalFileName}" is missing amount.`, receiptId: receipt.id });
    }
  }

  return issues;
}
