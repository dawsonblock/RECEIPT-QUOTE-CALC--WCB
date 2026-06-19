/**
 * Temporary iPhone access code.
 *
 * Code is generated on server start, resets every launch, and expires after 12
 * hours unless the app is closed sooner.
 */

import { randomInt } from "node:crypto";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface AccessCodeStatus {
  enabled: boolean;
  code: string;
  expiresAt: string;
  ttlSeconds: number;
}

export class AccessCodeManager {
  private code: string;
  private expiresAt: Date;

  constructor() {
    this.code = this.generateCode();
    this.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  }

  rotate(): void {
    this.code = this.generateCode();
    this.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  }

  verify(code: string): boolean {
    if (Date.now() > this.expiresAt.getTime()) {
      this.rotate();
      return false;
    }
    return code.trim() === this.code;
  }

  status(enabled: boolean): AccessCodeStatus {
    const ttlSeconds = Math.max(0, Math.floor((this.expiresAt.getTime() - Date.now()) / 1000));
    return {
      enabled,
      code: this.code,
      expiresAt: this.expiresAt.toISOString(),
      ttlSeconds,
    };
  }

  private generateCode(): string {
    return String(randomInt(10000, 99999));
  }
}
