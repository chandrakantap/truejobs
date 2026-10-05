import {
  CITIES,
  COUNTRY_NAMES,
  GEORGIA,
  ISO_CODES,
  OTHER_SUBDIVISIONS,
  REGION_WORDS,
  US_STATE_ABBREVIATIONS,
  US_STATE_NAMES,
  regionForCountry,
  type Region,
} from "./dictionaries/geo.js";

export type { Region };
export type WorkplaceType = "REMOTE" | "HYBRID" | "ONSITE" | "UNKNOWN";

export interface ParseLocationsInput {
  locations: string[];
  workplaceTypeHint?: "REMOTE" | "HYBRID" | "ONSITE";
  title?: string;
}

export interface ParsedLocationEntry {
  raw: string;
  city?: string;
  region?: string;
  countryCode?: string;
}

export interface ParsedLocation {
  locationRaw: string;
  locations: ParsedLocationEntry[];
  countryCodes: string[];
  regions: Region[];
  workplaceType: WorkplaceType;
}

type Kind = "country" | "city" | "subdivision" | "region" | "georgia";
interface Entry {
  kind: Kind;
  code?: string;
  regions?: readonly Region[];
}
interface Match extends Entry {
  text: string;
  segment: number;
}

// Lookup precedence on a key collision: country > city > subdivision (e.g. "washington").
const ENTRIES = new Map<string, Entry>();
for (const n of US_STATE_NAMES) ENTRIES.set(n, { kind: "subdivision", code: "US" });
for (const [n, c] of OTHER_SUBDIVISIONS) ENTRIES.set(n, { kind: "subdivision", code: c });
for (const [n, r] of REGION_WORDS) ENTRIES.set(n, { kind: "region", regions: r });
for (const [n, c] of CITIES) ENTRIES.set(n, { kind: "city", code: c });
for (const [n, c] of COUNTRY_NAMES) ENTRIES.set(n, { kind: "country", code: c });
ENTRIES.set(GEORGIA, { kind: "georgia" });

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Longest keys first so "new mexico" is consumed before "mexico".
const NAME_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${[...ENTRIES.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join("|")})(?![\\p{L}\\p{N}])`,
  "gu",
);

const HYBRID_RE = /hybrid/i;
const REMOTE_RE = /\b(?:remote|anywhere|worldwide|work from home|wfh|distributed)\b/i;
const EXPLICIT_GLOBAL_RE = /\b(?:anywhere|worldwide|global)\b/i;
const SEGMENT_SPLIT_RE = /\s*[,()/]\s*|\s+[-–—]\s+/;
const ABBR_RE = /,\s*([A-Z]{2})(?![A-Za-z])/g;
// Workplace filler removed before testing a segment for a bare ISO code ("Remote US", "in the US").
const FILLER_RE = /\b(?:remote|Remote|REMOTE|hybrid|Hybrid|HYBRID|onsite|Onsite|on-site|On-site|based|only|in|the)\b/g;

const OR_AND_RE = /\s+(?:or|and|&)\s+/;
const REGION_ORDER: Region[] = ["GLOBAL", "US", "EUROPE", "INDIA", "OTHER"];

const stripDiacritics = (s: string) => s.normalize("NFD").replace(/\p{M}+/gu, "");

function isoCodes(segments: string[]): string[] {
  const out: string[] = [];
  for (const seg of segments) {
    const iso = ISO_CODES.get(seg.replace(FILLER_RE, "").trim());
    if (iso) out.push(iso);
  }
  return out;
}

function parseEntry(raw: string): { entry: ParsedLocationEntry; codes: string[]; regions: Region[]; hasPlace: boolean } {
  const text = stripDiacritics(raw);
  const lower = text.toLowerCase();
  const segments = text.split(SEGMENT_SPLIT_RE).map((s) => s.trim()).filter(Boolean);

  // Segment boundaries in the lowercased text, to attribute each match to a segment.
  const segmentOf = (index: number): number => {
    let pos = 0;
    for (let i = 0; i < segments.length; i++) {
      const at = lower.indexOf(segments[i]!.toLowerCase(), pos);
      if (at < 0) continue;
      if (index < at + segments[i]!.length) return i;
      pos = at + segments[i]!.length;
    }
    return segments.length - 1;
  };

  const matches: Match[] = [];
  for (const m of lower.matchAll(NAME_RE)) {
    const hit = ENTRIES.get(m[0])!;
    matches.push({ ...hit, text: text.slice(m.index, m.index + m[0].length), segment: segmentOf(m.index) });
  }

  const ofKind = (k: Kind) => matches.filter((m) => m.kind === k);
  const regions = new Set<Region>();
  for (const m of ofKind("region")) m.regions!.forEach((r) => regions.add(r));

  // Tiers, first non-empty wins: country names, state/province names (so "Dublin, Ohio" is US),
  // known cities, "," + US state abbreviation, "Georgia" with a city before it, a bare ISO code segment.
  let codes: string[] = ofKind("country").map((m) => m.code!);
  const subs = ofKind("subdivision");
  let adminRegion: string | undefined = subs[0]?.text;
  if (codes.length > 0 && OR_AND_RE.test(text)) codes.push(...isoCodes(text.split(OR_AND_RE).flatMap((p) => p.split(SEGMENT_SPLIT_RE))));
  if (codes.length === 0) codes = subs.map((m) => m.code!);
  if (codes.length === 0) codes = ofKind("city").map((m) => m.code!);
  const abbr = [...text.matchAll(ABBR_RE)].find((m) => US_STATE_ABBREVIATIONS.has(m[1]!))?.[1];
  if (codes.length === 0 && abbr) codes = ["US"];
  if (!adminRegion && abbr && codes.includes("US")) adminRegion = abbr;
  if (codes.length === 0 && ofKind("georgia").length > 0 && segments.length > 1) {
    codes = ["US"];
    adminRegion = "Georgia";
  }
  if (codes.length === 0) codes = isoCodes(segments);
  codes = [...new Set(codes)];
  for (const c of codes) regions.add(regionForCountry(c));

  // City: the first segment that is a known city, or an unrecognized leading segment ("Foo, Germany").
  let city: string | undefined;
  const cityMatch = ofKind("city")[0];
  if (cityMatch) city = cityMatch.text;
  else if (codes.length > 0 && segments.length > 1) {
    const first = segments[0]!;
    if (!matches.some((m) => m.segment === 0) && !REMOTE_RE.test(first) && !HYBRID_RE.test(first) && !ISO_CODES.has(first)) {
      city = first;
    }
  }
  if (!adminRegion && city && segments.length >= 3) {
    const mid = segments[1]!;
    if (!matches.some((m) => m.segment === 1)) adminRegion = mid;
  }

  const entry: ParsedLocationEntry = { raw };
  if (city) entry.city = city;
  if (adminRegion) entry.region = adminRegion;
  // A single resolved country is exposed per entry; multi-country entries ("US or Canada") leave it unset.
  if (codes.length === 1) entry.countryCode = codes[0];
  return { entry, codes, regions: [...regions], hasPlace: codes.length > 0 || city !== undefined };
}

/** Pure, synchronous free-text location parser. See docs: region/workplace rules are product-fixed. */
export function parseLocations(input: ParseLocationsInput): ParsedLocation {
  const inputs = input.locations.map((l) => l.trim()).filter(Boolean);
  const entries = inputs.flatMap((l) => l.split(/\s*[;|]\s*/)).filter(Boolean);
  const parsed = entries.map(parseEntry);

  const title = input.title ?? "";
  const joined = entries.join(" | ");
  let workplaceType: WorkplaceType;
  if (input.workplaceTypeHint) workplaceType = input.workplaceTypeHint;
  else if (HYBRID_RE.test(joined) || HYBRID_RE.test(title)) workplaceType = "HYBRID";
  else if (REMOTE_RE.test(joined) || /remote/i.test(title)) workplaceType = "REMOTE";
  else if (parsed.some((p) => p.hasPlace)) workplaceType = "ONSITE";
  else workplaceType = "UNKNOWN";

  const countryCodes = [...new Set(parsed.flatMap((p) => p.codes))];
  const regions = new Set<Region>(parsed.flatMap((p) => p.regions));

  if (workplaceType === "REMOTE" && (regions.size === 0 || EXPLICIT_GLOBAL_RE.test(joined))) regions.add("GLOBAL");

  return {
    locationRaw: inputs.join(" | "),
    locations: parsed.map((p) => p.entry),
    countryCodes,
    regions: REGION_ORDER.filter((r) => regions.has(r)),
    workplaceType,
  };
}
