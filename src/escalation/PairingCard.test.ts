/** Verifies the initial QR target and full copyable link in the rendered pairing card. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "node-html-parser";
import { expect, it } from "vitest";
import { PairingCard } from "./PairingCard";

function renderCard(addresses: string[]) {
  return parse(renderToStaticMarkup(createElement(PairingCard, {
    pairing: { connection: { code: "fixture", key: "unused", role: "desktop" }, addresses, port: 4120 },
    canRenew: true, connected: false, onRenew() {},
  })));
}

it("renders the hotspot as selected and puts its full link below the QR", () => {
  const card = renderCard(["172.16.249.18", "100.93.224.34", "172.20.10.2"]);
  const host = card.querySelector("option[selected]")?.getAttribute("value");
  expect(host).toBe("172.20.10.2");
  const url = `http://${host}:4120/call/fixture`;
  expect(card.querySelector(".pw-es-qr")?.getAttribute("href")).toBe(url);
  expect(card.querySelector(".pw-es-qr + .pw-es-link")?.text).toBe(url);
  expect(card.text).toContain("Phone can't open it? Join your iPhone hotspot from the Mac, then pair again.");
});

it("shows the sole network link directly", () => {
  const card = renderCard(["172.16.249.18"]);
  expect(card.querySelector("select")).toBeNull();
  expect(card.querySelector(".pw-es-link")?.text).toBe("http://172.16.249.18:4120/call/fixture");
});
