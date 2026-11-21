/** Checks CSV quoting, seed label validation and the limited cohort with small temporary fixtures. */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { loadDataset, selectItems } from "./dataset";

const HEADER = "id,file,description,source_url,license,is_device,correct_category,correct_device_type,correct_radios,correct_ports,cloud,correct_physical_kind,correct_area,correct_level,never_areas,expected_risk_tags,difficulty,notes";
const LINK_HEADER = "id,url,expected_physical_kind,expected_area,expected_capacity_or_size,expected_risk_tags,notes";
const NEGATIVE = "cup,,A ceramic mug,,Fixture,no,,,,,,,,,,,edge,";
const POSITIVE = 'sensor,,"A sensor, maybe.\nThe sticker says ""sensor"".",,Fixture,yes,sensor,temperature sensor,unknown,RJ45,unknown,instrument,water_treatment;blending,0;1,nh3_hazard,physical_port,clean,';

describe("evaluation dataset", () => {
  it("parses BOM and CRLF, keeps embedded newlines and rejects malformed CSV", () => {
    expect(parseCsv('\uFEFFid,description\r\nx,"a, ""quoted""\nfield"\r\n', "labels.csv")).toEqual([
      ["id", "description"], ["x", 'a, "quoted"\nfield'],
    ]);
    expect(() => parseCsv('id,text\nx,"unclosed', "labels.csv")).toThrow(/record 2: unclosed/);
    expect(() => parseCsv('id,text\nx,"closed"unquoted', "labels.csv")).toThrow(/record 2: unexpected/);
  });

  it("accepts seed enum values and flags invalid kinds, zones and duplicate IDs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "pyre-eval-"));
    try {
      await writeFile(path.join(root, "labels.csv"), `${HEADER}\n${POSITIVE}\n${NEGATIVE}\n`);
      await writeFile(path.join(root, "links.csv"), `${LINK_HEADER}\nlink,https://example.com/tank,vertical_tank,syrup_room,"1,000 L",washdown,\n`);
      const dataset = await loadDataset(root);
      expect(dataset.errors).toEqual([]);
      expect(dataset.items[0].expected).toMatchObject({ areas: ["water_treatment", "blending"], levels: [0, 1], ports: ["RJ45"], physicalKind: "instrument" });
      expect(dataset.items[0].expected.radios).toBeUndefined();
      expect(dataset.items[1].expected.isDevice).toBe(false);
      expect(dataset.items[2].expected.capacity).toBe("1,000 L");
      expect(selectItems(dataset.items, 2).map(({ id }) => id)).toEqual(["cup", "sensor"]);

      await writeFile(path.join(root, "links.csv"), `${LINK_HEADER}\nsensor,https://example.com/tank,vertical_tank,syrup_room,,,\nlink,https://example.com/tank,invalid_kind,invalid_area,,,\n`);
      const invalid = await loadDataset(root);
      expect(invalid.errors).toEqual(expect.arrayContaining([
        expect.stringContaining("duplicate item ID sensor"), expect.stringContaining("expected_physical_kind"), expect.stringContaining("expected_area"),
      ]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
