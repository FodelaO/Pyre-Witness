/** Renders the installed equipment symbol at disclosure or headline scale. */
import { Equipment, FOOTPRINT } from "@/equipment";
import type { EquipmentKind } from "@/twin/types";
import styles from "./LossFigure.module.css";

export function LossGlyph({ kind, size = 44 }: { kind: EquipmentKind; size?: number }) {
  const { w, h } = FOOTPRINT[kind];
  return (
    <svg
      className={styles.equipment}
      viewBox={`${-w * 0.62} ${-h * 0.62} ${w * 1.24} ${h * 1.24}`}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <Equipment kind={kind} compact running={false} />
    </svg>
  );
}
