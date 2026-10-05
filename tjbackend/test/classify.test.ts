import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyCategory, classifySeniority, normalizeTitle } from "../src/normalization/index.js";

interface TitleCase {
  title: string;
  department?: string;
  category: string;
  seniority: string;
}

const cases: TitleCase[] = JSON.parse(readFileSync(new URL("./fixtures/titles.json", import.meta.url), "utf8"));

const label = (c: TitleCase) => (c.department ? `${c.title} [${c.department}]` : c.title);

describe("title fixtures", () => {
  it("has at least 60 titles covering every category and seniority", () => {
    expect(cases.length).toBeGreaterThanOrEqual(60);
    expect(new Set(cases.map((c) => c.category)).size).toBe(13);
    expect(new Set(cases.map((c) => c.seniority)).size).toBe(9);
  });

  describe("classifyCategory", () => {
    it.each(cases.map((c) => [label(c), c] as const))("%s", (_name, c) => {
      expect(classifyCategory({ title: c.title, department: c.department })).toBe(c.category);
    });
  });

  describe("classifySeniority", () => {
    it.each(cases.map((c) => [label(c), c] as const))("%s", (_name, c) => {
      expect(classifySeniority({ title: c.title, department: c.department })).toBe(c.seniority);
    });
  });
});

describe("normalizeTitle", () => {
  it.each([
    ["Senior Full Stack Developer (m/f/d)", "senior full stack developer"],
    ["Backend Engineer (f/m/x)", "backend engineer"],
    ["Backend Engineer (All Genders)", "backend engineer"],
    ["Software Engineer (Remote)", "software engineer"],
    ["Software Engineer (Berlin, Germany)", "software engineer"],
    ["Software Engineer [R12345]", "software engineer"],
    ["Software Engineer (REQ-20931)", "software engineer"],
    ["Software Engineer (Payments)", "software engineer (payments)"],
    ["  Staff   Engineer \t Platform ", "staff engineer platform"],
    ["Sr. Engineer.", "sr. engineer"],
    ["Software Engineer - ", "software engineer"],
  ])("%s", (input, expected) => {
    expect(normalizeTitle(input)).toBe(expected);
  });
});
