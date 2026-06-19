import type { ReceiptItem } from "@wcb/shared";
import { RECEIPT_CATEGORY_LABELS, RECEIPT_CATEGORIES, MIN_REASON_LENGTH } from "@wcb/shared";

interface ReceiptEditorProps {
  receipt: ReceiptItem;
  onChange: (patch: Partial<ReceiptItem>) => void;
  onRemove: () => void;
}

export function ReceiptEditor({ receipt, onChange, onRemove }: ReceiptEditorProps) {
  return (
    <section className="panel receipt-editor">
      <h2>Selected Receipt</h2>
      <div className="field-row">
        <label>
          Vendor
          <input value={receipt.vendor} onChange={(event) => onChange({ vendor: event.target.value })} placeholder="Vendor name" />
        </label>
        <label>
          Date
          <input type="date" value={receipt.purchaseDate ?? ""} onChange={(event) => onChange({ purchaseDate: event.target.value || null })} />
        </label>
        <label>
          Amount
          <input value={receipt.amount ?? ""} onChange={(event) => onChange({ amount: event.target.value || null })} placeholder="$42.10" />
        </label>
      </div>

      <label>
        Category
        <select value={receipt.category} onChange={(event) => onChange({ category: event.target.value as ReceiptItem["category"] })}>
          {RECEIPT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {RECEIPT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Reason for expense
        <span className="hint">Explain why this receipt is related to your WCB claim. Minimum {MIN_REASON_LENGTH} characters.</span>
        <textarea
          value={receipt.reason}
          onChange={(event) => onChange({ reason: event.target.value })}
          placeholder="Explain why this expense is needed for your claim."
          rows={7}
        />
      </label>

      <label>
        Notes
        <textarea value={receipt.notes} onChange={(event) => onChange({ notes: event.target.value })} placeholder="Optional notes" rows={3} />
      </label>

      <div className="field-row actions">
        <label className="checkbox">
          <input type="checkbox" checked={receipt.includeInExport} onChange={(event) => onChange({ includeInExport: event.target.checked })} />
          Include in PDF
        </label>
        <button type="button" onClick={() => onChange({ rotation: ((receipt.rotation + 90) % 360) as ReceiptItem["rotation"] })}>
          Rotate right
        </button>
        <button type="button" className="danger" onClick={onRemove}>
          Remove Receipt
        </button>
      </div>
    </section>
  );
}
