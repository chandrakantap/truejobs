import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeContentHash,
  htmlToText,
  normalizeWhitespace,
  sanitizeDescriptionHtml,
} from "../src/normalization/index.js";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/html/${name}`, import.meta.url), "utf8");

describe("sanitizeDescriptionHtml", () => {
  const out = sanitizeDescriptionHtml(fixture("xss.html"));

  it("drops script, style, iframe, img and svg entirely", () => {
    expect(out).not.toMatch(/<(script|style|iframe|img|svg|circle)/i);
    expect(out).not.toContain("alert(1)");
  });
  it("removes style, class, id and on* attributes", () => {
    expect(out).not.toMatch(/\s(style|class|id|onclick|onerror|onload)=/i);
    expect(out).toContain("<p>Hi</p>");
  });
  it("neutralizes javascript: links", () => {
    expect(out).not.toContain("javascript:");
  });
  it("neutralizes data: links", () => {
    expect(out).not.toContain("data:");
  });
  it("forces rel and target on allowed links", () => {
    const html = sanitizeDescriptionHtml('<a href="https://example.com" target="_self">x</a>');
    expect(html).toBe('<a href="https://example.com" rel="nofollow noopener noreferrer" target="_blank">x</a>');
  });
  it("keeps mailto links", () => {
    expect(sanitizeDescriptionHtml('<a href="mailto:a@b.co">m</a>')).toContain('href="mailto:a@b.co"');
  });
  it("unescapes entity-escaped Greenhouse content once", () => {
    const html = sanitizeDescriptionHtml(fixture("greenhouse-escaped.html"));
    expect(html).toContain("<h2>About the role</h2>");
    expect(html).toContain("<li>TypeScript</li>");
    expect(html).toContain("Build &amp; ship APIs.");
  });
  it("does not unescape input that already has real tags", () => {
    expect(sanitizeDescriptionHtml("<p>a &lt;b&gt; c</p>")).toBe("<p>a &lt;b&gt; c</p>");
  });
  it("keeps lists and headings of a Lever-style description and turns div into p", () => {
    const html = sanitizeDescriptionHtml(fixture("lever.html"));
    expect(html).toContain("<h3>What you'll do</h3>");
    expect(html).toContain("<ul><li>Design services</li>");
    expect(html).toContain("<p>We are hiring a backend engineer.</p>");
    expect(html).not.toContain("<div");
  });
  it("maps headings and collapses empties in a Workday-style description", () => {
    const html = sanitizeDescriptionHtml(fixture("workday.html"));
    expect(html).toContain("<h2>Software Engineer II</h2>");
    expect(html).toContain("<h4>Benefits</h4>");
    expect(html).toContain("<ol><li>Own features end to end</li>");
    expect(html).not.toMatch(/<p>\s*<\/p>/);
    expect(html).not.toMatch(/(<br\s*\/?>\s*){3,}/);
    expect(html).toContain("<table>");
  });
  it("truncates output above 200 KB at a tag boundary", () => {
    const html = sanitizeDescriptionHtml("<p>" + "word ".repeat(20) + "</p>".repeat(1) + "<p>x</p>".repeat(60_000));
    expect(Buffer.byteLength(html)).toBeLessThanOrEqual(200 * 1024);
    expect(html.endsWith(">")).toBe(true);
  });
});

describe("htmlToText", () => {
  it("matches the snapshot for a Lever-style fixture", () => {
    expect(htmlToText(sanitizeDescriptionHtml(fixture("lever.html")))).toMatchInlineSnapshot(`
      "We are hiring a backend engineer.

      What you'll do

      • Design services
      • Review code

      Requirements

      • 3+ years Node.js
      • SQL

      Apply here"
    `);
  });
  it("keeps link text only", () => {
    expect(htmlToText('<p>See <a href="https://x.example">docs</a></p>')).toBe("See docs");
  });
  it("caps output at 50,000 characters", () => {
    expect(htmlToText("<p>" + "a".repeat(60_000) + "</p>")).toHaveLength(50_000);
  });
});

describe("normalizeWhitespace", () => {
  it("collapses runs and trims", () => {
    expect(normalizeWhitespace("  a \n\t b  c  ")).toBe("a b c");
  });
});

describe("computeContentHash", () => {
  const base = {
    title: "Backend Engineer",
    descriptionText: "Build APIs.\nShip them.",
    locationRaw: "Berlin, Germany",
    salaryMin: 80000,
    salaryMax: 100000,
    salaryCurrency: "EUR",
    salaryPeriod: "YEAR",
  };

  it("is a sha256 hex digest", () => {
    expect(computeContentHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("ignores whitespace and case changes", () => {
    expect(
      computeContentHash({
        ...base,
        title: "  backend engineer ",
        descriptionText: "Build   APIs. Ship them.  ",
        locationRaw: " berlin, GERMANY",
      }),
    ).toBe(computeContentHash(base));
  });
  it("changes on a one-word wording change", () => {
    expect(computeContentHash({ ...base, descriptionText: "Build APIs. Ship it." })).not.toBe(computeContentHash(base));
  });
  it("changes on a salary change", () => {
    expect(computeContentHash({ ...base, salaryMax: 110000 })).not.toBe(computeContentHash(base));
  });
  it("treats missing and null salary fields alike", () => {
    const { salaryMin, salaryMax, salaryCurrency, salaryPeriod, ...bare } = base;
    void [salaryMin, salaryMax, salaryCurrency, salaryPeriod];
    expect(computeContentHash(bare)).toBe(
      computeContentHash({ ...bare, salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null }),
    );
  });
});
