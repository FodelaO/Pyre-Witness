# Pyre Witness evaluation dataset

Place both UTF-8 CSVs in `eval/dataset/`, with one item per row and unique IDs across both files. Use these headers in this order. Quote fields containing commas, quotes or line breaks, and escape literal double quotes by doubling them.

```csv
id,file,description,source_url,license,is_device,correct_category,correct_device_type,correct_radios,correct_ports,cloud,correct_physical_kind,correct_area,correct_level,never_areas,expected_risk_tags,difficulty,notes
```

- `id` is a stable slug of up to 100 letters, digits, underscores, or hyphens. IDs are checked case-insensitively. Supply exactly one of `file` and `description`. `file` is a path relative to `eval/dataset/` with no leading slash or `..` segments. Use JPEG, PNG, or WebP up to 4.2 MB. `description` is the complete text shown to both systems, up to 12,000 characters. Keep expected answers out of image notes and filenames where possible. The harness sends image bytes without the filename.
- `source_url` is the original public HTTP(S) source, if applicable. Record `license` and provenance for each item, including collector-authored text or photos. Describe collection and exposure to the team in `SOURCES.md`. For gallery credits, include a Markdown table with local file in backticks, source page, creator credit, license, and license link in that order.
- `is_device` is `yes` or `no`. Include non-devices and unreadable captures. For `no`, leave device labels blank and leave `cloud` blank or `unknown`.
- For `yes`, provide `correct_category` from `DEVICE_CATEGORIES`, a short `correct_device_type`, and `correct_physical_kind` from `EQUIPMENT_KINDS`. Use `cloud` values `yes`, `no`, or `unknown`.
- `correct_radios` uses `wifi;bluetooth;cellular;zigbee;lora;nfc`. `correct_ports` uses connector names such as `RJ45;USB-A;RS-485;microSD`. An empty list means none. Use `unknown` alone when evidence cannot establish a list. Unknown lists are excluded from that metric.
- `correct_area` and `never_areas` use exact seed area IDs. `correct_level` uses `0`, `1`, `2`, `3`, `3.5`, `4`, or `5`. Supply all acceptable areas and levels as semicolon lists. Leave an optional list blank when there is no supported label. An acceptable area cannot also be forbidden.
- `expected_risk_tags` uses the vocabulary below. For device rows, `default_creds` also marks that default credentials are visible or stated in the capture. Its absence labels the visible-default-credentials flag as false. `notes` can document ambiguity or unusual cases and stays out of model inputs.
- `difficulty` is `clean`, `messy`, or `edge`. Use `clean` for clear evidence, `messy` for noise or occlusion, and `edge` for unusually ambiguous, negative, or placement-sensitive cases.

## Product links

Collect 5–10 product links across tanks, sensors, cameras, and gateways. Use a URL specific enough to support the expected labels. Record source and redistribution terms in `SOURCES.md`.

```csv
id,url,expected_physical_kind,expected_area,expected_capacity_or_size,expected_risk_tags,notes
```

Use the same kind enum and semicolon-separated area and risk labels. When a page provides capacity or size, record the value with units. Leave it blank if unsupported. These rows are positive device inputs, reported as their own group because they have no difficulty label.

## Risk vocabulary

| Tag | Evidence to label |
| --- | --- |
| `wireless` | Radio connectivity or RF exposure |
| `default_creds` | Factory or default credentials visible or stated in the input |
| `removable_media` | Removable storage or media use |
| `cloud` | Cloud service dependency or connectivity |
| `remote_access` | Remote support, maintenance, or access |
| `transient` | Temporary, portable, or unmanaged equipment |
| `hazardous_area` | Suitability for a classified physical zone |
| `washdown` | Ingress or sanitary constraints from washing or cleaning |
| `physical_port` | Exposed physical connector or service port |
| `camera_view` | Field of view, privacy, or unintended recording |

```sh
npx tsx eval/validate.ts
```
