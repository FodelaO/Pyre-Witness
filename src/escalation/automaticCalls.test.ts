/** Checks batching, duplicate suppression and the automatic one-minute cooldown. */
import { describe, expect, it } from "vitest";
import { AUTOMATIC_CALL_COOLDOWN_MS, createAutomaticCallDebounce } from "./automaticCalls";

describe("automatic call admission", () => {
  it("attempts one call for a batch and never redials a seen episode", () => {
    let now = 0;
    const take = createAutomaticCallDebounce(() => now);
    const records = [{ id: "first" }, { id: "same-batch" }];
    expect(take(records)).toBe(records[0]);
    now += AUTOMATIC_CALL_COOLDOWN_MS;
    expect(take(records)).toBeUndefined();
  });

  it("suppresses causes in the minute window and admits a later fresh cause", () => {
    let now = 0;
    const take = createAutomaticCallDebounce(() => now);
    expect(take([{ id: "first" }])?.id).toBe("first");
    now += AUTOMATIC_CALL_COOLDOWN_MS - 1;
    expect(take([{ id: "during-cooldown" }])).toBeUndefined();
    now++;
    expect(take([{ id: "during-cooldown" }, { id: "after-cooldown" }])?.id).toBe("after-cooldown");
  });
});
