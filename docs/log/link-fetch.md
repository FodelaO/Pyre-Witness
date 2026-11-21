# `link-fetch` — Server-Side Product Page Fetcher

Implemented server-only product link fetching under `src/link/` for Pyre Witness link captures.

## Files Created / Changed

- `src/link/errors.ts` — `LinkFetchError` and `LinkFetchErrorCode` (`invalid_url`, `blocked_host`, `timeout`, `http_error`, `too_large`, `not_html`).
- `src/link/safeFetch.ts` — SSRF-guarded HTTP fetcher (`safeFetch`, `validateSafeUrl`, `isBlockedIp`, `isBlockedHostname`), size caps (`HTML_MAX_BYTES = 3 MB`, `IMAGE_MAX_BYTES = 4 MB`), timeout (`10 s`), redirect cap (`3` hops).
- `src/link/extract.ts` — Pure HTML extractor (`extractProductInfo`) using `node-html-parser`.
- `src/link/image.ts` — Main product image downloader (`fetchMainImage`) enforcing MIME (`image/jpeg`, `image/png`, `image/webp`), magic-byte checks, and the 4 MB cap without resizing.
- `src/link/fetchProductPage.ts` — Public entry point `fetchProductPage(url, options?): Promise<LinkSnapshot>` orchestrating HTML fetch, `Content-Type` validation, extraction, and optional image download (also re-exports `LinkFetchError`).
- `src/link/__fixtures__/` — 3 self-authored HTML fixtures (`tank-spec-table.html`, `camera-jsonld.html`, `meta-only.html`).
- `src/link/extract.test.ts`, `src/link/safeFetch.test.ts`, `src/link/fetchProductPage.test.ts` — Vitest unit suites (no live network).

## What Is Extracted (`extract.ts`)

1. **Title**: priority order `og:title` -> `<title>` -> first `<h1>` -> JSON-LD `Product.name` -> hostname fallback.
2. **Description**: `og:description` -> `meta[name="description"]` -> JSON-LD `Product.description`.
3. **JSON-LD `Product`**: recursively searches `<script type="application/ld+json">` blocks (including `@graph` and `mainEntity`) for `Product` nodes, extracting `name`, `brand`, `model`/`mpn`, `sku`, `description`, `additionalProperty` (with `unitText`/`unitCode`), and `image`.
4. **Spec Text (`specText`)**: combines JSON-LD structured fields, description, specification `<table>` rows (`Key: Value`), `<dl>` definition lists (`dt: dd`), and `<ul>`/`<ol>` bullet lists near spec/feature headings (`Specifications`, `Technical data`, `Features`, `Parameters`, `Dimensions`, `Ratings`, etc.) while excluding `<nav>`, `<footer>`, `<aside>`, `<script>`, and `<style>`. Lines are whitespace-normalized, case-insensitively deduplicated, and capped at `6,000` characters on a clean line/word boundary.
5. **Main Image URL (`imageUrl`)**: priority order `og:image:secure_url` / `og:image` -> JSON-LD `Product.image` -> largest non-icon/non-logo `<img>` outside nav/footer/aside (supports `src`, `data-src`, `data-original`, `srcset`), resolved against the final post-redirect URL.

## SSRF & Network Guard Rules (`safeFetch.ts`)

- **Scheme & credentials**: allows only `http:` and `https:`; rejects embedded URL credentials (`user:pass@`); sends `credentials: "omit"` with no `Cookie` or `Authorization` headers.
- **Blocked hostnames**: rejects `localhost`, `localhost.localdomain`, `ip6-localhost`, `ip6-loopback`, `metadata`, `metadata.google.internal`, `metadata.goog`, `instance-data`, and suffixes `.localhost`, `.local`, `.internal`, `.home.arpa`, `.intranet` (case-insensitive, trailing-dot normalized).
- **DNS resolution & IP blocklist**: resolves all A/AAAA records (`dns.lookup(..., { all: true, verbatim: true })`) and refuses the request if **any** returned address is non-public:
  - **IPv4**: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10` (CGNAT), `127.0.0.0/8`, `169.254.0.0/16` (link-local & cloud metadata), `172.16.0.0/12`, `192.0.0.0/24`, `192.0.2.0/24`, `192.88.99.0/24`, `192.168.0.0/16`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, `224.0.0.0/4` (multicast), `240.0.0.0/4` (reserved/broadcast). Also blocks integer/octal/hex IPv4 forms via WHATWG `URL` normalization.
  - **IPv6**: `::/96` (`::`, `::1`, IPv4-compatible), `fc00::/7` (ULA), `fe80::/10` (link-local), `fec0::/10`, `ff00::/8` (multicast), `100::/64`, `2001:db8::/32`, `64:ff9b:1::/48`, any zone-scoped address (`%...`), and embedded IPv4 checks for `::ffff:0:0/96`, `::ffff:0:0:0/96`, `64:ff9b::/96`, and `2002::/16`.
- **Redirects**: `redirect: "manual"`, maximum `3` hops; every `Location` target is resolved and re-validated through `validateSafeUrl`.
- **Limits & headers**: `10 s` total timeout (composable with caller `AbortSignal`), streaming byte caps (`3 MB` HTML, `4 MB` image) enforced both via `Content-Length` and chunked stream reading, browser-like `User-Agent` and `Accept-Language: en-US,en;q=0.9`.

## Verification

- Automated unit tests: `npx vitest run src/link` (3 test files, 80 tests passing, zero live network).
- Typecheck: `npm run typecheck`.
- Optional manual live smoke test (no extra script needed):
  ```bash
  npx tsx -e 'import { fetchProductPage } from "./src/link/fetchProductPage"; fetchProductPage("https://example.com").then(r => console.log({ url: r.url, title: r.title, specLen: r.specText.length, imageUrl: r.imageUrl, hasImage: Boolean(r.image) }))'
  ```

## Known Gaps & Limitations

- **JavaScript-rendered pages (SPAs)**: `safeFetch` retrieves raw server-sent HTML without executing JavaScript. Client-rendered storefronts that omit SSR HTML will only yield whatever `<title>`, Open Graph tags, or JSON-LD are present in the initial HTML shell (as covered by `meta-only.html`).
- **Bot protection / anti-scraping walls**: sites behind Cloudflare challenges, login gates, or aggressive WAFs may return HTTP 403/429 (`http_error`) or challenge HTML instead of product content.
- **No image downscaling**: per project constraints (no image processing library installed), images larger than 4 MB or in unsupported formats (e.g., AVIF, SVG) return `image: null` rather than being resized or converted.
- **DNS rebinding window**: `validateSafeUrl` validates DNS via `node:dns/promises` before calling Node's built-in `fetch` (undici), which performs its own socket-level lookup. Pinning the resolved IP at the socket layer requires a custom `undici` `Agent`/`connect` lookup option, which is not a direct dependency in `package.json`.
- **Pipeline error messaging**: `src/pipeline/server/run.ts` currently catches any error from `fetchProductPage` and replaces it with a generic message; if finer-grained messages (e.g., distinguishing `blocked_host` vs `timeout` vs `not_html`) are desired later, `run.ts` can inspect `err instanceof LinkFetchError`.
