# Run 4 pipeline scoring handoff

For the Pyre Witness side, read `perception.done.profile.physical_kind` as the final equipment kind. It is the validated Scout enum value the browser receives. The Scout `transcript.entry` keeps the raw model answer for diagnosis.

Use the last `summary.started.assessment` as the final assessment, including `assessment.risks`. This event follows the last Inspector check and carries the assessment the browser displays. Use the last `reasoning.done.assessment` or `revision.done.assessment` for archived runs that lack the final assessment. The optional field is typed on `StreamEvent` in `src/pipeline/server/sse.ts`. Risk items retain the existing `title`, `description`, and `technique` fields consumed by scoring and carry `RULE-` or `PROFILE-` provenance in their ID and description when applicable.

Apply the receipt selection change only to Pyre Witness. Keep the single-call Hydrogen baseline's prompt, schema, and scoring input fields unchanged. Continue scoring both sides through the same `makePrediction` and `riskTags` logic.
