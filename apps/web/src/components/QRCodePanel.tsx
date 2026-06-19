import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodePanelProps {
  url: string;
}

export function QRCodePanel({ url }: QRCodePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    QRCode.toCanvas(canvasRef.current, url, { width: 180, margin: 2 }).catch(() => undefined);
  }, [url]);

  return <canvas ref={canvasRef} aria-label={`QR code for ${url}`} />;
}
