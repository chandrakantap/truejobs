// Phrase dictionaries for the job category and seniority classifiers. Plain data only: extend a
// list here to teach the classifier a new title, no logic change needed. Phrases are matched
// case-insensitively at word boundaries (a space matches any run of whitespace). Rule order is
// significant: the first rule that matches wins.
import type { JobCategory, Seniority } from "../../generated/prisma/enums.js";

/** Titles containing any of these are never engineering jobs. Checked before everything else. */
export const NON_ENGINEERING_TITLE_PHRASES: readonly string[] = [
  "sales engineer", "solutions engineer", "solution engineer", "pre-sales", "presales",
  "customer success engineer", "support engineer", "technical support", "field engineer",
  "mechanical engineer", "electrical engineer", "civil engineer", "chemical engineer",
  "manufacturing engineer", "process engineer", "structural engineer", "recruiter", "sourcer",
  "account executive", "account manager",
];

/** Department hints that make a bare "engineer" title an engineering job. */
export const ENGINEERING_DEPARTMENT_PHRASES: readonly string[] = [
  "engineering", "r&d", "research and development", "product development", "technology",
];

export interface CategoryRule {
  category: Exclude<JobCategory, "NON_ENGINEERING">;
  phrases: readonly string[];
  /** Phrases that only count when the title also contains one of `requires`. */
  conditionalPhrases?: ReadonlyArray<{ phrase: string; requires: readonly string[] }>;
  /** Language-specific titles: any `languages` entry plus any `roleWords` entry (no frontend keyword is possible here, FRONTEND is matched first). */
  languageRoles?: { languages: readonly string[]; roleWords: readonly string[] };
  /** A bare title word that counts only when the department matches ENGINEERING_DEPARTMENT_PHRASES. */
  bareWordsWithEngineeringDepartment?: readonly string[];
}

export const CATEGORY_RULES: readonly CategoryRule[] = [
  {
    category: "ENGINEERING_MANAGEMENT",
    phrases: [
      "engineering manager", "manager of engineering", "manager, engineering", "head of engineering",
      "director of engineering", "director, engineering", "vp engineering", "vp of engineering",
      "vice president of engineering", "cto", "chief technology officer", "software development manager",
    ],
  },
  {
    category: "ML_AI",
    phrases: [
      "machine learning", "ml engineer", "mlops", "ai engineer", "artificial intelligence", "llm",
      "deep learning", "computer vision", "nlp", "data scientist", "research scientist",
      "applied scientist", "research engineer",
    ],
  },
  {
    category: "DATA_ENGINEERING",
    phrases: ["data engineer", "analytics engineer", "data platform", "etl", "big data", "data infrastructure"],
  },
  {
    category: "DEVOPS_SRE",
    phrases: [
      "devops", "site reliability", "sre", "platform engineer", "infrastructure engineer",
      "cloud engineer", "production engineer", "release engineer", "build engineer", "kubernetes",
    ],
    conditionalPhrases: [{ phrase: "systems engineer", requires: ["software", "cloud", "infra", "infrastructure"] }],
  },
  {
    category: "SECURITY",
    phrases: [
      "security engineer", "application security", "appsec", "product security", "security software",
      "penetration", "offensive security", "detection engineer",
    ],
  },
  {
    category: "QA",
    phrases: ["qa", "quality assurance", "quality engineer", "sdet", "test engineer", "test automation", "automation test engineer"],
  },
  { category: "MOBILE", phrases: ["ios", "android", "mobile", "react native", "flutter"] },
  {
    category: "EMBEDDED",
    phrases: ["embedded", "firmware", "fpga", "hardware engineer", "kernel", "drivers", "robotics software"],
  },
  { category: "FULLSTACK", phrases: ["full stack", "full-stack", "fullstack"] },
  {
    category: "FRONTEND",
    phrases: [
      "frontend", "front-end", "front end", "ui engineer", "web developer", "web engineer",
      "javascript engineer", "react engineer", "react developer",
    ],
  },
  {
    category: "BACKEND",
    phrases: ["backend", "back-end", "back end", "server-side", "api engineer", "distributed systems"],
    languageRoles: {
      languages: ["java", "golang", "go", "python", "ruby", "rust", "scala", "kotlin", "c#", ".net", "php", "node.js", "elixir"],
      roleWords: ["developer", "engineer"],
    },
  },
  {
    category: "OTHER_ENGINEERING",
    phrases: [
      "software engineer", "software developer", "developer", "programmer", "swe", "sde",
      "member of technical staff", "mts", "software architect", "solutions architect",
      "cloud architect", "enterprise architect",
    ],
    bareWordsWithEngineeringDepartment: ["engineer"],
  },
];

export interface SeniorityRule {
  level: Exclude<Seniority, "UNKNOWN">;
  phrases: readonly string[];
  /** Roman numerals, matched case-sensitively as standalone tokens (e.g. "Engineer III"). */
  romanNumerals?: readonly string[];
  /** Digits that count only as the last token of the title (e.g. "Engineer 2"). */
  trailingDigits?: readonly string[];
  /** Phrases that count only when followed (within two words) by one of these words. */
  followedBy?: { phrases: readonly string[]; words: readonly string[] };
  /** The rule applies only when the category is ENGINEERING_MANAGEMENT or the title contains "engineering". */
  requiresEngineeringContext?: boolean;
}

export const SENIORITY_RULES: readonly SeniorityRule[] = [
  { level: "INTERN", phrases: ["intern", "internship", "co-op", "apprentice", "working student"] },
  { level: "DIRECTOR", phrases: ["director", "vp", "vice president", "head of", "cto", "chief"] },
  { level: "MANAGER", phrases: ["manager"], requiresEngineeringContext: true },
  { level: "PRINCIPAL", phrases: ["principal", "distinguished", "fellow"], romanNumerals: ["V"] },
  { level: "STAFF", phrases: ["staff"], romanNumerals: ["IV"] },
  { level: "SENIOR", phrases: ["senior", "sr", "sr.", "lead", "tech lead"], romanNumerals: ["III"] },
  {
    level: "JUNIOR",
    phrases: ["junior", "jr", "jr.", "graduate", "new grad", "entry level", "entry-level"],
    followedBy: { phrases: ["associate"], words: ["engineer", "developer"] },
    romanNumerals: ["I"],
    trailingDigits: ["1"],
  },
  { level: "MID", phrases: ["mid", "mid-level", "intermediate"], romanNumerals: ["II"], trailingDigits: ["2"] },
];

/** Fallback for titles with no seniority marker, per product decision: unmarked engineering titles are MID. */
export const DEFAULT_SENIORITY: Seniority = "MID";
export const DEFAULT_NON_ENGINEERING_SENIORITY: Seniority = "UNKNOWN";

/** Gender markers stripped by normalizeTitle, matched inside any bracket pair. */
export const GENDER_MARKER_PATTERNS: readonly string[] = [
  "(?:[mfwdx]\\s*/\\s*){1,3}[mfwdx]",
  "all genders",
  "gn",
];

/** A bracket whose whole content looks like a requisition id is dropped by normalizeTitle. */
export const REQUISITION_ID_PATTERN = "#?[a-z]{0,5}[-_ ]?\\d{3,}";
