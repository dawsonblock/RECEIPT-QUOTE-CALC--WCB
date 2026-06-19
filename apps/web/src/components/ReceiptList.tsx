import type { ReceiptItem } from "@wcb/shared";
import { formatCurrency } from "../utils/formatCurrency.js";

interface ReceiptListProps {
  receipts: ReceiptItem[];
  selectedId?: string;
  onSelect: (receiptId: string) => void;
}

export function ReceiptList({ receipts, selectedId, onSelect }: ReceiptListProps) {
  return (
    <section className="panel receipt-list">
      <h2>Receipts</h2>
      {receipts.length === 0 ? (
        <p className="muted">No receipts yet. Add one to start the packet.</p>
      ) : (
        <ul>
          {receipts.map((receipt, index) => (
            <li key={receipt.id} className={selectedId === receipt.id ? "selected" : ""} onClick={() => onSelect(receipt.id)}>
              <strong>
                {index + 1}. {receipt.vendor || receipt.originalFileName}
              </strong>
              <span>{receipt.purchaseDate || "No date"} · {receipt.amount ? formatCurrency(receipt.amount) : "No amount"}</span>
              {!receipt.includeInExport && <span className="badge">Excluded</span>}
              {receipt.reason.trim().length === 0 && <span className="badge warning">Missing reason</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
