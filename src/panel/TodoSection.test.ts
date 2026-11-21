/** Checks the risk labels rendered in ranked action rows. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "node-html-parser";
import { expect, it } from "vitest";
import { TodoSection } from "./TodoSection";

it("to-do rows round risk deltas and show unsigned zero", () => {
  const items = [-21.75, -8.59, -0.004, 2.5].map((riskDelta) => ({
    id: String(riskDelta), title: "Test action", assets: [], apply() {},
    predicted: { riskDelta, lossDeltaPerYear: 0 },
  }));
  const html = parse(renderToStaticMarkup(createElement(TodoSection, { items })));
  const labels = html.querySelectorAll('[title="Predicted risk score change"]');
  expect(labels.map((label) => [label.text, label.getAttribute("data-benefit")])).toEqual([
    ["−22 risk", "true"], ["−9 risk", "true"], ["0 risk", "false"], ["+3 risk", "false"],
  ]);
});
