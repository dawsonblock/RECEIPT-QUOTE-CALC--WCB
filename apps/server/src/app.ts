/** Fastify app factory. */

import Fastify, { type FastifyError, type FastifyInstance, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import staticPlugin from "@fastify/static";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AccessCodeManager } from "./auth/accessCode.js";
import { buildIphoneAccessStatus } from "./iphone/iphoneAccess.js";
import { PacketModel } from "./packet/packetModel.js";
import { PacketStore } from "./packet/packetStore.js";
import { validatePacketForExport } from "./packet/packetValidation.js";
import { registerReceiptRoutes } from "./receipts/receiptRoutes.js";
import { ReceiptStorage } from "./receipts/receiptStorage.js";
import { badRequest } from "./security/errorHandler.js";
import { loadServerConfig } from "./config/serverConfig.js";
import type { IPhoneAccessController } from "./serverRuntime.js";

interface AppOptions {
  config?: ReturnType<typeof loadServerConfig>;
  model?: PacketModel;
  store?: PacketStore;
  storage?: ReceiptStorage;
  accessCode?: AccessCodeManager;
  serverRuntime?: IPhoneAccessController;
}

export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadServerConfig();
  const model = options.model ?? new PacketModel();
  const store = options.store ?? new PacketStore();
  const storage = options.storage ?? new ReceiptStorage();
  const accessCode = options.accessCode ?? new AccessCodeManager();
  const serverRuntime = options.serverRuntime;
  const webRoot = findExistingWebRoot();

  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowedOrigins = [config.webOrigin, "http://localhost:5173", "http://127.0.0.1:5173", "tauri://localhost"];
      if (allowedOrigins.includes(origin) || origin.startsWith("tauri://")) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by the local Mac server."), false);
    },
    credentials: true,
  });
  await app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  });

  app.get("/api/status", async () => ({
    ok: true,
    app: "wcb-receipt-builder",
    version: "0.1.0",
    serverTime: new Date().toISOString(),
    packetLoaded: model.current != null,
  }));

  app.post("/api/auth/login", async (request, reply) => {
    const { code } = request.body as { code?: string };
    if (!code || !accessCode.verify(code)) {
      return reply.code(401).send({ ok: false, message: "Invalid or expired access code." });
    }
    return reply.send({ ok: true, message: "Access granted." });
  });

  app.post("/api/auth/logout", async () => ({ ok: true }));

  app.post("/api/packet/new", async (request, reply) => {
    const body = request.body as { claimantName?: string; claimNumber?: string } | undefined;
    const packet = model.createNewPacket(body?.claimantName ?? "Dawson Block", body?.claimNumber ?? "");
    await store.save(packet);
    return reply.code(201).send({ packet });
  });

  app.get("/api/packet", async (_request, reply) => {
    if (!model.current) {
      return reply.code(404).send({ message: "No packet loaded." });
    }
    return reply.send({ packet: model.current });
  });

  app.put("/api/packet", async (request, reply) => {
    const packet = model.updatePacket(request.body as Record<string, unknown>);
    await store.save(packet);
    return reply.send({ packet });
  });

  registerReceiptRoutes(app, { model, store, storage });

  app.post("/api/export/pdf", async (_request, reply) => {
    const packet = model.current;
    if (!packet) {
      throw badRequest("No packet loaded.");
    }

    const validation = await validatePacketForExport(packet);
    if (!validation.canExport) {
      return reply.code(400).send({ message: "Packet failed validation.", validation });
    }

    const { generateReceiptPacketPDF } = await import("./export/pdfGenerator.js");
    const record = await generateReceiptPacketPDF(packet);
    model.addExportRecord(record);
    await store.save(model.current);
    return reply.send({ exportRecord: record, downloadUrl: `/api/export/${record.id}` });
  });

  app.get("/api/export/latest", async (_request, reply) => {
    const packet = model.current;
    if (!packet) {
      return reply.code(404).send({ message: "No packet loaded." });
    }
    const latest = [...packet.exportHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!latest) {
      return reply.code(404).send({ message: "No exports yet." });
    }
    return reply.send({ exportRecord: latest, downloadUrl: `/api/export/${latest.id}` });
  });

  app.get("/api/export/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const packet = model.current;
    if (!packet) {
      return reply.code(404).send({ message: "No packet loaded." });
    }
    const record = packet.exportHistory.find((item) => item.id === request.params.id);
    if (!record) {
      return reply.code(404).send({ message: "Export not found." });
    }
    const { readFile } = await import("node:fs/promises");
    const bytes = await readFile(record.filePath);
    return reply.header("Content-Type", "application/pdf").header("Content-Disposition", `inline; filename="${record.fileName}"`).send(bytes);
  });

  app.get("/api/iphone-access", async () => {
    const status = serverRuntime?.getStatus();
    return status ?? buildIphoneAccessStatus(config.iphoneAccessEnabled, config.host, config.port, accessCode.status(config.iphoneAccessEnabled).code, accessCode.status(config.iphoneAccessEnabled).expiresAt, accessCode.status(config.iphoneAccessEnabled).ttlSeconds);
  });

  app.post("/api/iphone-access/enable", async (_request, reply) => {
    const status = serverRuntime?.scheduleIphoneAccess(true);
    if (!status) {
      return reply.send({ enabled: true, message: "iPhone access enabled. Restart the server on 0.0.0.0 from the Mac shell to allow LAN access." });
    }
    return reply.send({ ...status, message: "iPhone access enabled. The server is restarting on 0.0.0.0 for LAN access." });
  });

  app.post("/api/iphone-access/disable", async (_request, reply) => {
    const status = serverRuntime?.scheduleIphoneAccess(false);
    if (!status) {
      return reply.send({ enabled: false, message: "iPhone access disabled." });
    }
    return reply.send({ ...status, message: "iPhone access disabled. The server is restarting on 127.0.0.1." });
  });

  if (webRoot) {
    app.register(staticPlugin, {
      root: join(webRoot, "assets"),
      prefix: "/assets/",
    });

    app.get("/*", async (_request, reply) => {
      const index = join(webRoot, "index.html");
      return reply.type("html").sendFile(index);
    });
  }

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;
    return reply.code(statusCode).send({ message: error.message });
  });

  return app;
}

function findExistingWebRoot(): string | null {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(moduleDir, "../../../apps/web/dist"),
    join(moduleDir, "../../../../../apps/web/dist"),
    join(process.cwd(), "../../apps/web/dist"),
    join(process.cwd(), "apps/web/dist"),
    join(process.cwd(), "dist/apps/web/dist"),
  ];

  return candidates.find((candidate) => existsSync(join(candidate, "index.html"))) ?? null;
}
