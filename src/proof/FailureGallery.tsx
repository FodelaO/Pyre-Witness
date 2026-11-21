/** Shows the input and both answers for a few concrete evaluation failures. */
import Image from "next/image";
import { FileText } from "lucide-react";
import { DIAGNOSIS_CATEGORIES, type Answer, type CaseResult } from "../../eval/failures";
import { SIDES } from "../../eval/types";
import { SIDE_NAME } from "./MetricBars";

function expected(item: CaseResult) {
  const { expected } = item;
  if (!expected.isDevice) return Object.values(item.answers).some((value) => value.objectAssessment)
    ? "Non-device · assess physical safety if usable" : "Reject non-device or unreadable capture";
  const kind = expected.physicalKind?.replaceAll("_", " ");
  return [expected.deviceType ?? "Accept device", kind && kind !== expected.deviceType ? kind : null, expected.areas.join(" or "),
    expected.levels.length ? `Purdue ${expected.levels.join(" or ")}` : null,
    expected.neverAreas.length ? `Avoid ${expected.neverAreas.join(", ")}` : null].filter(Boolean).join(" · ");
}

function answer(value?: Answer) {
  if (!value) return "Not run";
  const object = value.objectAssessment;
  const admission = value.accepted === false ? (object ? "Stopped" : "Rejected") : value.accepted === true ? (object ? "Continued" : "Accepted") : "No gate answer";
  const kind = value.physicalKind?.replaceAll("_", " ");
  return [value.deviceType ?? admission, object?.objectClass?.replaceAll("_", " "), kind && kind !== value.deviceType ? kind : null, value.area,
    value.level === null || object?.objectClass === "passive_object" ? null : `Purdue ${value.level}`,
    value.rulesPassed === false ? "Rule check failed" : null, value.error?.message].filter(Boolean).join(" · ");
}

const list = (values: readonly string[]) => values.length ? values.join(", ") : "none";

function measuredFields(value: Answer | CaseResult["expected"]) {
  const object = "objectAssessment" in value ? value.objectAssessment : undefined;
  return [
    value.radios && `radios ${list(value.radios)}`,
    value.ports && `ports ${list(value.ports)}`,
    value.cloud !== null && value.cloud !== undefined && `cloud ${value.cloud ? "yes" : "no"}`,
    value.defaultCredentials !== null && value.defaultCredentials !== undefined
      && `visible defaults ${value.defaultCredentials ? "yes" : "no"}`,
    value.capacity && `size ${value.capacity}`,
    value.riskTags.length > 0 && `risks ${list(value.riskTags)}`,
    object?.safetyDrop?.concerns.length && `as dropped ${list(object.safetyDrop.concerns)}`,
    object?.cyberClaims.length && `cyber claims ${list(object.cyberClaims)}`,
  ].filter(Boolean).join(" · ");
}

function FailureCase({ item }: { item: CaseResult }) {
  const expectedFields = measuredFields(item.expected);
  return (
    <article className="pw-proof-case">
      <div className="pw-proof-case-media">
        {item.file ? (
          <Image src={`/proof/failure-image/${encodeURIComponent(item.id)}`} alt={`Capture ${item.id}`}
            fill sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 340px" unoptimized />
        ) : <FileText size={28} strokeWidth={1.25} aria-hidden="true" />}
      </div>
      <div className="pw-proof-case-body">
        <div className="pw-proof-case-heading"><h3>{item.file ?? item.id}</h3><span>{item.group}</span></div>
        {item.file ? (
          <p className="pw-proof-photo-credit">
            {item.credit?.author && <span>{item.credit.author}</span>}
            {item.credit?.termsUrl ? <a href={item.credit.termsUrl}>{item.license}</a> : <span>{item.license}</span>}
            {item.sourceUrl && <a href={item.sourceUrl}>Photo source</a>}
          </p>
        ) : item.sourceUrl && <p className="pw-proof-photo-credit"><a href={item.sourceUrl}>Product source</a></p>}
        <dl>
          <dt>Expected</dt><dd>{expected(item)}{expectedFields && <small>{expectedFields}</small>}</dd>
          {SIDES.map((side) => {
            const value = item.answers[side];
            const fields = value && measuredFields(value);
            return <div key={side}><dt>{SIDE_NAME[side]}</dt><dd>{answer(value)}{fields && <small>{fields}</small>}</dd></div>;
          })}
        </dl>
        <ul className="pw-proof-diagnoses">
          {item.diagnoses.map(({ side, category, detail }) => (
            <li key={`${side}/${category}/${detail}`}><strong>{SIDE_NAME[side]} · {category}</strong><span>{detail}</span></li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function FailureGallery({ cases }: { cases: CaseResult[] }) {
  const ranked = [...cases].sort((a, b) => Number(Boolean(b.file)) - Number(Boolean(a.file)));
  const examples = new Set<CaseResult>();
  for (const category of DIAGNOSIS_CATEGORIES) {
    if ([...examples].some(({ diagnoses }) => diagnoses.some((entry) => entry.side === "system" && entry.category === category))) continue;
    const item = ranked.find(({ diagnoses }) => diagnoses.some((entry) => entry.side === "system" && entry.category === category));
    if (item) examples.add(item);
  }
  for (const item of ranked) {
    if (examples.size >= 6) break;
    examples.add(item);
  }
  const more = ranked.filter((item) => !examples.has(item));
  return (
    <section className="pw-proof-failures" aria-labelledby="failures">
      <div className="pw-proof-section-heading">
        <h2 id="failures">Where it still fails</h2>
        {cases.length > 0 && <span>{cases.length} flagged captures</span>}
      </div>
      {!cases.length && <p>No flagged cases among completed attempts.</p>}
      <div className="pw-proof-gallery">
        {[...examples].map((item) => <FailureCase key={item.id} item={item} />)}
      </div>
      {more.length > 0 && <details className="pw-proof-more">
        <summary>Show {more.length} more flagged captures</summary>
        <div className="pw-proof-gallery">{more.map((item) => <FailureCase key={item.id} item={item} />)}</div>
      </details>}
    </section>
  );
}
