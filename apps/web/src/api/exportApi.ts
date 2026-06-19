import type { ExportResponse, ExportRecord } from "@wcb/shared";
import { apiPath, apiRequest } from "./client.js";

export async function generatePdf(): Promise<ExportResponse> {
  return apiRequest(apiPath("/export/pdf"), { method: "POST" });
}

export async function getLatestExport(): Promise<{ exportRecord: ExportRecord; downloadUrl: string }> {
  return apiRequest(apiPath("/export/latest"));
}

export function exportDownloadUrl(id: string): string {
  return apiPath(`/export/${id}`);
}
