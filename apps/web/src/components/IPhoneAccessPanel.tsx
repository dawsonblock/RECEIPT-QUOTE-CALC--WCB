import { useEffect, useState } from "react";
import { disableIphoneAccess, enableIphoneAccess, getIphoneAccess, type IPhoneAccessStatus } from "../api/iphoneAccessApi.js";
import { QRCodePanel } from "./QRCodePanel.js";

export function IPhoneAccessPanel() {
  const [status, setStatus] = useState<IPhoneAccessStatus | null>(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    const next = await getIphoneAccess();
    setStatus(next);
  }

  useEffect(() => {
    refresh().catch((error: Error) => setMessage(error.message));
  }, []);

  async function toggle(enabled: boolean) {
    const result = enabled ? await enableIphoneAccess() : await disableIphoneAccess();
    setMessage(result.message);
    await refresh();
  }

  if (!status) {
    return <section className="panel iphone-panel"><h2>iPhone Access</h2><p>Loading...</p></section>;
  }

  return (
    <section className="panel iphone-panel">
      <h2>iPhone Access</h2>
      <p>Status: {status.enabled ? "Running" : "Off"}</p>
      {status.enabled ? (
        <>
          <p>
            URL: <code>{status.url}</code>
          </p>
          <p>
            Access Code: <strong>{status.accessCode}</strong>
          </p>
          <QRCodePanel url={status.url} />
          <p className="hint">Only devices on your Wi-Fi can connect. Access code resets when app restarts.</p>
        </>
      ) : (
        <p>iPhone access is off by default. Enable it only while you are on the same Wi-Fi as your iPhone.</p>
      )}
      <div className="field-row">
        <button type="button" onClick={() => toggle(!status.enabled)}>
          {status.enabled ? "Disable iPhone Access" : "Enable iPhone Access"}
        </button>
      </div>
      {message && <p>{message}</p>}
    </section>
  );
}
