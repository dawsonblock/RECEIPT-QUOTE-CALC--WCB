declare module "qrcode" {
  import type { CanvasHTMLCanvasElement, CanvasRenderingContext2D } from "canvas";

  interface QRCodeOptions {
    width?: number;
    margin?: number;
    [key: string]: unknown;
  }

  const QRCode: {
    toCanvas(canvas: HTMLCanvasElement, text: string, options?: QRCodeOptions): Promise<void>;
    toString(text: string, options?: QRCodeOptions): Promise<string>;
    toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
    toBuffer(text: string, options?: QRCodeOptions): Promise<Buffer>;
  };

  export default QRCode;
}
