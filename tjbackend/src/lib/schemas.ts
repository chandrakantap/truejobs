import { z } from "zod";

export const ErrorResponse = z
  .object({
    error: z.object({
      code: z.string().meta({ example: "VALIDATION_ERROR" }),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .meta({ id: "ErrorResponse" });

export const IsoDateTime = z.iso.datetime().meta({ id: "IsoDateTime", example: "2026-01-31T12:00:00Z" });

export const DEFAULT_PAGE_SIZE = 20;

/** `?page=1&pageSize=20`. Over-max page sizes are rejected (400), not clamped. */
export function paginationQuery({ maxPageSize }: { maxPageSize: number }) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(maxPageSize).default(DEFAULT_PAGE_SIZE),
  });
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export function paginated<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });
}

/** Parses `?category=BACKEND,frontend` into `["BACKEND", "FRONTEND"]` (case-insensitive). */
export function csvEnumList<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .transform((raw) =>
      raw
        .split(",")
        .map((part) => part.trim().toUpperCase())
        .filter((part) => part.length > 0),
    )
    .pipe(z.array(z.enum(values)));
}

/** Prisma `skip`/`take` for a validated page. */
export function toSkipTake({ page, pageSize }: Pagination): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
