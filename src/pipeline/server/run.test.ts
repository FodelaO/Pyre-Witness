/** Verifies reassessment and optional revision at the route and SDK boundary using offline fixtures. */
import { afterEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/reassess/route";
import { MODEL_IDS } from "@/gemini/models";
import { assetFromProfile } from "@/pipeline/assetFromProfile";
import type { PipelineEvent } from "@/pipeline/types";
import { SEED_TWIN } from "@/twin/seed";
import { officeAssessment, pressureProfile } from "./__fixtures__/placement";

const location = { x: 1420, y: 150, area: "utilities" } as const;
const candidate = assetFromProfile(pressureProfile, SEED_TWIN, "NEW-TEST", location);
const twin = { ...SEED_TWIN, assets: [...SEED_TWIN.assets, candidate] };
const initial = {
  ...officeAssessment,
  physical_placement: { ...officeAssessment.physical_placement, near_asset_id: "missing-anchor" },
};

function streamAssessment(assessment: typeof officeAssessment, id?: string) {
  const text = JSON.stringify(assessment);
  const events = id
    ? [
        { event_type: "step.delta", delta: { type: "text", text } },
        { event_type: "interaction.completed", interaction: { id, status: "completed" } },
      ]
    : [{ event_type: "interaction.completed", interaction: { status: "completed", output_text: text } }];
  return new Response(events.map((event) => `event: ${event.event_type}\ndata: ${JSON.stringify(event)}\n\n`).join(""), {
    headers: { "Content-Type": "text/event-stream" },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each(["missing-id", "rejected-revision", "successful-revision"] as const)(
  "continues a reassessment to the briefing after %s",
  async (scenario) => {
    vi.stubEnv("GEMINI_API_KEY", "offline-test-placeholder");
    const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      const body = await new Request(input, init).json();
      if (body.model === MODEL_IDS.chief) {
        return Response.json({
          status: "completed",
          steps: [{ type: "model_output", content: [{ type: "text", text: '{"lines":["Fixture briefing.","Review findings."]}' }] }],
        });
      }
      expect(body.model).toBe(MODEL_IDS.reasoning);
      const schema = body.response_format.schema.properties;
      for (const field of ["id", "source", "causedBy"]) expect(schema.attack_paths.items.properties).not.toHaveProperty(field);
      for (const field of ["id", "status", "proposedBy", "riskDelta"]) expect(schema.mitigations.items.properties).not.toHaveProperty(field);
      expect(schema.risks.items.properties).not.toHaveProperty("id");
      expect(JSON.stringify(schema.mitigations.items)).toContain("add_protection");
      if (body.previous_interaction_id) {
        expect(body.previous_interaction_id).toBe("v1_original");
        if (scenario === "rejected-revision") return Response.json({ error: { code: 404 } }, { status: 404 });
        return streamAssessment({ ...initial, physical_placement: { ...initial.physical_placement, near_asset_id: null } }, "v1_revision");
      }
      const context = JSON.parse(body.input);
      expect(context.current_placement.environment).toMatchObject({ zones: ["utilities", "nh3_hazard"], hazards: ["NH3"] });
      expect(context.twin.assets.find(({ id }: { id: string }) => id === candidate.id).environment.hazards).toEqual(["NH3"]);
      return streamAssessment(initial, scenario === "missing-id" ? undefined : "v1_original");
    });
    vi.stubGlobal("fetch", fetch);

    const response = POST(new Request("http://localhost/api/reassess", {
      method: "POST", body: JSON.stringify({ profile: pressureProfile, twin, assetId: candidate.id, placement: location }),
    }));
    const events: PipelineEvent[] = (await response.text()).trim().split("\n\n").map((frame) => JSON.parse(frame.slice(6)));
    const types = events.map(({ type }) => type);
    expect(events[0]).toMatchObject({ type: "run.started", mode: "reassess" });
    expect(types).not.toContain("perception.started");
    expect(types).not.toContain("gate.started");
    expect(types.slice(-3)).toEqual(["summary.started", "summary.done", "run.completed"]);
    expect(types.includes("revision.started")).toBe(scenario !== "missing-id");
    expect(types.includes("revision.done")).toBe(scenario === "successful-revision");
    const check = events.findLast((event) => event.type === "selfcheck.done")?.result;
    expect(check?.revised).toBe(scenario === "successful-revision");
    if (scenario !== "successful-revision") {
      const reason = scenario === "missing-id" ? "no interaction ID" : "Revision could not finish";
      expect(check?.disagreements).toEqual(expect.arrayContaining([
        expect.stringContaining("Removed placement anchor"),
        expect.stringContaining(reason),
      ]));
    }
    expect(fetch).toHaveBeenCalledTimes(scenario === "missing-id" ? 2 : 3);
  },
);
