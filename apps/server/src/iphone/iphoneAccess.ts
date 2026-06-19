/**
 * iPhone access status.
 *
 * Runtime rebind from 127.0.0.1 to 0.0.0.0 is intentionally handled by the
 * Mac shell/Tauri phase. This module provides the contract and local status
 * shown in the web UI.
 */

export interface IPhoneAccessStatus {
  enabled: boolean;
  host: string;
  url: string;
  accessCode: string;
  expiresAt: string;
  ttlSeconds: number;
  message: string;
}

export function buildIphoneAccessStatus(
  enabled: boolean,
  host: string,
  port: number,
  accessCode: string,
  expiresAt: string,
  ttlSeconds: number,
): IPhoneAccessStatus {
  const displayHost = host === "0.0.0.0" ? `${hostnameSafe()}${port === 8787 ? "" : `:${port}`}` : `localhost:${port}`;
  const url = `http://${displayHost}`;
  return {
    enabled,
    host: displayHost,
    url,
    accessCode,
    expiresAt,
    ttlSeconds,
    message: enabled
      ? "iPhone access is enabled. Only devices on your Wi-Fi can connect."
      : "iPhone access is off. The app is available on this Mac only.",
  };
}

function hostnameSafe(): string {
  const raw = process.env.HOSTNAME || "Mac";
  const safe = raw.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
  return safe.length > 0 ? `${safe}.local` : "Mac.local";
}
