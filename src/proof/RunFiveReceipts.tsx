/** Shows three original evaluation photos beside the two outputs and the recorded rules check. */
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import type { readExamples } from "./runFiveEvidence";

const readArea = (area: string) => area === "filler3" ? "Filler 3"
  : area.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function RunFiveReceipts({ examples }: { examples: Awaited<ReturnType<typeof readExamples>> }) {
  return (
    <section className="pw-run5-section" aria-labelledby="pw-run5-receipts">
      <div className="pw-run5-section-heading">
        <h2 id="pw-run5-receipts">Three captures, two recommendations</h2>
        <span>Selected Run 5 receipts · outputs summarized</span>
      </div>
      <div className="pw-run5-cases">
        {examples.map((example, index) => {
          if (!example) return <p key={index} className="pw-judge-panel">Archived receipt unavailable.</p>;
          const { id, title, item, baselinePlacement, systemPlacement, forbidden, revised } = example;
          return (
            <article key={id} className="pw-run5-case pw-judge-panel">
              <div className="pw-run5-case-top">
                <a className="pw-run5-photo" href={item.sourceUrl ?? `/proof/capture-image/${id}`} aria-label={`Source photo for ${title}`}>
                  <Image src={`/proof/capture-image/${id}`} alt={title} fill unoptimized sizes="88px" />
                </a>
                <div>
                  <span className="pw-run5-tag">{id}</span>
                  <h3>{title}</h3>
                  {item.credit && <p className="pw-run5-credit">{item.credit.author.split(" / ")[0]}
                    {item.license && <> · {item.credit.termsUrl ? <a href={item.credit.termsUrl}>{item.license}</a> : item.license}</>}
                  </p>}
                </div>
              </div>
              <dl className="pw-run5-answers">
                <div>
                  <dt>Single Gemini call</dt>
                  <dd><strong>{readArea(baselinePlacement.physical_placement.area)}</strong>
                    {forbidden && <span className="pw-run5-forbidden">Forbidden by case label</span>}
                    <p>{example.baseline}</p>
                  </dd>
                </div>
                <div>
                  <dt>Pyre Witness</dt>
                  <dd><strong>{readArea(systemPlacement.physical_placement.area)}</strong><p>{example.system}</p></dd>
                </div>
              </dl>
              <details className="pw-run5-finding">
                <summary><ShieldCheck size={15} aria-hidden /> Rules engine · {example.rule}
                  {revised ? " · Revised" : " · Original drop"}
                </summary>
                <p>{example.ruleDetail}</p>
              </details>
              <p className="pw-run5-finding-copy">{example.finding}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
