import { BoardService } from "./service.js";
import { createApp } from "./app.js";
const service = new BoardService(
  process.env.CACHE_PATH ?? ".cache/worlds-2026.json",
);
await service.load();
const app = await createApp(service, !process.argv[1]?.endsWith(".ts"));
await app.listen({
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3001),
});
void service.refresh().then((board) => {
  if (board.errors.length)
    app.log.warn({ errors: board.errors }, "Source refresh incomplete");
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    void app.close();
  });
