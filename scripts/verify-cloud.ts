import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import handler from "../api/[...path].js";
import { vercelCache } from "../server/cache.js";
import { boardSchema } from "../shared/model.js";

// Isolate verification from production and remove its keys even on failure.
process.env.REDIS_CACHE_KEY = `worlds-board:verification:${randomUUID()}`;
const cache = vercelCache();
const server = createServer((request, response) => {
  void handler(request, response);
});
try {
  console.log("Redis connection:", await cache.command(["PING"]));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("Missing server address");
  const base = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${base}/api/health`);
  if (!health.ok) throw Error(`Health HTTP ${health.status}`);
  const response = await fetch(`${base}/api/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) throw Error(`Refresh HTTP ${response.status}`);
  const board = boardSchema.parse(await response.json());
  console.log(
    JSON.stringify({
      health: health.status,
      refresh: response.status,
      matches: board.phases.flatMap((p) => p.matches).length,
      lastChecked: board.lastChecked,
      errors: board.errors,
      warnings: board.warnings,
      snapshotBytes: Buffer.byteLength((await cache.read()) ?? ""),
    }),
  );
  if (board.errors.length || !board.lastChecked)
    throw Error("Real source refresh failed");
  const cachedResponse = await fetch(`${base}/api/board`);
  const cached = boardSchema.parse(await cachedResponse.json());
  if (cached.lastChecked !== board.lastChecked || cached.stale)
    throw Error("Shared cache was not reused");
  if (cachedResponse.headers.get("cache-control") !== "no-store")
    throw Error("Missing no-store header");
  console.log("HTTP adapter and shared Redis snapshot: OK");
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await cache.command(["DEL", cache.key, `${cache.key}:refresh`]);
}
