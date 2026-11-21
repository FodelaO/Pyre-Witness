/** Pairing constants shared by the desktop, LAN handset and relay. */
export const DESK_KEY = "x-pyre-desk";
export const PHONE_KEY = "x-pyre-phone";
export const PAIRING_TTL = 45 * 60_000;
export const RECONNECT_MS = 30_000;
export const PAIR_CODE = /^[a-f0-9]{24}$/;
export const CLIENT_KEY = /^[a-f0-9]{32}$/;
