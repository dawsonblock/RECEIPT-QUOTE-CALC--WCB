import type { ReceiptItem } from "@wcb/shared";
import { receiptFileUrl } from "../api/receiptApi.js";

interface ReceiptPreviewProps {
  receipt: ReceiptItem;
}

export function ReceiptPreview({ receipt }: ReceiptPreviewProps) {
  const url = receiptFileUrl(receipt.id);

  if (receipt.fileType === "pdf") {
    return (
      <div className="receipt-preview receipt-preview-pdf">
        <embed src={url} type="application/pdf" width="100%" height="520px" />
      </div>
    );
  }

  return (
    <div className="receipt-preview receipt-preview-image">
      <img src={url} alt={receipt.originalFileName} />
    </div>
  );
}
