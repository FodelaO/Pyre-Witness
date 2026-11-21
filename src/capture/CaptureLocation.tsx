/** Shows the automatic placement and lets the operator pin a different spot. */
import { MapPin, X } from "lucide-react";
import { useDropStore } from "@/twin/dropPoint";
import { areaById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";

function toggleFloorPin() {
  const drop = useDropStore.getState();
  if (drop.armed) {
    drop.disarm();
    return;
  }
  const twin = useTwinStore.getState();
  if (twin.view === "purdue") twin.setView("floor");
  drop.arm();
}

export default function CaptureLocation() {
  const point = useDropStore((state) => state.point);
  const armed = useDropStore((state) => state.armed);
  const areaName = useTwinStore((state) => point ? areaById(state.twin, point.area)?.name : undefined);
  const location = armed ? "Picking…" : areaName ?? point?.area ?? "Auto";

  return (
    <div className="pw-capture-pin" data-armed={armed} data-pinned={!!point}>
      <MapPin size={13} aria-hidden />
      <span className="pw-capture-pin-label" aria-live="polite" title={location}>
        Location: <strong className="pw-capture-pin-value">{location}</strong>
      </span>
      <button type="button" className="pw-capture-pick" aria-label="Pick location on plant"
        aria-pressed={armed} onClick={toggleFloorPin}>
        Pick on plant
      </button>
      {point && (
        <button type="button" className="pw-capture-clear-pin" title="Reset to Auto" aria-label="Use automatic location"
          onClick={() => useDropStore.getState().setPoint(null)}>
          <X size={13} aria-hidden />
        </button>
      )}
    </div>
  );
}
