/** Covers international validation and contact redaction for both call sides. */
import { describe, expect, it } from "vitest";
import { maskPhoneNumber, normalizePhoneNumber } from "./phoneNumber";

describe("call destination", () => {
  it.each([
    ["  +1 555-0100  ", "+15550100"],
    ["+44 20 7946 0123", "+442079460123"],
    ["+123456789012345", "+123456789012345"],
  ])("normalizes an international number", (input, result) => {
    expect(normalizePhoneNumber(input)).toBe(result);
  });

  it.each(["", "15550100", "+05550100", "+1234567", "+1234567890123456", "+1 555 0100 ext 2", "++15550100"])(
    "rejects invalid input", (input) => { expect(normalizePhoneNumber(input)).toBeNull(); },
  );

  it("shows only the country marker and last four digits", () => {
    expect(maskPhoneNumber("+1 555-0100")).toBe("+1 ··· ··· 0100");
    expect(maskPhoneNumber("+442079460123")).toBe("+ ··· ··· 0123");
    expect(maskPhoneNumber("supposedly private")).toBe("··· ···");
  });
});
