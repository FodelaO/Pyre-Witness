/** Builds one physical installation scene from observed traits and twin geometry. */
import type { FitRequest, FitScene } from "./types";

const HAZARD_NAME = { NH3: "ammonia (NH3)", CO2: "carbon dioxide (CO2)", caustic: "caustic chemicals" };

function readable(value: string): string {
  return value.replaceAll("_", " ");
}

export function buildFitPrompt({ profile, image, placement, variant }: FitRequest, scene: FitScene): string {
  const traits = [
    profile.material && `material: ${profile.material}`,
    profile.capacity_or_size && `reported size or capacity: ${profile.capacity_or_size}`,
    profile.ports.length && `visible port types: ${profile.ports.join(", ")}`,
    ...profile.evidence.filter(({ source }) => source === "shape" || source === "port").map(({ claim }) => claim),
  ].filter(Boolean);
  const { attrs } = scene;
  const environment = [
    attrs.washdown ? "high-pressure washdown zone with cleanable stainless surfaces and floor drainage" : "dry-service area",
    attrs.restricted ? "badge-controlled access" : "no badge restriction recorded",
    attrs.publicAccess ? "visitor-accessible space" : "no public access at this spot",
    attrs.foodContact ? "open product or food-contact surfaces nearby" : "no food-contact surfaces at this spot",
    scene.hazards.length ? `classified hazard context: ${scene.hazards.map((hazard) => HAZARD_NAME[hazard]).join(", ")}` : "no classified hazard at this spot",
  ];
  const equipment = scene.nearby.map(({ name, kind, position }) => `${name} (${readable(kind)}), ${position}`);

  return [
    "Make a single photorealistic, eye-level industrial installation photograph, landscape 4:3. Keep the entire device clearly visible in the foreground and its surroundings legible behind it. Use ordinary plant lighting, realistic device proportions relative to nearby fixtures, and a documentary look.",
    "Every surface in the photograph is free of lettering, logos, decals and codes. The area and equipment names below are reference identifiers only. Keep their sign plates and label panels blank.",
    `Setting: ${scene.areaName}, ${attrs.outdoor ? "at the exterior of" : "inside"} a working industrial cola bottling plant. ${environment.join("; ")}.`,
    scene.observationWindow && `Show the observation window with the operator panel on the production side. The pin is on the ${scene.observationWindow} side of the glass.`,
    `Subject: ${readable(profile.device_type)} (${readable(profile.physical_kind)}).${traits.length ? ` Observed traits: ${traits.join("; ")}.` : ""}`,
    image
      ? "Use the supplied photo as the identity reference for this exact device. Preserve its silhouette, proportions, materials, finish, colour and physical controls or connectors. Replace the photo background with the specified plant setting. Render any branding, decals and writing on the device as seamless bare housing material. Keep indicator lights as plain pinpoints where present."
      : "Use the observed traits to depict the device. Keep unspecified features visually plain.",
    equipment.length && `Nearby equipment relative to the device: ${equipment.join("; ")}. Use the equipment as landmarks, without printing its names or tags.`,
    `Location: ${placement.positionHint}.`,
    placement.constraints.length && `Architect's physical installation constraints: ${placement.constraints.join("; ")}.`,
    variant === "recommended"
      ? "Show the device installed at the recommended location. Honour the stated mounting, ingress protection and cable routing where specified, without changing the device's own housing."
      : "Keep the device at the engineer's pinned location. Show the actual surrounding conditions. Do not move it to the recommended spot or add protective measures to make the pin look compliant.",
    "Use unbranded equipment with plain faceplates and blank displays throughout the scene, including the background. Storage, walls and doors have blank surfaces. Keep desks clear of printed material and leave bottles, packaging and cartons unlabeled.",
    "No people, readable text, logos, signage, warning graphics, colored risk marks, or annotations. Show normal plant conditions without incidents or damage.",
  ].filter(Boolean).join("\n");
}
