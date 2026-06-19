import type { ReceiptPacket, StatusResponse } from "@wcb/shared";
import { apiPath, apiRequest } from "./client.js";

export async function getStatus(): Promise<StatusResponse> {
  return apiRequest(apiPath("/status"));
}

export async function createPacket(payload: { claimantName?: string; claimNumber?: string }): Promise<{ packet: ReceiptPacket }> {
  return apiRequest(apiPath("/packet/new"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPacket(): Promise<{ packet: ReceiptPacket }> {
  return apiRequest(apiPath("/packet"));
}

export async function savePacket(packet: ReceiptPacket): Promise<{ packet: ReceiptPacket }> {
  return apiRequest(apiPath("/packet"), {
    method: "PUT",
    body: JSON.stringify(packet),
  });
}
