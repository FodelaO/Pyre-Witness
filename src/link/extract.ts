/**
 * Pure HTML -> product fields extractor using node-html-parser.
 * Extracts title, description, JSON-LD Product fields, specification tables /
 * definition lists / feature bullets, and resolves the main product image URL.
 */
import { parse, type HTMLElement } from "node-html-parser";

export const MAX_SPEC_TEXT_CHARS = 6_000;

export interface ExtractedProduct {
  title: string;
  description: string;
  specText: string;
  imageUrl: string | null;
}

interface JsonLdProduct {
  name: string | null;
  brand: string | null;
  model: string | null;
  sku: string | null;
  description: string | null;
  properties: Array<{ name: string; value: string }>;
  imageUrl: string | null;
}

const SPEC_HEADING_RE =
  /\b(spec(?:ification)?s?|technical\s+data|technical\s+spec(?:ification)?s?|features?|key\s+features?|highlights?|parameters?|properties|dimensions?|ratings?|electrical|mechanical|characteristics?|product\s+data|data\s+sheet|overview|details?)\b/i;

const NON_PRODUCT_IMG_RE =
  /\b(logo|icon|sprite|avatar|badge|flag|social|pixel|spacer|tracking|placeholder|spinner|loader|arrow|chevron|banner-ad|payment|visa|mastercard|paypal)\b/i;

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

function cleanText(raw: string | null | undefined): string {
  if (!raw) return "";
  return decodeEntities(raw).replace(/\s+/g, " ").trim();
}

function stripTags(raw: string): string {
  if (!raw.includes("<")) return cleanText(raw);
  return cleanText(parse(raw).text);
}

function resolveHttpUrl(candidate: string | null | undefined, baseUrl: string): string | null {
  if (!candidate) return null;
  const trimmed = decodeEntities(candidate).trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:") || trimmed.startsWith("blob:")) {
    return null;
  }
  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function readMeta(root: HTMLElement, selectors: string[]): string {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    const content = cleanText(el?.getAttribute("content"));
    if (content) return content;
  }
  return "";
}

function isProductType(rawType: unknown): boolean {
  if (typeof rawType === "string") {
    const normalized = rawType.toLowerCase();
    return normalized === "product" || normalized.endsWith("/product") || normalized.endsWith(":product");
  }
  if (Array.isArray(rawType)) {
    return rawType.some(isProductType);
  }
  return false;
}

function extractStringField(value: unknown): string | null {
  if (typeof value === "string") {
    const cleaned = stripTags(value);
    return cleaned || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string") {
      const cleaned = stripTags(record.name);
      return cleaned || null;
    }
    if (typeof record.value === "string" || typeof record.value === "number") {
      const cleaned = stripTags(String(record.value));
      return cleaned || null;
    }
  }
  return null;
}

function extractJsonLdImage(value: unknown, baseUrl: string): string | null {
  if (typeof value === "string") {
    return resolveHttpUrl(value, baseUrl);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractJsonLdImage(item, baseUrl);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["url", "contentUrl", "@id"]) {
      if (typeof record[key] === "string") {
        const found = resolveHttpUrl(record[key], baseUrl);
        if (found) return found;
      }
    }
  }
  return null;
}

function findProductNodes(node: unknown, out: Record<string, unknown>[]): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) findProductNodes(item, out);
    return;
  }
  if (typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  if (isProductType(record["@type"])) {
    out.push(record);
    return;
  }
  if (record["@graph"]) findProductNodes(record["@graph"], out);
  if (record.mainEntity) findProductNodes(record.mainEntity, out);
  if (record.itemReviewed) findProductNodes(record.itemReviewed, out);
}

function extractJsonLdProduct(root: HTMLElement, baseUrl: string): JsonLdProduct | null {
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  const products: Record<string, unknown>[] = [];

  for (const script of scripts) {
    const raw = script.rawText
      .trim()
      .replace(/^<!--/, "")
      .replace(/-->$/, "")
      .replace(/^<!\[CDATA\[/, "")
      .replace(/\]\]>$/, "")
      .trim();
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      findProductNodes(parsed, products);
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  if (!products.length) return null;

  const result: JsonLdProduct = {
    name: null,
    brand: null,
    model: null,
    sku: null,
    description: null,
    properties: [],
    imageUrl: null,
  };

  for (const prod of products) {
    result.name ??= extractStringField(prod.name);
    result.brand ??= extractStringField(prod.brand);
    result.model ??= extractStringField(prod.model) ?? extractStringField(prod.mpn);
    result.sku ??= extractStringField(prod.sku);
    result.description ??= extractStringField(prod.description);
    result.imageUrl ??= extractJsonLdImage(prod.image, baseUrl);

    const rawProps = prod.additionalProperty;
    const propList = Array.isArray(rawProps) ? rawProps : rawProps ? [rawProps] : [];
    for (const item of propList) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const propName = extractStringField(rec.name) ?? extractStringField(rec.propertyID);
      const propValue = extractStringField(rec.value);
      const unit = extractStringField(rec.unitText) ?? extractStringField(rec.unitCode);
      if (propName && propValue) {
        const fullValue = unit && !propValue.toLowerCase().includes(unit.toLowerCase())
          ? `${propValue} ${unit}`
          : propValue;
        result.properties.push({ name: propName, value: fullValue });
      }
    }
  }

  return result;
}

function isInsideNoiseContainer(el: HTMLElement): boolean {
  let cursor: HTMLElement | null = el.parentNode;
  while (cursor) {
    const tag = cursor.tagName?.toLowerCase();
    if (tag === "nav" || tag === "footer" || tag === "aside") return true;
    cursor = cursor.parentNode;
  }
  return false;
}

function extractNearestHeadingText(el: HTMLElement): string {
  // Check previous element siblings and parent's heading/title/class/id.
  const parent = el.parentNode;
  if (!parent) return "";

  const siblings = parent.children;
  const idx = siblings.indexOf(el);
  for (let i = idx - 1; i >= 0 && i >= idx - 3; i--) {
    const sib = siblings[i];
    const tag = sib.tagName?.toLowerCase() ?? "";
    if (/^h[1-6]$/.test(tag) || tag === "caption" || tag === "legend" || tag === "summary") {
      return cleanText(sib.text);
    }
    const nestedHeading = sib.querySelector("h1, h2, h3, h4, h5, h6");
    if (nestedHeading) return cleanText(nestedHeading.text);
  }

  // Also inspect parent attributes and first heading inside the parent section.
  const parentMeta = `${parent.getAttribute("id") ?? ""} ${parent.getAttribute("class") ?? ""} ${parent.getAttribute("aria-label") ?? ""}`;
  if (SPEC_HEADING_RE.test(parentMeta)) return parentMeta;

  const parentHeading = parent.querySelector("h1, h2, h3, h4, h5, h6");
  if (parentHeading) return cleanText(parentHeading.text);

  return "";
}

function hasSpecContext(el: HTMLElement): boolean {
  const ownMeta = `${el.getAttribute("id") ?? ""} ${el.getAttribute("class") ?? ""} ${el.getAttribute("aria-label") ?? ""}`;
  if (SPEC_HEADING_RE.test(ownMeta)) return true;

  const caption = el.querySelector("caption");
  if (caption && SPEC_HEADING_RE.test(cleanText(caption.text))) return true;

  const heading = extractNearestHeadingText(el);
  return SPEC_HEADING_RE.test(heading);
}

function extractTableLines(root: HTMLElement): string[] {
  const lines: string[] = [];
  for (const table of root.querySelectorAll("table")) {
    if (isInsideNoiseContainer(table)) continue;
    const rows = table.querySelectorAll("tr");
    if (rows.length === 0) continue;

    const specContext = hasSpecContext(table);
    const extracted: string[] = [];
    for (const row of rows) {
      const cells = row.children.filter((c) => {
        const tag = c.tagName?.toLowerCase();
        return tag === "th" || tag === "td";
      });
      if (cells.length === 2) {
        const key = cleanText(cells[0].text).replace(/:$/, "");
        const value = cleanText(cells[1].text);
        if (key && value && key.length <= 80 && value.length <= 300) {
          extracted.push(`${key}: ${value}`);
        }
      } else if (specContext && cells.length >= 3 && cells.length <= 4) {
        const parts = cells.map((c) => cleanText(c.text)).filter(Boolean);
        if (parts.length >= 2) {
          extracted.push(`${parts[0].replace(/:$/, "")}: ${parts.slice(1).join(" | ")}`);
        }
      }
    }

    // Accept spec-context tables, or clean 2-column key/value tables with at least 2 rows.
    if (specContext || extracted.length >= 2) {
      lines.push(...extracted);
    }
  }
  return lines;
}

function extractDefinitionListLines(root: HTMLElement): string[] {
  const lines: string[] = [];
  for (const dl of root.querySelectorAll("dl")) {
    if (isInsideNoiseContainer(dl)) continue;
    const children = dl.children;
    let currentTerm = "";
    for (const child of children) {
      const tag = child.tagName?.toLowerCase();
      if (tag === "dt") {
        currentTerm = cleanText(child.text).replace(/:$/, "");
      } else if (tag === "dd" && currentTerm) {
        const value = cleanText(child.text);
        if (value) lines.push(`${currentTerm}: ${value}`);
      } else if (tag === "div") {
        // HTML allows <div> wrappers inside <dl>
        const dt = child.querySelector("dt");
        const dds = child.querySelectorAll("dd");
        const term = cleanText(dt?.text).replace(/:$/, "");
        if (term && dds.length) {
          const val = dds.map((d) => cleanText(d.text)).filter(Boolean).join("; ");
          if (val) lines.push(`${term}: ${val}`);
        }
      }
    }
  }
  return lines;
}

function extractSpecListLines(root: HTMLElement): string[] {
  const lines: string[] = [];
  for (const list of root.querySelectorAll("ul, ol")) {
    if (isInsideNoiseContainer(list)) continue;
    if (!hasSpecContext(list)) continue;
    for (const li of list.children) {
      if (li.tagName?.toLowerCase() !== "li") continue;
      const text = cleanText(li.text);
      if (text && text.length >= 3 && text.length <= 350) {
        lines.push(text);
      }
    }
  }
  return lines;
}

function pickBestSrcFromSrcset(srcset: string): string | null {
  let bestUrl: string | null = null;
  let bestWeight = -1;
  for (const entry of srcset.split(",")) {
    const parts = entry.trim().split(/\s+/);
    if (!parts[0]) continue;
    const descriptor = parts[1] ?? "";
    let weight = 0;
    const widthMatch = /^(\d+)w$/i.exec(descriptor);
    const densityMatch = /^(\d+(?:\.\d+)?)x$/i.exec(descriptor);
    if (widthMatch) weight = Number(widthMatch[1]);
    else if (densityMatch) weight = Number(densityMatch[1]) * 1000;
    if (weight >= bestWeight) {
      bestWeight = weight;
      bestUrl = parts[0];
    }
  }
  return bestUrl;
}

function parseDimension(attr: string | undefined): number {
  if (!attr) return 0;
  const match = /^(\d+(?:\.\d+)?)/.exec(attr.trim());
  return match ? Number(match[1]) : 0;
}

function findLargestProductImage(root: HTMLElement, baseUrl: string): string | null {
  let bestUrl: string | null = null;
  let bestScore = -1;

  for (const img of root.querySelectorAll("img")) {
    if (isInsideNoiseContainer(img)) continue;

    // Skip images inside site <header> unless they look huge.
    let inHeader = false;
    let cursor: HTMLElement | null = img.parentNode;
    while (cursor) {
      if (cursor.tagName?.toLowerCase() === "header") {
        inHeader = true;
        break;
      }
      cursor = cursor.parentNode;
    }

    const rawSrc =
      img.getAttribute("src") ||
      img.getAttribute("data-src") ||
      img.getAttribute("data-original") ||
      (img.getAttribute("srcset") ? pickBestSrcFromSrcset(img.getAttribute("srcset")!) : null);

    const resolved = resolveHttpUrl(rawSrc, baseUrl);
    if (!resolved) continue;

    const lowerPath = new URL(resolved).pathname.toLowerCase();
    if (lowerPath.endsWith(".svg") || lowerPath.endsWith(".ico") || lowerPath.endsWith(".gif")) {
      continue;
    }

    const descriptors = `${resolved} ${img.getAttribute("alt") ?? ""} ${img.getAttribute("class") ?? ""} ${img.getAttribute("id") ?? ""}`;
    if (NON_PRODUCT_IMG_RE.test(descriptors)) continue;

    const width = parseDimension(img.getAttribute("width"));
    const height = parseDimension(img.getAttribute("height"));

    // Ignore tiny icons and tracking pixels when dimensions are explicitly given.
    if ((width > 0 && width < 80) || (height > 0 && height < 80)) continue;

    let score = 0;
    if (width > 0 && height > 0) {
      score = width * height;
    } else if (width > 0 || height > 0) {
      const side = Math.max(width, height);
      score = side * side;
    } else {
      // Unknown dimensions get a modest baseline score.
      score = 200 * 200;
    }

    if (inHeader) score *= 0.1;
    if (/\b(product|hero|main|gallery|photo|device|equipment)\b/i.test(descriptors)) {
      score *= 1.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestUrl = resolved;
    }
  }

  return bestUrl;
}

function deduplicateAndCap(lines: string[], maxChars: number): string {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const raw of lines) {
    const line = cleanText(raw);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(line);
  }

  const joined = unique.join("\n");
  if (joined.length <= maxChars) return joined;

  // Truncate cleanly on a line boundary if possible, otherwise word boundary.
  const sliced = joined.slice(0, maxChars);
  const lastNewline = sliced.lastIndexOf("\n");
  if (lastNewline >= maxChars * 0.75) {
    return sliced.slice(0, lastNewline).trimEnd();
  }
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace >= maxChars * 0.85) {
    return sliced.slice(0, lastSpace).trimEnd();
  }
  return sliced.trimEnd();
}

/**
 * Pure extraction from raw HTML + final page URL into structured product fields.
 */
export function extractProductInfo(html: string, pageUrl: string): ExtractedProduct {
  const root = parse(html, { comment: false });

  // Extract JSON-LD before removing script/style noise.
  const jsonLd = extractJsonLdProduct(root, pageUrl);

  const ogTitle = readMeta(root, ['meta[property="og:title"]', 'meta[name="og:title"]']);
  const docTitle = cleanText(root.querySelector("title")?.text);
  const h1Title = cleanText(root.querySelector("h1")?.text);
  const fallbackHost = (() => {
    try {
      return new URL(pageUrl).hostname;
    } catch {
      return "Product page";
    }
  })();

  const title = ogTitle || docTitle || h1Title || jsonLd?.name || fallbackHost;

  const metaDescription = readMeta(root, [
    'meta[property="og:description"]',
    'meta[name="og:description"]',
    'meta[name="description"]',
  ]);
  const description = metaDescription || jsonLd?.description || "";

  const ogImage = resolveHttpUrl(
    readMeta(root, [
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image"]',
      'meta[name="og:image"]',
    ]),
    pageUrl,
  );

  // Strip non-visible script/style/noscript/template nodes before reading tables & lists.
  for (const noise of root.querySelectorAll("script, style, noscript, template, svg")) {
    noise.remove();
  }

  const imageUrl = ogImage ?? jsonLd?.imageUrl ?? findLargestProductImage(root, pageUrl);

  const specLines: string[] = [];

  if (jsonLd?.name && jsonLd.name.toLowerCase() !== title.toLowerCase()) {
    specLines.push(`Product: ${jsonLd.name}`);
  }
  if (jsonLd?.brand) specLines.push(`Brand: ${jsonLd.brand}`);
  if (jsonLd?.model) specLines.push(`Model: ${jsonLd.model}`);
  if (jsonLd?.sku) specLines.push(`SKU: ${jsonLd.sku}`);
  if (description) specLines.push(`Description: ${description}`);
  if (jsonLd?.description && jsonLd.description.toLowerCase() !== description.toLowerCase()) {
    specLines.push(`Details: ${jsonLd.description}`);
  }
  if (jsonLd) {
    for (const prop of jsonLd.properties) {
      specLines.push(`${prop.name}: ${prop.value}`);
    }
  }

  specLines.push(...extractTableLines(root));
  specLines.push(...extractDefinitionListLines(root));
  specLines.push(...extractSpecListLines(root));

  const specText = deduplicateAndCap(specLines, MAX_SPEC_TEXT_CHARS);

  return {
    title,
    description,
    specText,
    imageUrl,
  };
}
