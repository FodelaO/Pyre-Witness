/** Verifies pure prompt grounding, cache identity, and current-pin comparison rules. */
import { describe, expect, it } from "vitest";
import { assetFromProfile, atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import type { Assessment, DeviceProfile, DropPoint } from "@/pipeline/types";
import { evaluateTwin } from "@/rules/engine";
import { SEED_TWIN } from "@/twin/seed";
import { fitCacheKey } from "./cache";
import { fitOptions } from "./placements";
import { buildFitPrompt } from "./prompt";
import { fitScene } from "./scene";
import type { FitRequest } from "./types";

const profile: DeviceProfile = {
  device_type: "Optical inspection camera",
  physical_kind: "ip_camera",
  category: "camera",
  vendor: null,
  model: null,
  radios: [],
  ports: ["M12"],
  storage: null,
  default_credentials_visible: true,
  default_credentials_note: "Test-only credential note",
  cloud_connectivity: false,
  power: null,
  capacity_or_size: "60 mm × 45 mm",
  material: "black anodised aluminium",
  food_grade: false,
  hazardous_area_rating: null,
  ip_rating: "IP54",
  evidence: [
    { source: "shape", claim: "Square housing with a recessed circular lens", confidence: 0.9 },
    { source: "label", claim: "Test-only label to omit", confidence: 0.9 },
  ],
  unknowns: [],
  confidence: 0.9,
};

const placement: FitRequest["placement"] = {
  areaId: "filler3",
  nearAssetId: "HMI-F3",
  positionHint: "Beside the operator panel",
  constraints: ["Use a bracket", "Confirm IP69K ingress protection", "Route cables through overhead tray"],
};
const request: FitRequest = { profile, placement, variant: "recommended" };
const pin: DropPoint = { area: "filler3", x: 748, y: 669 };
const scene = fitScene(SEED_TWIN, placement, pin)!;

describe("fit prompt", () => {
  it("uses physical evidence, model constraints, and the room's real surroundings", () => {
    const prompt = buildFitPrompt(request, scene);
    for (const cue of [profile.device_type, "black anodised aluminium", "recessed circular lens", "washdown zone",
      "food-contact", "Filler 3 HMI (hmi), 1.2 m east and 0.2 m south", "observation window", "No people", "logos",
      ...placement.constraints]) expect(prompt).toContain(cue);
    expect(prompt).not.toContain("Test-only");
    expect(prompt).not.toContain("identity reference");
  });

  it("keeps the same reference subject at the real pin without drawing a warning", () => {
    const prompt = buildFitPrompt({
      ...request,
      variant: "as_dropped",
      image: { mimeType: "image/jpeg", dataBase64: "YQ==" },
    }, scene);
    expect(prompt).toContain("supplied photo as the identity reference for this exact device");
    expect(prompt).toContain("engineer's pinned location");
    expect(prompt).toContain("No people, readable text, logos, signage, warning graphics");
    expect(prompt).not.toContain("Show the device installed at the recommended location");
  });

  it("uses physical overlays and the correct side of the observation window", () => {
    const utilities = fitScene(SEED_TWIN, { areaId: "utilities" }, { x: 1410, y: 150 })!;
    expect(utilities.hazards).toEqual(["NH3"]);
    expect(utilities.attrs.restricted).toBe(true);
    expect(buildFitPrompt(request, utilities)).toContain("ammonia (NH3)");
    const corridor = fitScene(SEED_TWIN, { areaId: "visitor_corridor" }, { x: 760, y: 731 })!;
    expect(corridor.observationWindow).toBe("corridor");
    expect(corridor.attrs.publicAccess).toBe(true);
    expect(buildFitPrompt(request, corridor)).toContain("visitor-accessible");
  });
});

describe("fit cache key", () => {
  it("ignores input object key order", () => {
    const profileReordered = Object.fromEntries(Object.entries(profile).reverse()) as unknown as DeviceProfile;
    const { constraints, positionHint, nearAssetId, areaId } = placement;
    expect(fitCacheKey({ profile: profileReordered, variant: "recommended", placement: { constraints, positionHint, nearAssetId, areaId } }, scene))
      .toBe(fitCacheKey(request, scene));
  });

  it("separates variants, profiles, placements, reference photos and changed scene facts", () => {
    const key = fitCacheKey(request, scene);
    const image = { mimeType: "image/jpeg", dataBase64: "YQ==" };
    const changedScene = { ...scene, attrs: { ...scene.attrs, washdown: !scene.attrs.washdown } };
    const distinct = [
      key,
      fitCacheKey({ ...request, variant: "as_dropped" }, scene),
      fitCacheKey({ ...request, profile: { ...profile, material: "steel" } }, scene),
      fitCacheKey({ ...request, placement: { ...placement, positionHint: "On the opposite side" } }, scene),
      fitCacheKey({ ...request, placement: { ...placement, constraints: ["Different mounting"] } }, scene),
      fitCacheKey({ ...request, image }, scene),
      fitCacheKey({ ...request, image: { ...image, dataBase64: "Yg==" } }, scene),
      fitCacheKey(request, changedScene),
      fitCacheKey(request, { ...scene, pin: { x: pin.x + 1, y: pin.y } }),
    ];
    expect(new Set(distinct).size).toBe(distinct.length);
  });
});

it("labels the current blocked pin and drops the unsafe tile after a clear move", () => {
  const assessment: Assessment = {
    placement: { level: 4, network_area: "Corporate office", conduit: null, why: "Dry bench" },
    physical_placement: {
      area: "corporate_office", near_asset_id: null, position_hint: "Above the bench",
      physical_constraints: ["Mount to the bench upright"], connections: [],
    },
    never_place: [], risks: [], attack_paths: [], compliance: [], mitigations: [], confidence: 0.9,
  };
  const placed = assetFromProfile(profile, SEED_TWIN, "NEW-TEST", pin);
  const twin = { ...SEED_TWIN, assets: [...SEED_TWIN.assets, placed] };
  const report = evaluateTwin(twin);
  const options = fitOptions(twin, placed, assessment, report, null);
  const actual = options.find(({ variant }) => variant === "as_dropped")!;
  const stale = report.findings.find(({ assetId, ruleId }) => assetId === placed.id && ruleId === "WASH-01")!;
  expect(actual.scene.pin).toEqual({ x: pin.x, y: pin.y });
  expect(actual.findings).toContain(stale.title);
  expect(actual.findings.length).toBeLessThanOrEqual(2);

  const moved = atRecommendedPlacement(twin, placed, assessment)!;
  const changed = { ...twin, assets: [...SEED_TWIN.assets, moved] };
  const afterMove = fitOptions(changed, moved, assessment, evaluateTwin(changed), {
    passed: false, findings: [stale], paths: [], disagreements: [], revised: false,
  });
  expect(afterMove.map(({ variant }) => variant)).toEqual(["recommended"]);
});
