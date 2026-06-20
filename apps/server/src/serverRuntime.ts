/**
 * Runtime lifecycle manager for the local Fastify server.
 *
 * Fastify cannot change its bind host after listen() has completed. This
 * runtime owns the active app instance and performs a controlled close/reopen
 * when iPhone/LAN access is enabled or disabled.
 */

import type { FastifyInstance } from "fastify";
import { AccessCodeManager } from "./auth/accessCode.js";
import type { ServerConfig } from "./config/serverConfig.js";
import { buildIphoneAccessStatus, type IPhoneAccessStatus } from "./iphone/iphoneAccess.js";
import { PacketModel } from "./packet/packetModel.js";
import { PacketStore } from "./packet/packetStore.js";
import { ReceiptStorage } from "./receipts/receiptStorage.js";
import { createApp } from "./app.js";

export interface IPhoneAccessController {
  getStatus(): IPhoneAccessStatus;
  scheduleIphoneAccess(enabled: boolean): IPhoneAccessStatus;
}

export class ServerRuntime implements IPhoneAccessController {
  private app: FastifyInstance | null = null;
  private restarting = false;

  constructor(
    private config: ServerConfig,
    private readonly model: PacketModel,
    private readonly store: PacketStore,
    private readonly storage: ReceiptStorage,
    private readonly accessCode: AccessCodeManager,
  ) {}

  async start(): Promise<void> {
    this.app = await this.buildApp();
    await this.listen();
  }

  async stop(): Promise<void> {
    if (!this.app) {
      return;
    }
    await this.app.close();
    this.app = null;
  }

  getStatus(): IPhoneAccessStatus {
    return this.buildStatus();
  }

  scheduleIphoneAccess(enabled: boolean): IPhoneAccessStatus {
    this.config.iphoneAccessEnabled = enabled;
    this.config.host = enabled ? "0.0.0.0" : "127.0.0.1";
    this.accessCode.rotate();

    const status = this.buildStatus();
    this.scheduleRestart();
    return status;
  }

  private async buildApp(): Promise<FastifyInstance> {
    return createApp({
      config: this.config,
      model: this.model,
      store: this.store,
      storage: this.storage,
      accessCode: this.accessCode,
      serverRuntime: this,
    });
  }

  private async listen(): Promise<void> {
    if (!this.app) {
      throw new Error("Server app is not initialized.");
    }
    await this.app.listen({ port: this.config.port, host: this.config.host });
  }

  private buildStatus(): IPhoneAccessStatus {
    const accessStatus = this.accessCode.status(this.config.iphoneAccessEnabled);
    return buildIphoneAccessStatus(
      this.config.iphoneAccessEnabled,
      this.config.host,
      this.config.port,
      accessStatus.code,
      accessStatus.expiresAt,
      accessStatus.ttlSeconds,
    );
  }

  private scheduleRestart(): void {
    if (this.restarting) {
      return;
    }

    this.restarting = true;
    setTimeout(() => {
      this.restart()
        .catch((error) => {
          this.app?.log.error({ error }, "iPhone access restart failed.");
        })
        .finally(() => {
          this.restarting = false;
        });
    }, 50);
  }

  private async restart(): Promise<void> {
    const previousApp = this.app;
    if (!previousApp) {
      this.restarting = false;
      return;
    }

    await previousApp.close();
    this.app = await this.buildApp();
    await this.listen();
    this.restarting = false;
    this.app.log.info({ host: this.config.host, port: this.config.port }, "Server restarted for iPhone access.");
  }
}
