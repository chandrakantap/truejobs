import { convert } from "html-to-text";
import sanitizeHtml from "sanitize-html";

const MAX_HTML_BYTES = 200 * 1024;
const MAX_TEXT_CHARS = 50_000;

const ALLOWED_TAGS = [
  "p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "u", "h2", "h3", "h4",
  "blockquote", "code", "pre", "a", "table", "thead", "tbody", "tr", "th", "td", "hr",
];

/** Collapses whitespace runs (including nbsp) to single spaces and trims. */
export function normalizeWhitespace(s: string): string {
  return s.replace(/[\s\u00a0]+/g, " ").trim();
}

function unescapeOnce(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
}

function truncateAtTag(html: string): string {
  if (Buffer.byteLength(html) <= MAX_HTML_BYTES) return html;
  let budget = MAX_HTML_BYTES;
  for (;;) {
    const lastClose = html.slice(0, budget).lastIndexOf(">");
    const cut = lastClose >= 0 ? html.slice(0, lastClose + 1) : "";
    // Re-sanitize to close any tags left open by the cut; shrink the budget if it still overflows.
    const out = sanitizeHtml(cut, { allowedTags: ALLOWED_TAGS, allowedAttributes: { a: ["href", "rel", "target"] } });
    if (Buffer.byteLength(out) <= MAX_HTML_BYTES || budget <= 0) return out;
    budget -= 1024;
  }
}

/** Makes ATS-provided HTML safe to render (architecture §7, content safety). */
export function sanitizeDescriptionHtml(raw: string): string {
  let input = raw;
  if (input.includes("&lt;") && !/<[a-z][^>]*>/i.test(input)) input = unescapeOnce(input);

  const clean = sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "rel", "target"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "iframe", "svg", "object", "embed", "form", "button"],
    transformTags: {
      h1: "h2",
      h5: "h4",
      h6: "h4",
      div: "p",
      section: "p",
      a: (_tag, attribs) => ({
        tagName: "a",
        attribs: {
          ...(attribs.href ? { href: attribs.href } : {}),
          rel: "nofollow noopener noreferrer",
          target: "_blank",
        },
      }),
    },
  });

  const collapsed = clean
    .replace(/<p>(?:\s|&nbsp;|\u00a0)*<\/p>/gi, "")
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br />")
    .trim();
  return truncateAtTag(collapsed);
}

/** Plain text for search and classification. */
export function htmlToText(html: string): string {
  const text = convert(html, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "ul", options: { itemPrefix: "• " } },
      { selector: "h2", options: { uppercase: false } },
      { selector: "h3", options: { uppercase: false } },
      { selector: "h4", options: { uppercase: false } },
      { selector: "table", format: "dataTable", options: { uppercase: false } },
    ],
  });
  const collapsed = text
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return collapsed.slice(0, MAX_TEXT_CHARS);
}
