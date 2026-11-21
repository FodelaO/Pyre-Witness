/** Checks exact address ranges and stable defaults for the presenter's network picker. */
import { expect, it } from "vitest";
import { addressLabel, pairingAddresses } from "./pairingAddresses";

it.each([
  ["100.63.255.255", "Network"], ["100.64.0.0", "Tailscale"],
  ["100.127.255.255", "Tailscale"], ["100.128.0.0", "Network"],
  ["172.20.10.0", "iPhone hotspot"], ["172.20.10.15", "iPhone hotspot"],
  ["172.20.10.16", "Wi-Fi"], ["172.20.11.2", "Wi-Fi"],
  ["172.16.249.18", "Wi-Fi"], ["192.168.8.10", "Wi-Fi"], ["10.1.0.2", "Wi-Fi"],
  ["172.32.0.1", "Network"], ["203.0.113.1", "Network"], ["172.20.10.256", "Network"],
])("labels %s as %s", (address, label) => {
  expect(addressLabel(address)).toBe(label);
});

it("prefers the hotspot while keeping all other addresses in discovery order", () => {
  const venue = ["172.16.249.18", "100.93.224.34"];
  const choices = (addresses: string[]) => pairingAddresses(addresses).map(({ address }) => address);
  expect(choices(venue)).toEqual(venue);
  expect(choices([...venue].reverse())).toEqual([...venue].reverse());
  expect(choices([...venue, "172.20.10.2", venue[0]])).toEqual(["172.20.10.2", ...venue]);
  expect(choices([])).toEqual([]);
});

it("distinguishes wired private addresses from the Wi-Fi interface", () => {
  const addresses = ["10.0.0.2", "172.16.249.18", "100.93.224.34", "172.20.10.2"];
  expect(pairingAddresses(addresses, [addresses[1], addresses[3]]).map(({ label }) => label))
    .toEqual(["iPhone hotspot", "Network", "Wi-Fi", "Tailscale"]);
});
