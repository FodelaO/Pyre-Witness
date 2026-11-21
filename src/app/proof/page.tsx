/** Presents the latest measured Pyre Witness evaluation on one page. */
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft, FileChartColumn } from "lucide-react";
import { ProofReport } from "@/proof/ProofReport";
import { readProofReport } from "@/proof/reportSource";
import styles from "@/proof/proof.module.css";

export const metadata: Metadata = { title: "Evaluation | Pyre Witness" };

export default async function ProofPage() {
  await connection();
  const proof = await readProofReport();
  return (
    <main className={`pw-scroll ${styles.page}`}>
      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="Plant navigation">
          <Link href="/"><ArrowLeft size={15} aria-hidden="true" /> Plant floor</Link>
          <span>Pyre Witness</span>
        </nav>
        <header className={styles.header}>
          <h1>Placement evaluation</h1>
          <p>One-prompt Gemini baseline compared with the Pyre Witness pipeline.</p>
        </header>
        {proof.state === "ready" ? <ProofReport report={proof.report} /> : (
          <section className={styles.empty} aria-label="Evaluation status">
            <FileChartColumn aria-hidden="true" size={27} strokeWidth={1.5} />
            <h2>{proof.state === "missing" ? "No evaluation report yet" : "The evaluation report could not be read"}</h2>
            <p>Run the evaluation with a labeled dataset and <code>GEMINI_API_KEY</code> in <code>.env</code>.</p>
            <pre><code>npm run eval -- --limit 8</code></pre>
          </section>
        )}
      </div>
    </main>
  );
}
