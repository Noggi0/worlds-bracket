import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { resolve } from "node:path";
import type { BoardService } from "./service.js";
export async function createApp(service: BoardService, production = false) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
    ajv: { customOptions: { removeAdditional: false } },
  });
  app.get(
    "/api/board",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {},
        },
      },
    },
    async () => service.get() ?? service.refresh(),
  );
  app.post(
    "/api/refresh",
    {
      schema: {
        body: { type: "object", additionalProperties: false, properties: {} },
      },
    },
    async () => service.refresh(),
  );
  app.get("/api/health", async () => ({ ok: true }));
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const status =
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    void reply
      .code(status)
      .send({ error: status === 400 ? "Invalid request" : "Request failed" });
  });
  if (production) {
    await app.register(fastifyStatic, { root: resolve("dist/client") });
    app.setNotFoundHandler((request, reply) =>
      request.url.startsWith("/api/")
        ? reply.code(404).send({ error: "Route not found" })
        : reply.sendFile("index.html"),
    );
  }
  app.addHook("onClose", () => service.close());
  return app;
}
