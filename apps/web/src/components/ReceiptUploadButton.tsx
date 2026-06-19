import { useRef, type ChangeEvent } from "react";
import type { ReceiptItem } from "@wcb/shared";

interface ReceiptUploadButtonProps {
  packetId: string;
  onUploaded: (receipt: ReceiptItem) => void;
  disabled?: boolean;
}

export function ReceiptUploadButton({ packetId, onUploaded, disabled = false }: ReceiptUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const response = await fetch("/api/receipts", {
      method: "POST",
      body: (() => {
        const form = new FormData();
        form.append("file", file);
        form.append("packetId", packetId);
        return form;
      })(),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message ?? "Receipt upload failed.");
    }

    onUploaded(data.receipt as ReceiptItem);
    event.target.value = "";
  }

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled}>
        Add Receipt
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif,application/pdf"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </>
  );
}
