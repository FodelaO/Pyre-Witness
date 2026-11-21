/** Reads and writes the on-call contact strictly inside the paired phone's browser. */
const KEY = "pw:escalation-local-roster";

export function parseContact(name, number) {
  const cleanName = name.trim();
  const dial = number.trim().replace(/[\s.()-]/g, "");
  return cleanName && cleanName.length <= 36 && /^\+?\d{7,15}$/.test(dial)
    ? { name: cleanName, number: dial } : null;
}

export function readContact() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (value && typeof value === "object" && "name" in value && "number" in value
      && typeof value.name === "string" && typeof value.number === "string") {
      return parseContact(value.name, value.number);
    }
  } catch { /* A phone may block storage in private mode. */ }
  return null;
}

export function saveContact(contact) {
  try { localStorage.setItem(KEY, JSON.stringify(contact)); } catch { /* The UI can still use the contact in memory. */ }
}

export function maskedNumber(number) {
  const prefix = /^\+1\d{10}$/.test(number) ? "+1 " : number.startsWith("+") ? "+ " : "";
  return `${prefix}··· ··· ${number.slice(-4)}`;
}
