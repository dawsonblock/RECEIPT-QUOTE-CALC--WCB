/**
 * WCB Receipt Packet Builder — shared domain types.
 *
 * These types are the single source of truth for the data model and are
 * imported by both the Fastify backend and the React frontend.
 *
 * Storage is local JSON only (no database) for v1, per the build plan.
 */

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

export type ReceiptCategory =
  | "medical_supplies"
  | "medication"
  | "equipment"
  | "travel"
  | "parking"
  | "home_care"
  | "therapy"
  | "other";

export const RECEIPT_CATEGORIES: ReceiptCategory[] = [
  "medical_supplies",
  "medication",
  "equipment",
  "travel",
  "parking",
  "home_care",
  "therapy",
  "other",
];

export const RECEIPT_CATEGORY_LABELS: Record<ReceiptCategory, string> = {
  medical_supplies: "Medical Supplies",
  medication: "Medication",
  equipment: "Equipment",
  travel: "Travel",
  parking: "Parking",
  home_care: "Home Care",
  therapy: "Therapy",
  other: "Other",
};

export type ReceiptFileType = "image" | "pdf";

export type ReviewStatus = "needs_review" | "reviewed";

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export interface ReceiptItem {
  id: string;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  fileType: ReceiptFileType;
  mimeType: string;
  sha256: string;
  vendor: string;
  purchaseDate: string | null;
  amount: string | null;
  category: ReceiptCategory;
  reason: string;
  notes: string;
  includeInExport: boolean;
  reviewStatus: ReviewStatus;
  /** Rotation in degrees applied for display/export (0, 90, 180, 270). */
  rotation: 0 | 90 | 180 | 270;
  createdAt: string;
  updatedAt: string;
}

export interface ExportRecord {
  id: string;
  fileName: string;
  filePath: string;
  createdAt: string;
  receiptCount: number;
}

export interface ReceiptPacket {
  id: string;
  claimantName: string;
  claimNumber: string;
  preparedDate: string;
  packetTitle: string;
  createdAt: string;
  updatedAt: string;
  receipts: ReceiptItem[];
  exportHistory: ExportRecord[];
}

// ---------------------------------------------------------------------------
// API contracts
// ---------------------------------------------------------------------------

export interface StatusResponse {
  ok: true;
  app: "wcb-receipt-builder";
  version: string;
  serverTime: string;
  packetLoaded: boolean;
}

export interface PacketSummary {
  id: string;
  claimantName: string;
  claimNumber: string;
  preparedDate: string;
  packetTitle: string;
  receiptCount: number;
  includedCount: number;
  totalAmount: number | null;
  updatedAt: string;
}

export interface ReceiptUploadResponse {
  packet: ReceiptPacket;
  receipt: ReceiptItem;
  duplicate: boolean;
}

export interface ExportResponse {
  exportRecord: ExportRecord;
  downloadUrl: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationLevel = "error" | "warning";

export interface ValidationIssue {
  level: ValidationLevel;
  code: string;
  message: string;
  receiptId?: string;
}

export interface PacketValidationResult {
  canExport: boolean;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
}

/** Minimum reason length to be considered a valid explanation. */
export const MIN_REASON_LENGTH = 10;

/** Maximum upload size in bytes (25 MB). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Accepted MIME types for receipt uploads. */
export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export const ACCEPTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
  ".pdf",
] as const;