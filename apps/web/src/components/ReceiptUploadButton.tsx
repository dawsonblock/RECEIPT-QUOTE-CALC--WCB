import { useRef, type ChangeEvent } from "react";
import type { ReceiptItem, ReceiptUploadResponse } from "@wcb/shared";

interface ReceiptUploadButtonProps {
  packetId: string;
  onUploaded: (receipt: ReceiptItem) => void;
  onMessage?: (message: string) => void;
  disabled?: boolean;
}

export function ReceiptUploadButton({ packetId, onUploaded, onMessage, disabled = false }: ReceiptUploadButtonProps) {
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

    const data = (await response.json().catch(() => null)) as (ReceiptUploadResponse & { message?: string }) | null;
    if (!response.ok) {
      throw new Error(data?.message ?? "Receipt upload failed.");
    }

    if (!data?.receipt) {
      throw new Error("Receipt upload did not return a receipt.");
    }

    if (data.duplicate) {
      onMessage?.("This receipt already exists in the packet.");
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
        className="sr-only"
        aria-label="Receipt file"
      />
    </>
  );
}
