import { createHash } from "node:crypto";
import { normalizeWhitespace } from "./html.js";

export interface ContentHashInput {
  title: string;
  descriptionText: string;
  locationRaw: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
}

/** sha256 over the fields whose change counts as a new job version (AD4). */
export function computeContentHash(input: ContentHashInput): string {
  const canonical = JSON.stringify([
    input.title.trim().toLowerCase(),
    normalizeWhitespace(input.descriptionText),
    input.locationRaw.trim().toLowerCase(),
    input.salaryMin ?? null,
    input.salaryMax ?? null,
    input.salaryCurrency ?? null,
    input.salaryPeriod ?? null,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}
