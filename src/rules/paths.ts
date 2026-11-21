/** Finds bounded, evidence-linked routes from entry points to high-consequence assets. */
import type { Asset, AttackPath, AttackStep, AttackVia, Severity } from "@/twin/types";
import { compareText, type RuleContext } from "./context";
import type { AttackGraph, EntryEdge } from "./graph";
import { interlockLimitsSafetyPath } from "./protections";

const MAX_NETWORK_STEPS = 5;

type TraversalEdge = AttackStep & { ruleIds: readonly string[] };

interface Visit {
  nodeId: string;
  edge?: TraversalEdge;
  depth: number;
  previous?: Visit;
}

interface Route {
  start: EntryEdge;
  target: Asset;
  visit: Visit;
  likelihood: Severity;
  severity: Severity;
  safetyLimited: boolean;
}

function search(graph: AttackGraph, first: Visit, stopAt?: string, excluded?: ReadonlySet<string>): Visit[] {
  const visited = new Set([first.nodeId]);
  const queue = [first];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (current.depth === MAX_NETWORK_STEPS) continue;
    for (const edge of graph.network.get(current.nodeId) ?? []) {
      if (visited.has(edge.to) || excluded?.has(edge.to)) continue;
      queue.push({ nodeId: edge.to, edge, depth: current.depth + 1, previous: current });
      if (edge.to === stopAt) return queue;
      visited.add(edge.to);
    }
  }
  return queue;
}

function searchThrough(graph: AttackGraph, first: Visit, focus: string): Visit[] {
  if (first.nodeId === focus) return search(graph, first);
  const junction = search(graph, first, focus).at(-1);
  if (junction?.nodeId !== focus) return [];

  // Preserve a shortest, cycle-free prefix through the evaluated asset, then
  // find downstream targets without walking back through that prefix.
  const excluded = new Set<string>();
  for (let step = junction.previous; step; step = step.previous) excluded.add(step.nodeId);
  return search(graph, junction, undefined, excluded);
}

function betterRoute(target: Asset, severity: Severity, likelihood: Severity, depth: number, previous?: Route): boolean {
  if (!previous) return true;
  return (severity - previous.severity
    || likelihood - previous.likelihood
    || previous.visit.depth - depth
    || compareText(previous.target.id, target.id)) > 0;
}

function makePath(ctx: RuleContext, { start, target, visit, likelihood, severity, safetyLimited }: Route, focus?: string): AttackPath {
  const edges: TraversalEdge[] = [];
  for (let current: Visit | undefined = visit; current?.edge; current = current.previous) edges.push(current.edge);
  edges.push(start);
  edges.reverse();

  const ruleIds = new Set<string>();
  const steps: AttackStep[] = [];
  let causedBy = focus;
  for (const edge of edges) {
    edge.ruleIds.forEach((ruleId) => ruleIds.add(ruleId));
    if (!causedBy && ctx.assetById.get(edge.to)?.origin === "added") causedBy = edge.to;
    const { from, to, via, technique, note } = edge;
    steps.push({ from, to, via, technique, note });
  }
  if (target.safetyCritical && !safetyLimited) ruleIds.add("SAFE-01");

  let impact = `Potential loss of availability or integrity at ${target.id}.`;
  if (safetyLimited) impact += " The modeled hardwired interlock remains independent of this network route.";
  else if (target.safetyCritical) impact = `Potential impairment of the safety function at ${target.id}.`;

  return {
    id: `rules:${JSON.stringify([start.from, start.via, start.to, target.id])}`,
    title: [start.entry.name, ...edges.map((edge) => edge.to)].join(" -> "),
    entry: start.from,
    target: target.id,
    steps,
    severity,
    likelihood,
    impact,
    source: "rules",
    ...(causedBy && { causedBy }),
    ruleIds: [...ruleIds],
  };
}

export function findPaths(ctx: RuleContext, graph: AttackGraph, focusAssetId?: string): AttackPath[] {
  const targets = ctx.highConsequenceTargets;
  if (!graph.entries.length || !targets.size) return [];

  const routesByOrigin = new Map<string, Map<AttackVia, Map<string, Route>>>();
  const addedLandingRoutes: Route[] = [];
  const focusRoutes: Route[] = [];
  // Multiple entry mechanisms can land on one asset and share its network walk.
  const traversals = new Map<string, Visit[]>();
  for (const start of graph.entries) {
    let routes: Map<string, Route> | undefined;
    if (!focusAssetId) {
      let mechanisms = routesByOrigin.get(start.from);
      if (!mechanisms) {
        mechanisms = new Map();
        routesByOrigin.set(start.from, mechanisms);
      }
      routes = mechanisms.get(start.via);
      if (!routes) {
        routes = new Map();
        mechanisms.set(start.via, routes);
      }
    }
    const addedLanding = !focusAssetId && ctx.assetById.get(start.to)?.origin === "added";
    let representative: Route | undefined;
    let visits = traversals.get(start.to);
    if (!visits) {
      const first: Visit = { nodeId: start.to, depth: 0 };
      visits = focusAssetId ? searchThrough(graph, first, focusAssetId) : search(graph, first);
      traversals.set(start.to, visits);
    }
    for (const visit of visits) {
      const target = targets.get(visit.nodeId);
      if (!target) continue;
      const safetyLimited = interlockLimitsSafetyPath(target, visit.edge?.via ?? start.via);
      const severity: Severity = safetyLimited
        ? Math.min(4, target.criticality) as Severity
        : target.safetyCritical ? 5 : target.criticality;
      const likelihood = Math.max(1, start.likelihood - Math.floor(visit.depth / 3)) as Severity;
      const winsTarget = betterRoute(target, severity, likelihood, visit.depth, routes?.get(target.id));
      const winsLanding = addedLanding && betterRoute(target, severity, likelihood, visit.depth, representative);
      if (!winsTarget && !winsLanding) continue;
      const route = { start, target, visit, likelihood, severity, safetyLimited };
      if (winsTarget) {
        if (routes) routes.set(target.id, route);
        else focusRoutes.push(route);
      }
      if (winsLanding) representative = route;
    }
    if (representative) addedLandingRoutes.push(representative);
  }

  // For the live plant, retain the strongest route per origin, access mechanism,
  // and target, plus a route showing each new landing. Construct report objects
  // only after selection so overlapping exposures don't inflate drag-frame work.
  const selected = new Set(addedLandingRoutes);
  for (const mechanisms of routesByOrigin.values()) {
    for (const originTargets of mechanisms.values()) {
      for (const route of originTargets.values()) selected.add(route);
    }
  }
  const paths = Array.from(focusAssetId ? focusRoutes : selected, (route) => makePath(ctx, route, focusAssetId));
  return paths.sort((a, b) => b.severity - a.severity || b.likelihood - a.likelihood
    || a.steps.length - b.steps.length || compareText(a.id, b.id));
}
