/** Request and response shapes for an on-demand fit illustration. */
import type { CaptureImage, DeviceProfile } from "@/pipeline/types";
import type { Point } from "@/twin/geometry";
import type { AreaAttrs, AreaId, EquipmentKind } from "@/twin/types";

export type FitVariant = "recommended" | "as_dropped";

export interface FitPlacement {
  areaId: AreaId;
  nearAssetId?: string;
  positionHint: string;
  constraints: string[];
}

export interface FitScene {
  areaName: string;
  attrs: Omit<AreaAttrs, "hazard">;
  hazards: NonNullable<AreaAttrs["hazard"]>[];
  nearby: { name: string; kind: EquipmentKind; position: string }[];
  pin?: Point;
  observationWindow?: "production" | "corridor";
}

export interface FitRequest {
  profile: DeviceProfile;
  image?: CaptureImage;
  placement: FitPlacement;
  variant: FitVariant;
  /** Visual facts from the live twin. The route can resolve the seed scene when omitted. */
  scene?: FitScene;
}

export interface FitResult {
  image: CaptureImage;
  prompt: string;
}
