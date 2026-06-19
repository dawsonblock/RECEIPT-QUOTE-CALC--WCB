/**
 * Receipt routes.
 *
 * Endpoints:
 * - POST /api/receipts
 * - PUT  /api/receipts/:id
 * - DELETE /api/receipts/:id
 * - POST /api/receipts/reorder
 * - GET  /api/receipts/:id/file
 */

import type { FastifyInstance, FastifyRequest } from "fastify";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { ReceiptItem, ReceiptUploadResponse } from "@wcb/shared";
import { PacketModel } from "../packet/packetModel.js";
import { PacketStore } from "../packet/packetStore.js";
import { badRequest, notFound } from "../security/errorHandler.js";
import { validateReceiptFile } from "../security/fileValidation.js";
import { ReceiptStorage } from "./receiptStorage.js";

interface ReceiptRouteDeps {
  model: PacketModel;
  store: PacketStore;
  storage: ReceiptStorage;
}

export function registerReceiptRoutes(app: FastifyInstance, deps: ReceiptRouteDeps): void {
  app.post("/api/receipts", async (request: FastifyRequest, reply) => {
    const packet = deps.model.current;
    if (!packet) {
      throw badRequest("No packet loaded.");
    }

    const data = await request.file();
    if (!data) {
      throw badRequest("No receipt file uploaded.");
    }

    const buffer = await data.toBuffer();
    const validation = validateReceiptFile(data.filename, data.mimetype, buffer.length);
    const receipt = await deps.storage.createReceipt({
      packetId: packet.id,
      sourceBuffer: buffer,
      originalName: data.filename,
      mimeType: validation.mimeType,
    });

    deps.model.addReceipt(receipt);
    await deps.store.save(packet);

    const response: ReceiptUploadResponse = {
      packet,
      receipt,
      duplicate: false,
    };

    return reply.code(201).send(response);
  });

  app.put("/api/receipts/:id", async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<ReceiptItem> }>, reply) => {
    const packet = deps.model.current;
    if (!packet) {
      throw badRequest("No packet loaded.");
    }

    const updated = deps.model.updateReceipt(request.params.id, request.body ?? {});
    await deps.store.save(packet);
    return reply.send({ packet: updated, receipt: updated.receipts.find((r) => r.id === request.params.id) });
  });

  app.delete("/api/receipts/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const packet = deps.model.current;
    if (!packet) {
      throw badRequest("No packet loaded.");
    }

    const receipt = packet.receipts.find((r) => r.id === request.params.id);
    if (!receipt) {
      throw notFound("Receipt not found.");
    }

    deps.model.deleteReceipt(request.params.id);
    await deps.store.save(packet);
    return reply.send({ packet: deps.model.current, deletedReceipt: receipt });
  });

  app.post("/api/receipts/reorder", async (request: FastifyRequest<{ Body: { receiptIds: string[] } }>, reply) => {
    const packet = deps.model.current;
    if (!packet) {
      throw badRequest("No packet loaded.");
    }

    const updated = deps.model.reorderReceipts(request.body.receiptIds);
    await deps.store.save(packet);
    return reply.send({ packet: updated });
  });

  app.get("/api/receipts/:id/file", async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const packet = deps.model.current;
    if (!packet) {
      throw badRequest("No packet loaded.");
    }

    const receipt = packet.receipts.find((r) => r.id === request.params.id);
    if (!receipt) {
      throw notFound("Receipt not found.");
    }

    const bytes = await readFile(receipt.filePath);
    return reply
      .header("Content-Type", receipt.mimeType)
      .header("Content-Disposition", `inline; filename="${basename(receipt.originalFileName)}"`)
      .send(bytes);
  });
}
