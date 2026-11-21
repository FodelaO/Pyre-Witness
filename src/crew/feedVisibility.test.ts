/** Checks the activity feed's entry cap and that hidden rows are not mounted. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ActivityFeed from "./ActivityFeed";
import { appendActivity, useFeedStore } from "./feedStore";
import { feedShown } from "./feedVisibility";

describe("activity feed memory", () => {
  it("needs its rows only while its disclosure is open, and always when it stands alone", () => {
    expect(feedShown({ open: false })).toBe(false);
    expect(feedShown({ open: true })).toBe(true);
    expect(feedShown(null)).toBe(true);
    expect(feedShown(undefined)).toBe(true);
  });

  it("mounts no rows before it knows that it is visible", () => {
    useFeedStore.setState({ entries: [] });
    appendActivity({ at: 1_795_276_800_000, crew: "scout", kind: "patrol", text: "LT-301 62 % · in band" });
    expect(useFeedStore.getState().entries).toHaveLength(1);

    const html = renderToStaticMarkup(createElement(ActivityFeed));
    expect(html).toContain("pw-crew-feed");
    expect(html).toContain("Open transcript");
    expect(html).not.toContain("pw-crew-feed-entry");
    expect(html).not.toContain("LT-301");
  });

  it("keeps the newest 200 entries, newest first", () => {
    useFeedStore.setState({ entries: [] });
    for (let index = 0; index < 230; index += 1) {
      appendActivity({ at: 1_795_276_800_000 + index, crew: "chief", kind: "patrol", text: `entry ${index}` });
    }
    const { entries } = useFeedStore.getState();
    expect(entries).toHaveLength(200);
    expect(entries[0].text).toBe("entry 229");
    expect(entries.at(-1)?.text).toBe("entry 30");
    expect(new Set(entries.map(({ id }) => id)).size).toBe(200);
  });
});
