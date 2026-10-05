import type { JobCategory, Seniority } from "../generated/prisma/enums.js";
import {
  CATEGORY_RULES,
  DEFAULT_NON_ENGINEERING_SENIORITY,
  DEFAULT_SENIORITY,
  ENGINEERING_DEPARTMENT_PHRASES,
  GENDER_MARKER_PATTERNS,
  NON_ENGINEERING_TITLE_PHRASES,
  REQUISITION_ID_PATTERN,
  SENIORITY_RULES,
} from "./dictionaries/roles.js";
import { parseLocations } from "./location.js";

const WORD_START = "(?<![\\p{L}\\p{N}_])";
const WORD_END = "(?![\\p{L}\\p{N}_])";
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const phraseCache = new Map<string, RegExp>();
function phraseRegExp(phrase: string): RegExp {
  let re = phraseCache.get(phrase);
  if (!re) {
    re = new RegExp(`${WORD_START}${escapeRegExp(phrase).replace(/\s+/g, "\\s+")}${WORD_END}`, "iu");
    phraseCache.set(phrase, re);
  }
  return re;
}

const hasPhrase = (text: string, phrase: string): boolean => phraseRegExp(phrase).test(text);
const hasAny = (text: string, phrases: readonly string[]): boolean => phrases.some((p) => hasPhrase(text, p));

export interface ClassifyCategoryInput {
  title: string;
  department?: string | null;
}

/** Rule-based job function. Ordered rules from dictionaries/roles.ts, first match wins. */
export function classifyCategory({ title, department }: ClassifyCategoryInput): JobCategory {
  if (hasAny(title, NON_ENGINEERING_TITLE_PHRASES)) return "NON_ENGINEERING";

  const dept = department ?? "";
  // A non-tech department hint needs no rule of its own: with no engineering keyword in the title
  // the loop finds nothing and the result is NON_ENGINEERING.
  for (const rule of CATEGORY_RULES) {
    if (hasAny(title, rule.phrases)) return rule.category;
    if (rule.conditionalPhrases?.some((c) => hasPhrase(title, c.phrase) && hasAny(title, c.requires))) {
      return rule.category;
    }
    if (rule.languageRoles && hasAny(title, rule.languageRoles.languages) && hasAny(title, rule.languageRoles.roleWords)) {
      return rule.category;
    }
    if (
      rule.bareWordsWithEngineeringDepartment &&
      hasAny(title, rule.bareWordsWithEngineeringDepartment) &&
      hasAny(dept, ENGINEERING_DEPARTMENT_PHRASES)
    ) {
      return rule.category;
    }
  }
  return "NON_ENGINEERING";
}

const romanRegExp = (numeral: string): RegExp => new RegExp(`(?<![\\w/&])${numeral}(?![\\w/&])`, "u");

/**
 * Rule-based seniority from the title. Ordered rules from dictionaries/roles.ts, first match wins.
 * The department is optional and only used to resolve the category for the unmarked-title fallback.
 */
export function classifySeniority({ title, department }: ClassifyCategoryInput): Seniority {
  const trimmed = title.trim();
  const category = classifyCategory({ title, department });
  const engineeringContext = category === "ENGINEERING_MANAGEMENT" || hasPhrase(title, "engineering");

  for (const rule of SENIORITY_RULES) {
    if (rule.requiresEngineeringContext && !engineeringContext) continue;
    if (hasAny(title, rule.phrases)) return rule.level;
    if (rule.romanNumerals?.some((n) => romanRegExp(n).test(trimmed))) return rule.level;
    if (rule.trailingDigits?.some((d) => new RegExp(`\\s${d}$`).test(trimmed))) return rule.level;
    if (rule.followedBy) {
      const { phrases, words } = rule.followedBy;
      const followed = phrases.some((p) =>
        words.some((w) => new RegExp(`${phraseRegExp(p).source}(?:\\s+[\\p{L}\\p{N}-]+){0,2}\\s+${escapeRegExp(w)}${WORD_END}`, "iu").test(title)),
      );
      if (followed) return rule.level;
    }
  }
  return category === "NON_ENGINEERING" ? DEFAULT_NON_ENGINEERING_SENIORITY : DEFAULT_SENIORITY;
}

const BRACKETS = /\(([^()]*)\)|\[([^[\]]*)\]|\{([^{}]*)\}/g;
const genderRe = new RegExp(`^(?:${GENDER_MARKER_PATTERNS.join("|")})$`, "i");
const requisitionRe = new RegExp(`^${REQUISITION_ID_PATTERN}$`, "i");

function isDroppableBracket(content: string): boolean {
  const text = content.trim();
  if (!text) return true;
  if (genderRe.test(text) || requisitionRe.test(text)) return true;
  const parsed = parseLocations({ locations: [text] });
  return parsed.countryCodes.length > 0 || parsed.workplaceType !== "UNKNOWN";
}

/**
 * Canonical form of a title for comparison (repost detection): lowercase, without gender markers
 * and location/requisition brackets, single-spaced, no trailing punctuation.
 */
export function normalizeTitle(title: string): string {
  return title
    .replace(BRACKETS, (whole, a?: string, b?: string, c?: string) =>
      isDroppableBracket(a ?? b ?? c ?? "") ? " " : whole,
    )
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s.,;:|/\\\-–—]+$/u, "");
}
