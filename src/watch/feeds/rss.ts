/** Reads publisher RSS with bounded plain-text summaries and HTTPS links. */
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { parse } from "node-html-parser";
import { z } from "zod";

const parser = new XMLParser({ parseTagValue: false, processEntities: false });
const rowSchema = z.object({
  title: z.string(),
  link: z.string(),
  pubDate: z.string(),
  description: z.string().optional(),
});
const rootSchema = z.object({ rss: z.object({ channel: z.object({ item: z.unknown().optional() }) }) });

function readText(html: string): string {
  const root = parse(html);
  root.removeWhitespace();
  for (const node of root.querySelectorAll("script, style")) node.remove();
  return root.text;
}

export function plainText(html: string, limit: number): string {
  const decoded = readText(html);
  const text = /<\/?[a-z][^>]*>/i.test(decoded) ? readText(decoded) : decoded;
  return text.replace(/\s+/g, " ").trim().slice(0, limit);
}

export function findCves(text: string): string[] {
  return [...new Set(text.match(/\bCVE-\d{4}-\d{4,}\b/gi)?.map((id) => id.toUpperCase()) ?? [])];
}

export function readRss(xml: string, hostname: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) {
    throw new Error("Invalid RSS document");
  }
  const { rss: { channel: { item } } } = rootSchema.parse(parser.parse(xml));
  const rows = Array.isArray(item) ? item : item === undefined ? [] : [item];
  const entries = rows.flatMap((row) => {
    const result = rowSchema.safeParse(row);
    if (!result.success) return [];
    const { title, link, pubDate, description } = result.data;
    const href = link.replaceAll("&amp;", "&");
    if (!URL.canParse(href)) return [];
    const url = new URL(href);
    const published = Date.parse(pubDate);
    const name = plainText(title, 360);
    if (url.origin !== `https://${hostname}` || url.username || url.password || !name || !Number.isFinite(published)) return [];
    return [{
      title: name,
      url: url.href,
      published: new Date(published).toISOString(),
      summary: plainText(description ?? "", 1400),
      cves: findCves(`${title} ${description ?? ""}`),
    }];
  });
  if (rows.length && !entries.length) throw new Error("No parseable RSS items");
  return entries;
}
