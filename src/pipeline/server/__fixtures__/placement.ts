/** Deterministic fixtures for local placement and pipeline tests. */
import type { DeviceProfile } from "@/pipeline/types";
import type { ModelAssessment } from "@/gemini/schemas";

export const pressureProfile: DeviceProfile = {
  device_type: "Pressure gauge", category: "instrument", physical_kind: "instrument", object_class: "process_equipment",
  vendor: null, model: null, radios: [], ports: [], storage: null, cloud_connectivity: null,
  default_credentials_visible: false, default_credentials_note: null, power: null,
  capacity_or_size: null, material: null, food_grade: null, hazardous_area_rating: null, ip_rating: null,
  evidence: [], unknowns: [], confidence: 0.9,
};

export const officeAssessment: ModelAssessment = {
  placement: { level: 4, network_area: "Corporate office", conduit: null, why: "Dry inspection bench" },
  physical_placement: {
    area: "corporate_office", near_asset_id: null, position_hint: "Use the bench",
    connections: [], physical_constraints: [],
  },
  never_place: [], risks: [], attack_paths: [], compliance: [], mitigations: [], confidence: 0.9,
};
