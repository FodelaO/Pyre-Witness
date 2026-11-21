/** Adds and clears the labeled gateway in the local practice twin. */
import { assetById, areaById, clampToArea } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { Asset } from "@/twin/types";
import { syncFlags } from "./flagStore";
import { useEscalationStore } from "./store";

export const TEST_ASSET_ID = "TEST-901";
export const TEST_SCENARIO_LABEL = "TEST SCENARIO";
export const TEST_BRIEFING_PREFIX = "This is a Pyre Witness test.";
const TEST_ASSET_NAME = "TEST · rogue LTE gateway";
// Immutable twin updates copy this symbol, while imported inventory cannot acquire it by tag.
const rehearsal = Symbol("rehearsal");
type RehearsalGateway = Asset & { [rehearsal]: symbol };

export function gatewayRehearsal(asset: Asset | undefined): symbol | undefined {
  return asset?.id === TEST_ASSET_ID ? (asset as Partial<RehearsalGateway>)[rehearsal] : undefined;
}

export function runTestAlert(): boolean {
  const { twin, addAsset, select } = useTwinStore.getState();
  const existing = assetById(twin, TEST_ASSET_ID);
  if (existing && !gatewayRehearsal(existing)) return false;
  const plc = assetById(twin, "PLC-F3");
  const room = areaById(twin, "filler3");
  if (!plc || !room || plc.physical.area !== room.id
    || !assetById(twin, "PT-401") || !assetById(twin, "HMI-F3")) return false;

  const at = clampToArea(room, plc.physical.x + 78, plc.physical.y + 29, 20);
  const gateway: RehearsalGateway = {
    [rehearsal]: Symbol(),
    id: TEST_ASSET_ID,
    name: TEST_ASSET_NAME,
    description: `${TEST_SCENARIO_LABEL} · Unmanaged cellular and Wi-Fi gateway with cloud management and visible default credentials.`,
    physical: {
      area: room.id, ...at, rotation: 0, kind: "gateway",
      connections: [{ to: plc.id, medium: "network", label: TEST_SCENARIO_LABEL }],
    },
    network: { level: plc.network.level, area: plc.network.area, conduit: null },
    cyber: {
      radios: ["cellular", "wifi"], ports: ["RJ45"], removableStorage: false,
      defaultCredentials: true, cloudConnected: true, remoteAccess: true, managed: false,
    },
    specs: { ipRating: "IP30", foodGrade: false, material: "Plastic enclosure" },
    criticality: 3,
    origin: "added",
    placement: "unsafe",
    status: "alarm",
  };
  if (!existing) addAsset(gateway);
  select(TEST_ASSET_ID);
  return true;
}

export function clearTestAlert() {
  const { twin, removeAsset } = useTwinStore.getState();
  if (gatewayRehearsal(assetById(twin, TEST_ASSET_ID))) removeAsset(TEST_ASSET_ID);

  const { records } = useEscalationStore.getState();
  if (records.some(({ trigger, resolvedAt }) => trigger.test && resolvedAt === undefined)) {
    const resolvedAt = Date.now();
    useEscalationStore.setState({ records: records.map((record) =>
      record.trigger.test && record.resolvedAt === undefined ? { ...record, resolvedAt } : record) });
  }
  syncFlags(useEscalationStore.getState().records);
}
