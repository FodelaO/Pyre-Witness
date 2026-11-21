/** Interprets the twin's explicit independent safeguards for rules and routes. */
import type { Asset, AttackVia } from "@/twin/types";

export function hasPhysicalPortProtection(asset: Asset): boolean {
  return asset.protections?.some((protection) => protection === "port-lock" || protection === "locked-cabinet") ?? false;
}

export function hasHardwiredSafetyInterlock(asset: Asset): boolean {
  return asset.safetyCritical === true && asset.physical.kind === "valve"
    && (asset.protections?.includes("hardwired-interlock") ?? false);
}

export function interlockLimitsSafetyPath(asset: Asset, arrival: AttackVia | undefined): boolean {
  return (arrival === "network" || arrival === "remote" || arrival === "internet" || arrival === "rf")
    && hasHardwiredSafetyInterlock(asset);
}
