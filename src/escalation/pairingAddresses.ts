/** Labels LAN address choices and keeps hotspot addresses first in discovery order. */
export function addressLabel(address: string, wifi?: boolean) {
  const parts = address.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return "Network";
  const [a, b, c, d] = parts.map(Number);
  if (a === 172 && b === 20 && c === 10 && d < 16) return "iPhone hotspot";
  if (a === 100 && b >= 64 && b <= 127) return "Tailscale";
  if (wifi !== undefined) return wifi ? "Wi-Fi" : "Network";
  // Older info responses only identify the IPv4 addresses.
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "Wi-Fi";
  return "Network";
}

export function pairingAddresses(addresses: readonly string[], wifiAddresses?: readonly string[]) {
  return [...new Set(addresses)].map((address) => ({ address, label: addressLabel(address, wifiAddresses?.includes(address)) }))
    .sort((a, b) => Number(b.label === "iPhone hotspot") - Number(a.label === "iPhone hotspot"));
}
