import { useEffect, useMemo, useState } from "react";
import type { ReceiptItem, ReceiptPacket, ExportRecord } from "@wcb/shared";
import { createPacket, getPacket, savePacket } from "../api/packetApi.js";
import { deleteReceipt, saveReceipt } from "../api/receiptApi.js";
import { ExportPanel } from "../components/ExportPanel.js";
import { IPhoneAccessPanel } from "../components/IPhoneAccessPanel.js";
import { PacketHeader } from "../components/PacketHeader.js";
import { ReceiptEditor } from "../components/ReceiptEditor.js";
import { ReceiptList } from "../components/ReceiptList.js";
import { ReceiptPreview } from "../components/ReceiptPreview.js";
import { ReceiptUploadButton } from "../components/ReceiptUploadButton.js";

export function App() {
  const [packet, setPacket] = useState<ReceiptPacket | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedReceipt = useMemo(
    () => packet?.receipts.find((receipt) => receipt.id === selectedReceiptId) ?? packet?.receipts[0] ?? null,
    [packet, selectedReceiptId],
  );

  useEffect(() => {
    getPacket()
      .then((data) => {
        setPacket(data.packet);
        setSelectedReceiptId(data.packet.receipts[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, []);

  async function handleNewPacket() {
    setBusy(true);
    try {
      const data = await createPacket({ claimantName: "Dawson Block", claimNumber: "" });
      setPacket(data.packet);
      setSelectedReceiptId(null);
      setMessage("New packet created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create packet.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePatchPacket(patch: Partial<ReceiptPacket>) {
    if (!packet) {
      return;
    }
    const next = { ...packet, ...patch };
    setPacket(next);
    try {
      const data = await savePacket(next);
      setPacket(data.packet);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save packet.");
    }
  }

  async function handleSaveReceipt(receiptId: string, patch: Partial<ReceiptItem>) {
    if (!packet) {
      return;
    }
    const current = packet.receipts.find((receipt) => receipt.id === receiptId);
    if (!current) {
      return;
    }
    const nextReceipt = { ...current, ...patch };
    const nextPacket = {
      ...packet,
      receipts: packet.receipts.map((receipt) => (receipt.id === receiptId ? nextReceipt : receipt)),
      updatedAt: new Date().toISOString(),
    };
    setPacket(nextPacket);

    try {
      const data = await saveReceipt(nextReceipt);
      setPacket(data.packet);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save receipt.");
    }
  }

  async function handleDeleteReceipt(receiptId: string) {
    if (!packet) {
      return;
    }
    try {
      const data = await deleteReceipt(receiptId);
      setPacket(data.packet);
      setSelectedReceiptId(data.packet.receipts[0]?.id ?? null);
      setMessage("Receipt removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove receipt.");
    }
  }

  function handleExported(record: ExportRecord) {
    if (!packet) {
      return;
    }
    setPacket({
      ...packet,
      exportHistory: [...packet.exportHistory, record],
      updatedAt: new Date().toISOString(),
    });
  }

  if (!packet) {
    return (
      <main className="app-shell setup">
        <section className="panel hero">
          <h1>WCB Receipt Builder</h1>
          <p>A local-first Mac-hosted receipt packet builder for WCB submissions.</p>
          <button type="button" onClick={() => handleNewPacket()} disabled={busy}>
            New Packet
          </button>
          {message && <p>{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <PacketHeader packet={packet} onChange={handlePatchPacket} />
        <section className="panel actions">
          <h2>Receipts</h2>
          <ReceiptUploadButton packetId={packet.id} onUploaded={(receipt) => setSelectedReceiptId(receipt.id)} disabled={busy} />
          <button type="button" onClick={() => handleNewPacket()} disabled={busy}>
            New Packet
          </button>
        </section>
        <ReceiptList receipts={packet.receipts} selectedId={selectedReceipt?.id} onSelect={setSelectedReceiptId} />
        <IPhoneAccessPanel />
      </aside>

      <section className="workspace">
        {selectedReceipt ? (
          <>
            <ReceiptPreview receipt={selectedReceipt} />
            <ReceiptEditor
              receipt={selectedReceipt}
              onChange={(patch) => handleSaveReceipt(selectedReceipt.id, patch)}
              onRemove={() => handleDeleteReceipt(selectedReceipt.id)}
            />
          </>
        ) : (
          <section className="panel empty-state">
            <h2>No receipt selected</h2>
            <p>Add a receipt screenshot, photo, PDF, or scanned document to start building the packet.</p>
          </section>
        )}
        <ExportPanel packet={packet} onExported={handleExported} />
      </section>

      {message && <div className="toast">{message}</div>}
    </main>
  );
}
