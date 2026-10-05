import { randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { AppError } from "../../lib/errors.js";

function unauthorized(): AppError {
  return new AppError(401, "UNAUTHORIZED", "Missing or invalid crawler token");
}

/** Constant-time check of `candidate` against every configured token. */
export function isValidToken(candidate: string, tokens: readonly string[]): boolean {
  const given = Buffer.from(candidate);
  let valid = false;
  for (const token of tokens) {
    const expected = Buffer.from(token);
    if (expected.length === given.length) {
      if (timingSafeEqual(expected, given)) valid = true;
    } else {
      // Keep the work per token constant when lengths differ.
      timingSafeEqual(given, randomBytes(given.length));
    }
  }
  return valid;
}

/** `onRequest` hook for the /v1/ingest scope. Never logs the token. */
export function crawlerAuth(tokens: readonly string[]) {
  return async (request: FastifyRequest): Promise<void> => {
    const match = /^Bearer (\S+)$/i.exec(request.headers.authorization ?? "");
    if (!match || !isValidToken(match[1]!, tokens)) throw unauthorized();
  };
}
