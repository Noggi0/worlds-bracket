import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/app.js";
import { vercelCache } from "../server/cache.js";
import { CloudBoardService } from "../server/cloud.js";

let application: ReturnType<typeof createApp> | undefined;
export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  response.setHeader("Cache-Control", "no-store");
  try {
    application ??= createApp(new CloudBoardService(vercelCache()));
    const app = await application;
    await app.ready();
    app.server.emit("request", request, response);
  } catch {
    console.error(
      "Backend initialization failed; verify the server-side Redis REST URL and token configuration",
    );
    application = undefined;
    response.statusCode = 503;
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify({
        error:
          "Backend unavailable; check the Upstash connection and server logs",
      }),
    );
  }
}
