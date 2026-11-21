/** Covers the inline emphasis agents send so the chat never shows raw markdown markers. */
import { describe, expect, it } from "vitest";
import { inlineSegments } from "./ChatText";

describe("agent chat inline text", () => {
  it("turns bold, italic and code markers into segments", () => {
    expect(inlineSegments("Equipo **PLC-F3** (*Filler 3 PLC*, tipo `plc_cabinet`).")).toEqual([
      { kind: "text", text: "Equipo " },
      { kind: "strong", text: "PLC-F3" },
      { kind: "text", text: " (" },
      { kind: "em", text: "Filler 3 PLC" },
      { kind: "text", text: ", tipo " },
      { kind: "code", text: "plc_cabinet" },
      { kind: "text", text: ")." },
    ]);
  });

  it("leaves plain text, bullets, underscores and unmatched markers alone", () => {
    for (const text of ["* first item\n* second", "rule SAFE_01 on plc_cabinet", "5 * 3 = 15", "**unclosed", "PLC-F3 · SAFE-01 (5/5)"]) {
      expect(inlineSegments(text)).toEqual([{ kind: "text", text }]);
    }
  });
});
