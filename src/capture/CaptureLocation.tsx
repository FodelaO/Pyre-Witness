/** Arm and clear the floor's shared placement pin. */
import { MapPin, X } from "lucide-react";
import { useDropStore } from "@/twin/dropPoint";
import { areaById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";

export default function CaptureLocation({ disabled }: { disabled: boolean }) {
  const point = useDropStore((state) => state.point);
  const armed = useDropStore((state) => state.armed);
  const areaName = useTwinStore((state) => point ? areaById(state.twin, point.area)?.name : undefined);
  const label = armed ? "Pick on floor" : point ? areaName ?? point.area : "Pin location";

  function arm() {
    const twin = useTwinStore.getState();
    if (twin.view === "purdue") twin.setView("floor");
    useDropStore.getState().arm();
  }

  return (
    <div className="pw-capture-pin" data-armed={armed} data-pinned={!!point}>
      <button type="button" aria-label={point && !armed ? `Pin location, ${label}` : label} title={label}
        aria-pressed={armed} onClick={arm} disabled={disabled}>
        <MapPin size={14} aria-hidden="true" />
        <span>{label}</span>
      </button>
      {(point || armed) && (
        <button type="button" title={point ? "Clear pin" : "Cancel pin placement"}
          aria-label={point ? "Clear pin" : "Cancel pin placement"} disabled={disabled}
          onClick={() => {
            const pin = useDropStore.getState();
            pin.setPoint(null);
          }}>
          <X size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
