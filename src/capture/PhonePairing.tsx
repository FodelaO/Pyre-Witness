/** Render the phone link inside the camera preview footprint. */
import { useEffect, useState } from "react";
import Image from "next/image";
import { QrCode, RotateCcw } from "lucide-react";
import type { PhonePairingState } from "./usePhoneHandoff";

export default function PhonePairing({ state, onStart }: { state: PhonePairingState; onStart: () => void }) {
  const [address, setAddress] = useState("");
  const [qr, setQr] = useState<{ url: string; src: string | null } | null>(null);
  const addresses = state.status === "ready" ? state.info.addresses : [];
  const currentHost = typeof window === "undefined" ? "" : window.location.hostname;
  const host = addresses.includes(address) ? address
    : addresses.includes(currentHost) ? currentHost : addresses[0];
  const url = state.status === "ready" && host ? `http://${host}:${state.info.port}/capture?s=${state.code}` : null;

  useEffect(() => {
    if (!url) return;
    let canceled = false;
    void import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(url, { width: 232, margin: 4 }))
      .then((src) => { if (!canceled) setQr({ url, src }); })
      .catch(() => { if (!canceled) setQr({ url, src: null }); });
    return () => { canceled = true; };
  }, [url]);

  const src = qr?.url === url ? qr?.src : undefined;
  return (
    <div className="pw-capture-preview pw-capture-pairing">
      {url ? (
        <>
          <a href={url} target="_blank" rel="noreferrer" className="pw-capture-qr" aria-label="Open phone capture link">
            {src ? <Image src={src} width={112} height={112} unoptimized alt="Scan to send photos from your phone" /> : (
              <QrCode size={26} aria-hidden="true" />
            )}
          </a>
          <div className="pw-capture-pairing-info">
            <strong>{src === null ? "Open phone link" : "Scan with your phone"}</strong>
            <span>Use the same Wi-Fi.</span>
            {addresses.length > 1 && (
              <select aria-label="Phone network address" value={host} onChange={(event) => setAddress(event.target.value)}>
                {addresses.map((ip) => <option key={ip} value={ip}>{ip}</option>)}
              </select>
            )}
          </div>
        </>
      ) : (
        <div className="pw-capture-preview-prompt">
          <span role="status">{state.status === "error" ? state.message : "Connecting phone…"}</span>
          {state.status === "error" && (
            <button className="pw-capture-start-camera" type="button" onClick={onStart}>
              <RotateCcw size={14} aria-hidden="true" /> Get new code
            </button>
          )}
        </div>
      )}
    </div>
  );
}
