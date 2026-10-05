import type { FastifyInstance } from "fastify";
import { AppError, errorBody } from "../lib/errors.js";

export function registerErrorHandlers(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    reply
      .status(404)
      .send(errorBody("NOT_FOUND", `Route ${request.method} ${request.url} not found`));
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send(errorBody(error.code, error.message, error.details));
    }

    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 500;

    // Fastify's own 4xx errors (bad JSON, payload too large, ...) are safe to describe.
    if (statusCode >= 400 && statusCode < 500) {
      const message = error instanceof Error ? error.message : "Bad request";
      return reply.status(statusCode).send(errorBody("BAD_REQUEST", message));
    }

    request.log.error({ err: error }, "unhandled error");
    return reply.status(500).send(errorBody("INTERNAL_ERROR", "Internal server error"));
  });
}
