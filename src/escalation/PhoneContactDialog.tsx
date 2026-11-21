/** Collects a local phone number and separate permission for automatic dialing. */
"use client";

import { Check, Phone, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PhoneContact } from "./phoneContact";
import { maskPhoneNumber, normalizePhoneNumber } from "./phoneNumber";

export function PhoneContactDialog({ contact, onSave, onRemove, onDismiss }: {
  contact: PhoneContact | null;
  onSave: (contact: PhoneContact) => boolean;
  onRemove: () => boolean;
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<"number" | "storage" | null>(null);

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = String(data.get("number") ?? "").trim();
    const number = input ? normalizePhoneNumber(input) : contact?.number;
    if (!number) return setError("number");
    const saved = onSave({ number, name: String(data.get("name") ?? "").trim().slice(0, 36), consent: data.has("consent") });
    if (!saved) setError("storage");
  }

  return <dialog ref={dialog} className="pw-es-phone-dialog" aria-labelledby="pw-es-phone-title"
    onCancel={(event) => { event.preventDefault(); onDismiss(); }}>
    <div className="pw-es-phone-dialog-head">
      <Phone size={16} aria-hidden />
      <h2 id="pw-es-phone-title">{contact ? "Edit your phone" : "Add your phone"}</h2>
      <button type="button" className="pw-es-icon" aria-label="Close phone dialog" onClick={onDismiss}><X size={16} /></button>
    </div>
    <form className="pw-es-form pw-es-phone-form" onSubmit={save} autoComplete="off">
      <label>Name (optional)<input name="name" maxLength={36} defaultValue={contact?.name} /></label>
      <label>Phone number
        <input name="number" type="tel" inputMode="tel" maxLength={48} autoComplete="off"
          placeholder={contact ? maskPhoneNumber(contact.number) : "+1 …"} aria-invalid={error === "number" || undefined}
          aria-describedby="pw-es-phone-hint" onInput={() => setError(null)} autoFocus />
      </label>
      <span className="pw-es-note" id="pw-es-phone-hint">
        {contact ? "Leave blank to keep the saved number."
          : "Start with + and your country code. Saved in this browser. Shared with the paired phone during an alert."}
      </span>
      {error && <span className="pw-es-phone-error" role="alert">{error === "number"
        ? "Enter + and 8–15 digits, including the country code." : "Could not update phone settings in this browser."}</span>}
      <label className="pw-es-consent"><input name="consent" type="checkbox" defaultChecked={contact?.consent} />
        Call this number when a threshold is crossed
      </label>
      <div className="pw-es-phone-dialog-actions">
        {contact && <button type="button" className="pw-es-text-button" onClick={() => {
          if (!onRemove()) setError("storage");
        }}><Trash2 size={14} aria-hidden /> Remove phone</button>}
        <button className="pw-es-button" type="submit"><Check size={14} aria-hidden /> Save phone</button>
      </div>
    </form>
  </dialog>;
}
