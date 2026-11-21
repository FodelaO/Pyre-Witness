// Verifies the current baseline against the archived Run 4 and Run 5 donor.
import { readdir } from "node:fs/promises";
import path from "node:path";
import { MODEL_IDS, THINKING } from "@/gemini/models";
import { SEED_TWIN } from "@/twin/seed";
import { BASELINE_CONTRACT, BASELINE_PROMPT, baselineResponseSchema } from "../baselineContract";
import { digest, readJson, REPORT_ROOT, RUNS_ROOT, type Manifest } from "../cache";
import type { EvaluationReport } from "../report";

// Archived pins from baselineContract.test.ts in both published run revisions.
const archivedPrompt = "a2647ff2dfafb3dd1cb774783c66e748c0ffb59637c7c8b1b328ab07456e8457";
const archivedPlantName = "Bebidas del Norte";
const archivedSchema = "f65c7d9c62d09f0c4fd8a45e9c022bba169cdba384549ccdbbb47d6b99c2879e";

export async function auditBaseline() {
  const promptSha256 = digest(BASELINE_PROMPT);
  const responseSchemaSha256 = digest(baselineResponseSchema);
  const directories = await readdir(RUNS_ROOT, { withFileTypes: true });
  const manifests = (await Promise.all(directories.filter((entry) => entry.isDirectory())
    .map(({ name }) => readJson<Manifest>(path.join(RUNS_ROOT, name, "manifest.json")))))
    .filter((manifest): manifest is Manifest => manifest !== null && manifest.version === 1);
  const archived = await Promise.all(["run-4", "run-5"].map(async (label) => {
    const report = await readJson<EvaluationReport>(path.join(REPORT_ROOT, label, "latest.json"));
    const runs = manifests.filter((entry) => entry.label === label);
    const donorLabel = report?.fairComparison?.label ?? report?.baselineFrom;
    const donorFingerprint = report?.fairComparison?.fingerprint;
    const donor = manifests.find((entry) => entry.label === donorLabel && entry.fingerprint === donorFingerprint
      && entry.sides.includes("baseline"));
    const contracts = [...new Set(runs.map((run) => run.baselineContract ?? "original-output-v1"))];
    const available = Boolean(donor && report?.label === label && runs.length);
    const differs = contracts.some((contract) => contract !== BASELINE_CONTRACT)
      || Boolean(report?.baselineContract && report.baselineContract !== BASELINE_CONTRACT)
      || Boolean(donor && (donor.baselineContract !== BASELINE_CONTRACT
        || donor.models?.baseline !== MODEL_IDS.perception || donor.thinking?.perception !== THINKING.perception));
    const matches = available && !differs;
    return { label, contracts, donorLabel, donorFingerprint, donorContract: donor?.baselineContract, available, differs, matches };
  }));
  const differs = promptSha256 !== archivedPrompt || responseSchemaSha256 !== archivedSchema
    || archived.some((entry) => entry.differs);
  const status = differs ? "DIFFERS" : archived.every(({ matches }) => matches) ? "matches" : "unverified";
  const plantContext = { archived: archivedPlantName, current: SEED_TWIN.plant.name };
  return { status, contract: BASELINE_CONTRACT, promptSha256, responseSchemaSha256, plantContext, archived };
}

export type BaselineAudit = Awaited<ReturnType<typeof auditBaseline>>;
