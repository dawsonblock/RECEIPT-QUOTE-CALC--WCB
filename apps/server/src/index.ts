/** Server entrypoint. */

import { loadServerConfig } from "./config/serverConfig.js";
import { AccessCodeManager } from "./auth/accessCode.js";
import { PacketModel } from "./packet/packetModel.js";
import { PacketStore } from "./packet/packetStore.js";
import { ReceiptStorage } from "./receipts/receiptStorage.js";
import { ServerRuntime } from "./serverRuntime.js";

const config = loadServerConfig();
const model = new PacketModel();
const store = new PacketStore();
const storage = new ReceiptStorage();
const accessCode = new AccessCodeManager();
const runtime = new ServerRuntime(config, model, store, storage, accessCode);

try {
  await runtime.start();
} catch (error) {
  console.error(error);
  process.exit(1);
}
