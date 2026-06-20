import type { ReceiptItem, ReceiptPacket, ReceiptUploadResponse } from "@wcb/shared";
import { apiPath, apiRequest } from "./client.js";

export async function uploadReceipt(file: File, packetId: string): Promise<ReceiptUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("packetId", packetId);

  return apiRequest(apiPath("/receipts"), {
    method: "POST",
    body: form,
  });
}

export async function saveReceipt(receipt: ReceiptItem): Promise<{ packet: ReceiptPacket; receipt: ReceiptItem }> {
  return apiRequest(apiPath(`/receipts/${receipt.id}`), {
    method: "PUT",
    body: JSON.stringify(receipt),
  });
}

export async function deleteReceipt(receiptId: string): Promise<{ packet: ReceiptPacket; deletedReceipt: ReceiptItem }> {
  return apiRequest(apiPath(`/receipts/${receiptId}`), {
    method: "DELETE",
  });
}

export async function reorderReceipts(receiptIds: string[]): Promise<{ packet: ReceiptPacket }> {
  return apiRequest(apiPath("/receipts/reorder"), {
    method: "POST",
    body: JSON.stringify({ receiptIds }),
  });
}

export function receiptFileUrl(receiptId: string): string {
  return apiPath(`/receipts/${receiptId}/file`);
}
