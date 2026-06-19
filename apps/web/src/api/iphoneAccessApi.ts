import { apiPath, apiRequest } from "./client.js";

export interface IPhoneAccessStatus {
  enabled: boolean;
  host: string;
  url: string;
  accessCode: string;
  expiresAt: string;
  ttlSeconds: number;
  message: string;
}

export async function getIphoneAccess(): Promise<IPhoneAccessStatus> {
  return apiRequest(apiPath("/iphone-access"));
}

export async function enableIphoneAccess(): Promise<{ enabled: boolean; message: string }> {
  return apiRequest(apiPath("/iphone-access/enable"), { method: "POST" });
}

export async function disableIphoneAccess(): Promise<{ enabled: boolean; message: string }> {
  return apiRequest(apiPath("/iphone-access/disable"), { method: "POST" });
}
