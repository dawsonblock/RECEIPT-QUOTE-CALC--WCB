import { useEffect, useState } from "react";
import type { ExportRecord, ReceiptPacket, ValidationIssue } from "@wcb/shared";
import { exportDownloadUrl, generatePdf, getLatestExport } from "../api/exportApi.js";
import { validatePacket } from "../utils/validation.js";
import { ValidationWarnings } from "./ValidationWarnings.js";

interface ExportPanelProps {
  packet: ReceiptPacket;
  onExported: (record: ExportRecord) => void;
}

export function ExportPanel({ packet, onExported }: ExportPanelProps) {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [latest, setLatest] = useState<ExportRecord | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIssues(validatePacket(packet));
  }, [packet]);

  async function refreshLatest() {
    try {
      const data = await getLatestExport();
      setLatest(data.exportRecord);
    } catch {
      setLatest(null);
    }
  }

  useEffect(() => {
    refreshLatest().catch(() => undefined);
  }, []);

  async function handleGenerate() {
    setBusy(true);
    setMessage("");
    try {
      const data = await generatePdf();
      setLatest(data.exportRecord);
      onExported(data.exportRecord);
      setMessage("PDF generated successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF generation failed.");
    } finally {
      setBusy(false);
    }
  }

  const hasErrors = issues.some((issue) => issue.level === "error");

  return (
    <section className="panel export-panel">
      <h2>Export</h2>
      <ValidationWarnings issues={issues} />
      <div className="field-row">
        <button type="button" onClick={handleGenerate} disabled={busy || hasErrors}>
          Generate PDF Packet
        </button>
        {latest && (
          <>
            <a href={exportDownloadUrl(latest.id)} target="_blank" rel="noreferrer">
              Download Latest PDF
            </a>
            <button type="button" onClick={() => window.open(exportDownloadUrl(latest.id), "_blank")}>
              Open Latest PDF
            </button>
          </>
        )}
      </div>
      {message && <p>{message}</p>}
      {latest && <p className="hint">Latest PDF: {latest.fileName}</p>}
    </section>
  );
}
