/** Guards the captured request contract and its response scoring boundaries. */
import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import { BASELINE_PROMPT, baselineResponseSchema, baselineSchema } from "./baselineContract";

const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

test("retains the archived original prompt and provider response schema", () => {
  expect(digest(BASELINE_PROMPT)).toBe("a2647ff2dfafb3dd1cb774783c66e748c0ffb59637c7c8b1b328ab07456e8457");
  expect(digest(baselineResponseSchema)).toBe("f65c7d9c62d09f0c4fd8a45e9c022bba169cdba384549ccdbbb47d6b99c2879e");
});

test("scores over-length lists without dropping values or accepting invalid fields", () => {
  const constraint = { where: "Ammonia hazard area", area: "nh3_hazard", level: null, why: "Rating unverified" };
  const list = Array.from({ length: 4 }, () => constraint);
  expect(baselineSchema(true).shape.never_place.safeParse(list).success).toBe(false);
  expect(baselineSchema().shape.never_place.parse(list)).toEqual(list);
  expect(baselineSchema().shape.never_place.safeParse([{ ...constraint, area: "unlisted" }]).success).toBe(false);
});
