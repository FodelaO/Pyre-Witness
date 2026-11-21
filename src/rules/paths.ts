/** Finds bounded, evidence-linked routes from entry points to high-consequence assets. */
import type { Asset, AttackPath, AttackStep, Severity } from "@/twin/types";
import { compareText, type RuleContext } from "./context";
import type { AttackGraph, EntryEdge } from "./graph";

const MAX_STEPS = 6;

type TraversalEdge = AttackStep & { ruleIds: readonly string[] };

interface Visit {
  edge: TraversalEdge;
  depth: number;
  previous?: Visit;
}

interface Route {
  start: EntryEdge;
  target: Asset;
  visit: Visit;
  likelihood: Severity;
}

function search(graph: AttackGraph, first: Visit, stopAt?: string, excluded?: ReadonlySet<string>): Map<string, Visit> {
  const visited = new Map([[first.edge.to, first]]);
  const queue = [first];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (current.edge.to === stopAt) break;
    if (current.depth === MAX_STEPS) continue;
    for (const edge of graph.network.get(current.edge.to) ?? []) {
      if (visited.has(edge.to) || excluded?.has(edge.to)) continue;
      const next: Visit = { edge, depth: current.depth + 1, previous: current };
      visited.set(edge.to, next);
      queue.push(next);
    }
  }
  return visited;
}

function searchThrough(graph: AttackGraph, first: Visit, focus: string): Map<string, Visit> {
  if (first.edge.to === focus) return search(graph, first);
  const junction = search(graph, first, focus).get(focus);
  if (!junction) return new Map();

  // Preserve a shortest, cycle-free prefix through the evaluated asset, then
  // find downstream targets without walking back through that prefix.
  const excluded = new Set<string>();
  for (let step = junction.previous; step; step = step.previous) excluded.add(step.edge.to);
  return search(graph, junction, undefined, excluded);
}

const targetSeverity = (target: Asset): Severity => target.safetyCritical ? 5 : target.criticality;

function betterRoute(target: Asset, likelihood: Severity, depth: number, previous?: Route): boolean {
  if (!previous) return true;
  return (targetSeverity(target) - targetSeverity(previous.target)
    || likelihood - previous.likelihood
    || previous.visit.depth - depth
    || compareText(previous.target.id, target.id)) > 0;
}

function makePath(ctx: RuleContext, { start, target, visit, likelihood }: Route, focus?: string): AttackPath {
  const edges: TraversalEdge[] = [];
  for (let current: Visit | undefined = visit; current; current = current.previous) edges.push(current.edge);
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
  if (target.safetyCritical) ruleIds.add("SAFE-01");

  return {
    id: `rules:${JSON.stringify([start.from, start.via, start.to, target.id])}`,
    title: [start.entry.name, ...edges.map((edge) => edge.to)].join(" -> "),
    entry: start.from,
    target: target.id,
    steps,
    severity: targetSeverity(target),
    likelihood,
    impact: target.safetyCritical
      ? `Potential impairment of the safety function at ${target.id}.`
      : `Potential loss of availability or integrity at ${target.id}.`,
    source: "rules",
    ...(causedBy && { causedBy }),
    ruleIds: [...ruleIds],
  };
}

export function findPaths(ctx: RuleContext, graph: AttackGraph, focusAssetId?: string): AttackPath[] {
  const routesByOrigin = new Map<string, Map<string, Route>>();
  const addedLandingRoutes: Route[] = [];
  for (const start of graph.entries) {
    const originKey = JSON.stringify(focusAssetId ? [start.from, start.via, start.to] : [start.from, start.via]);
    const routes = routesByOrigin.get(originKey) ?? new Map<string, Route>();
    routesByOrigin.set(originKey, routes);
    const addedLanding = !focusAssetId && ctx.assetById.get(start.to)?.origin === "added";
    let representative: Route | undefined;
    const first: Visit = { edge: start, depth: 1 };
    const visits = focusAssetId ? searchThrough(graph, first, focusAssetId) : search(graph, first);
    for (const [id, visit] of visits) {
      const target = ctx.assetById.get(id);
      if (!target || (target.criticality < 4 && !target.safetyCritical)) continue;
      const likelihood = Math.max(1, start.likelihood - Math.floor((visit.depth - 1) / 3)) as Severity;
      const winsTarget = betterRoute(target, likelihood, visit.depth, routes.get(id));
      const winsLanding = addedLanding && betterRoute(target, likelihood, visit.depth, representative);
      if (!winsTarget && !winsLanding) continue;
      const route = { start, target, visit, likelihood };
      if (winsTarget) routes.set(id, route);
      if (winsLanding) representative = route;
    }
    if (representative) addedLandingRoutes.push(representative);
  }

  // For the live plant, retain the strongest route per origin, access mechanism,
  // and target, plus a route showing each new landing. Construct report objects
  // only after selection so overlapping exposures don't inflate drag-frame work.
  const routes = new Set(addedLandingRoutes);
  for (const targets of routesByOrigin.values()) for (const route of targets.values()) routes.add(route);
  const paths = Array.from(routes, (route) => makePath(ctx, route, focusAssetId));
  return paths.sort((a, b) => b.severity - a.severity || b.likelihood - a.likelihood
    || a.steps.length - b.steps.length || compareText(a.id, b.id));
}
