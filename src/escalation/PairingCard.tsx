/** Shows a scannable, copyable link for the network the presenter selects. */
"use client";

import { useEffect, useRef, useState } from "react";
import { pairingAddresses } from "./pairingAddresses";
import type { useCallPairing } from "./useCallPairing";

export function PairingCard({ pairing, connected, canRenew, onRenew }: {
  pairing: NonNullable<ReturnType<typeof useCallPairing>["pairing"]>;
  connected: boolean;
  canRenew: boolean;
  onRenew: () => void;
}) {
  const options = pairingAddresses(pairing.addresses, pairing.wifiAddresses);
  const [selected, setSelected] = useState("");
  const [qr, setQr] = useState<{ url: string; src: string }>();
  const [copied, setCopied] = useState("");
  const link = useRef<HTMLAnchorElement>(null);
  const host = options.find(({ address }) => address === selected)?.address ?? options[0]?.address;
  const path = `/call/${pairing.connection.code}`;
  const url = new URL(path, host ? `http://${host}:${pairing.port}` : location.origin).href;

  useEffect(() => {
    let alive = true;
    void import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(url, { width: 246, margin: 4 }))
      .then((src) => { if (alive) setQr({ url, src }); })
      .catch(() => {}); // The full link is also available without a QR.
    return () => { alive = false; };
  }, [url]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
    } catch {
      // On LAN HTTP, copy the selection or leave it selected for native Copy.
      if (link.current) {
        window.getSelection()?.selectAllChildren(link.current);
        if (document.execCommand?.("copy")) setCopied(url);
      }
    }
  }

  return <div className="pw-es-pair">
    <strong data-connected={connected}>{connected ? "Phone paired" : host ? "Scan on your phone" : "LAN address unavailable"}</strong>
    {options.length > 1 && <select aria-label="Call network address" value={host} onChange={(event) => setSelected(event.target.value)}>
      {options.map(({ address, label }) => <option key={address} value={address}>{label} · {address}</option>)}
    </select>}
    <a href={url} className="pw-es-qr" target="_blank" rel="noreferrer" aria-label="Open paired phone link">
      {qr?.url === url && <img src={qr.src} alt="On-call pairing QR code" width={160} height={160} />}
    </a>
    <a ref={link} className="pw-es-link" href={url} target="_blank" rel="noreferrer">{url}</a>
    <div className="pw-es-pair-actions">
      <button type="button" className="pw-es-text-button" onClick={copyLink}>{copied === url ? "Copied" : "Copy link"}</button>
      {canRenew && <button type="button" className="pw-es-text-button" onClick={onRenew}>New link</button>}
    </div>
    <span className="pw-es-note">Phone can&apos;t open it? Join your iPhone hotspot from the Mac, then pair again.</span>
  </div>;
}
