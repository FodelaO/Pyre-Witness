/** Verifies boot, round-trip persistence and document palette application. */
import { afterEach, describe, expect, it, vi } from "vitest";

function browser(saved?: string) {
  const data = new Map<string, string>();
  if (saved) data.set("pw-theme", saved);
  const dataset: { theme?: string } = {};
  const storage = {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => data.set(key, value)),
  };

  vi.stubGlobal("document", { documentElement: { dataset } });
  vi.stubGlobal("window", { localStorage: storage });
  return { dataset, storage };
}

async function loadStore() {
  vi.resetModules();
  return (await import("./themeStore")).useThemeStore;
}

afterEach(() => vi.unstubAllGlobals());

describe("theme preference", () => {
  it.each([undefined, "invalid"])("defaults to dark with stored value %s", async (saved) => {
    const { dataset } = browser(saved);
    const store = await loadStore();
    expect(store.getState().theme).toBe("dark");
    expect(dataset.theme).toBe("dark");
  });

  it("toggles both ways and restores the persisted value on reload", async () => {
    const { dataset, storage } = browser();
    const store = await loadStore();
    store.getState().toggle();
    expect(store.getState().theme).toBe("light");
    expect(dataset.theme).toBe("light");
    expect(storage.setItem).toHaveBeenLastCalledWith("pw-theme", "light");

    const reloaded = await loadStore();
    expect(reloaded.getState().theme).toBe("light");
    expect(dataset.theme).toBe("light");
    reloaded.getState().toggle();
    expect(reloaded.getState().theme).toBe("dark");
    expect(dataset.theme).toBe("dark");
    expect(storage.setItem).toHaveBeenLastCalledWith("pw-theme", "dark");
    expect((await loadStore()).getState().theme).toBe("dark");
  });

  it("applies the preference for the page when storage is blocked", async () => {
    const { dataset, storage } = browser();
    const blocked = () => { throw new Error("Storage is blocked"); };
    storage.getItem.mockImplementation(blocked);
    storage.setItem.mockImplementation(blocked);
    const store = await loadStore();
    expect(store.getState().theme).toBe("dark");
    store.getState().toggle();
    expect(store.getState().theme).toBe("light");
    expect(dataset.theme).toBe("light");
  });
});
