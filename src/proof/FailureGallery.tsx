/** Shows the input and both answers for a few concrete evaluation failures. */
import Image from "next/image";
import { FileText } from "lucide-react";
import type { Answer, CaseResult } from "../../eval/failures";
import { SIDES } from "../../eval/types";
import { SIDE_NAME } from "./MetricBars";
import styles from "./proof.module.css";

function expected(item: CaseResult) {
  const { expected } = item;
  if (!expected.isDevice) return "Reject non-device or unreadable capture";
  const kind = expected.physicalKind?.replaceAll("_", " ");
  return [expected.deviceType ?? "Accept device", kind && kind !== expected.deviceType ? kind : null, expected.areas.join(" or "),
    expected.levels.length ? `Purdue ${expected.levels.join(" or ")}` : null,
    expected.neverAreas.length ? `Avoid ${expected.neverAreas.join(", ")}` : null].filter(Boolean).join(" · ");
}

function answer(value?: Answer) {
  if (!value) return "Not run";
  const admission = value.accepted === false ? "Rejected" : value.accepted === true ? "Accepted" : "No gate answer";
  const kind = value.physicalKind?.replaceAll("_", " ");
  return [value.deviceType ?? admission, kind && kind !== value.deviceType ? kind : null, value.area, value.level === null ? null : `Purdue ${value.level}`,
    value.rulesPassed === false ? "Rule check failed" : null, value.error?.message].filter(Boolean).join(" · ");
}

export function FailureGallery({ cases }: { cases: CaseResult[] }) {
  const ranked = [...cases].sort((a, b) => Number(Boolean(b.file)) - Number(Boolean(a.file)));
  const displayed = ranked.slice(0, 6);
  return (
    <section className={styles.failures} aria-labelledby="failures">
      <div className={styles.sectionHeading}>
        <h2 id="failures">Where it still fails</h2>
        {cases.length > 0 && <span>{displayed.length} of {cases.length} flagged cases</span>}
      </div>
      {!cases.length && <p>No discrepancies were detected on the measured labels.</p>}
      <div className={styles.gallery}>
        {displayed.map((item) => (
          <article className={styles.case} key={item.id}>
            <div className={styles.caseMedia}>
              {item.file ? (
                <Image src={`/proof/failure-image/${encodeURIComponent(item.id)}`} alt={`Evaluation capture ${item.file}`}
                  fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 340px" unoptimized />
              ) : <FileText size={28} strokeWidth={1.25} aria-hidden="true" />}
            </div>
            <div className={styles.caseBody}>
              <div className={styles.caseHeading}><h3>{item.file ?? item.id}</h3><span>{item.group}</span></div>
              {item.file && (
                <p className={styles.photoCredit}>
                  {item.credit?.author && <span>{item.credit.author}</span>}
                  {item.credit?.termsUrl ? <a href={item.credit.termsUrl}>{item.license}</a> : <span>{item.license}</span>}
                  {item.sourceUrl && <a href={item.sourceUrl}>Photo source</a>}
                </p>
              )}
              <dl>
                <dt>Expected</dt><dd>{expected(item)}</dd>
                {SIDES.map((side) => <div key={side}><dt>{SIDE_NAME[side]}</dt><dd>{answer(item.answers[side])}</dd></div>)}
              </dl>
              <ul className={styles.diagnoses}>
                {item.diagnoses.map(({ side, category, detail }) => (
                  <li key={`${side}/${category}/${detail}`}><strong>{SIDE_NAME[side]} · {category}</strong><span>{detail}</span></li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
