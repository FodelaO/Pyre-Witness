/** Floor positions for the six existing exposure origins. */
import type { EntryPoint } from "../types";

export const SEED_ENTRY_POINTS: EntryPoint[] = [
  { id: "internet", name: "Internet", kind: "internet", x: 1500, y: 36 },
  { id: "vendor_remote", name: "Vendor remote access", kind: "remote", x: 1380, y: 36 },
  { id: "parking_rf", name: "Nearby RF (parking lot)", kind: "rf", x: 700, y: 930, area: "parking_lot", reach: 320 },
  { id: "visitor", name: "Visitor", kind: "physical", x: 760, y: 774, area: "visitor_corridor" },
  { id: "supply_chain", name: "Supplier delivery", kind: "supply", x: 1480, y: 930, area: "parking_lot" },
  { id: "insider", name: "Insider", kind: "physical", x: 199, y: 477, area: "control_room" },
];
