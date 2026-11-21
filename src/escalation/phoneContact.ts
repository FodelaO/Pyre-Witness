/** Stores the phone contact in this browser. */
import { normalizePhoneNumber } from "./phoneNumber";

export const PHONE_CONTACT_KEY = "pw:escalation-phone";

export interface PhoneContact {
  name: string;
  number: string;
  consent: boolean;
}

export function readPhoneContact(): PhoneContact | null {
  try {
    const contact = JSON.parse(localStorage.getItem(PHONE_CONTACT_KEY) ?? "null");
    if (typeof contact?.number !== "string" || typeof contact.consent !== "boolean") return null;
    const number = normalizePhoneNumber(contact.number);
    if (number) return { name: typeof contact.name === "string" ? contact.name.slice(0, 36) : "", number, consent: contact.consent };
  } catch { /* The form can still be used in this tab if storage is unavailable. */ }
  return null;
}

export function writePhoneContact(contact: PhoneContact | null) {
  try {
    if (contact) localStorage.setItem(PHONE_CONTACT_KEY, JSON.stringify(contact));
    else localStorage.removeItem(PHONE_CONTACT_KEY);
    return true;
  } catch {
    return false;
  }
}
