import { randomUUID } from "node:crypto";
import { RedisCache } from "./cache.js";
import { BoardService, type Sources } from "./service.js";
import type { Board } from "../shared/model.js";

// Each request reads the shared snapshot; no instance-local board can stay stale forever.
export class CloudBoardService {
  private flight: Promise<Board> | null = null;
  constructor(
    private readonly cache: RedisCache,
    private readonly sources?: Sources,
  ) {}
  get(): null {
    return null;
  }
  async close(): Promise<void> {
    await this.flight;
  }
  refresh(): Promise<Board> {
    if (this.flight) return this.flight;
    this.flight = this.update().finally(() => {
      this.flight = null;
    });
    return this.flight;
  }
  private async update(): Promise<Board> {
    const service = new BoardService(this.cache, this.sources);
    await service.load(false);
    const previous = service.get();
    if (
      previous?.lastChecked &&
      !previous.stale &&
      Date.now() - Date.parse(previous.lastChecked) < 55000
    )
      return previous;
    const owner = randomUUID();
    const lock = `${this.cache.key}:refresh`;
    let acquired: boolean;
    try {
      acquired =
        (await this.cache.command(["SET", lock, owner, "NX", "EX", 120])) ===
        "OK";
    } catch {
      // Keep the source fallback usable when Redis itself is unavailable.
      return service.refresh();
    }
    if (!acquired) {
      if (previous) return this.awaiting(previous);
      // First visitor waits for the collector instead of receiving an empty board.
      for (let attempt = 0; attempt < 90; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await service.load(false);
        const board = service.get();
        if (board) return board;
      }
      throw Error("Source refresh still in progress; please retry");
    }
    try {
      return await service.refresh();
    } finally {
      // Keep a short cooldown on errors too; never alter another collector's lock.
      await this.cache
        .command([
          "EVAL",
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], 55) else return 0 end",
          1,
          lock,
          owner,
        ])
        .catch(() => undefined);
    }
  }
  private awaiting(board: Board): Board {
    return {
      ...board,
      stale: true,
      warnings: [
        ...board.warnings,
        "Source refresh in progress or cooling down; showing cached data",
      ],
    };
  }
}
