/** Shows the latest measured placement evaluation on the plant's visual grid. */
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft, FileChartColumn, ChevronDown } from "lucide-react";
import { ProofReport } from "@/proof/ProofReport";
import { readProofReport } from "@/proof/reportSource";
import { BrandMark } from "@/shell/BrandMark";
import "@/proof/proof.css";

export const metadata: Metadata = { title: "Evaluation | Pyre Witness" };

export default async function ProofPage() {
  await connection();
  const proof = await readProofReport();
  return (
    <main className="pw-proof pw-scroll">
      <header className="pw-proof-top">
        <BrandMark />
        <Link href="/"><ArrowLeft size={16} aria-hidden /> Plant floor</Link>
      </header>
      <div className="pw-proof-shell">
        <div className="pw-proof-header">
          <h1>Placement evaluation</h1>
          <p>Single-prompt Gemini baseline and the Pyre Witness pipeline on the same labeled captures.</p>
        </div>
        {proof.state === "ready" ? <ProofReport report={proof.report} /> : (
          <section className="pw-proof-empty" aria-label="Evaluation status">
            <div className="pw-proof-empty-icon"><FileChartColumn aria-hidden size={24} strokeWidth={1.5} /></div>
            <div>
              <h2>{proof.state === "missing" ? "No evaluation report yet" : "Evaluation report unavailable"}</h2>
              <p>{proof.state === "missing" ? "Results appear after a labeled evaluation finishes." : "Rerun the evaluation to rebuild the report."}</p>
              <details className="pw-proof-command">
                <summary>Run locally <ChevronDown size={13} aria-hidden /></summary>
                <p>Configure the server Gemini key first.</p>
                <pre><code>npm run eval -- --limit 8</code></pre>
              </details>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
