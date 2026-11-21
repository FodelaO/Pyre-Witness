/** Covers the handset's opt-in gate for native dialing. */
import { expect, it } from "vitest";
import { parse } from "node-html-parser";
import { canUseNativeDial } from "./phoneBrowser.mjs";
import { phoneMarkup } from "./phoneMarkup";

it("allows the dial link only for a confirmed helper phone", () => {
  expect(canUseNativeDial("helper")).toBe(true);
  expect(canUseNativeDial("ring-here")).toBe(false);
  expect(canUseNativeDial(null)).toBe(false);
  expect(canUseNativeDial("unknown")).toBe(false);
  expect(canUseNativeDial("helper", true)).toBe(false);
});

it("serves the initial dial link hidden and without a destination", () => {
  const dial = parse(phoneMarkup("a".repeat(24))).querySelector("#dial")!;
  expect(dial.hasAttribute("hidden")).toBe(true);
  expect(dial.hasAttribute("href")).toBe(false);
});
