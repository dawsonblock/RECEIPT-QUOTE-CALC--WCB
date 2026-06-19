/**
 * Server configuration: port, bind host, and runtime toggles.
 *
 * Security model (build plan §9, §12):
 * - Default bind is 127.0.0.1 (loopback only) so only the Mac can reach it.
 * - iPhone access is OFF by default and must be explicitly enabled, at which
 *   point the server rebinds to 0.0.0.0 to allow same-Wi-Fi devices.
 * - Never expose outside the home network. No port forwarding, no public host.
 */

export const DEFAULT_PORT = 8787;

export interface ServerConfig {
  port: number;
  /** Current bind host. 127.0.0.1 = loopback only; 0.0.0.0 = LAN. */
  host: string;
  /** Whether iPhone (LAN) access is currently enabled. */
  iphoneAccessEnabled: boolean;
  /** Web frontend dev origin (for CORS in dev). */
  webOrigin: string;
}

export function loadServerConfig(): ServerConfig {
  const port = Number(process.env.WCB_PORT ?? DEFAULT_PORT);
  const iphoneAccessEnabled = process.env.WCB_IPHONE_ACCESS === "1";
  const host = iphoneAccessEnabled ? "0.0.0.0" : "127.0.0.1";
  const webOrigin = process.env.WCB_WEB_ORIGIN ?? "http://localhost:5173";
  return { port, host, iphoneAccessEnabled, webOrigin };
}