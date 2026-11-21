/** Checks the archived values and omission of unavailable held-out rows. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import results from "../../eval/heldout/results.json";
import { HeldoutProof } from "./HeldoutProof";

it("renders both headline gains, a zero rate, and timing from the saved run", () => {
  const html = renderToStaticMarkup(createElement(HeldoutProof, { results }));
  expect(html).toContain("+20.4 pp [+8.3, +34.0] · Significant");
  expect(html).toContain("+35.7 pp [+14.3, +64.3] · Significant");
  expect(html).toContain("0.0% (0/14)");
  expect(html).toContain("26.03 s");
  expect(html).toContain("Hydrogen scored higher on plant area, Purdue level, and cloud flags and was faster");
});

it("omits rows and headline bars with missing sides", () => {
  const html = renderToStaticMarkup(createElement(HeldoutProof, { results: {
    metrics: [{ key: "riskRecall" }, { key: "purdueAccuracy", baseline: { value: 0.5 } }],
    timing: { baseline: { p50: 1000 }, system: { p95: 2000 } },
  } }));
  expect(html).toContain("Held-out test");
  expect(html).not.toContain("Key-risk recall");
  expect(html).not.toContain("<table");
  expect(html).not.toContain("NaN");
});
