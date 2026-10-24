import { FileCache, type CacheStore } from "./cache.js";
import { z } from "zod";
import {
  boardSchema,
  finalWinner,
  phaseInfo,
  phaseSchema,
  scheduleSchema,
  type Board,
  type Phase,
  type Schedule,
} from "../shared/model.js";
import { assemble } from "./board.js";
import {
  fetchSchedule,
  fetchStructure,
  fetchWiki,
  wikiPageSchema,
  type WikiPage,
} from "./sources.js";
import { WikiParser } from "./history.js";

const cacheSchema = z.object({
  version: z.literal(1),
  structure: z.array(phaseSchema),
  schedule: z.array(scheduleSchema),
  pages: z.array(wikiPageSchema),
  board: boardSchema,
});
export interface Sources {
  structure: () => Promise<Phase[]>;
  schedule: () => Promise<Schedule[]>;
  wiki: () => Promise<WikiPage[]>;
}
export class BoardService {
  private structure: Phase[] = [];
  private schedule: Schedule[] = [];
  private pages: WikiPage[] = [];
  private board: Board | null = null;
  private flight: Promise<Board> | null = null;
  private readonly wikiParser = new WikiParser();
  private cacheError: string | null = null;
  private readonly cache: CacheStore;
  constructor(
    cache: string | CacheStore,
    private readonly sources: Sources = {
      structure: fetchStructure,
      schedule: fetchSchedule,
      wiki: fetchWiki,
    },
  ) {
    this.cache = typeof cache === "string" ? new FileCache(cache) : cache;
  }
  async load(markStale = true): Promise<void> {
    try {
      const value = await this.cache.read();
      if (value === null) return;
      const cached = cacheSchema.parse(JSON.parse(value));
      this.structure = cached.structure;
      this.schedule = cached.schedule;
      this.pages = cached.pages;
      this.board = markStale
        ? {
            ...cached.board,
            stale: true,
            errors: ["Cached data · awaiting source refresh"],
            phases: cached.board.phases.map((p) => ({
              ...p,
              complete: false,
              matches: p.matches.map((m) => ({
                ...m,
                stale: true,
                history: { ...m.history, stale: true },
              })),
            })),
          }
        : cached.board;
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        this.cacheError =
          "Persistent cache could not be read; fetching sources again";
    }
  }
  async close(): Promise<void> {
    await this.flight;
  }
  get(): Board | null {
    return this.board;
  }
  refresh(): Promise<Board> {
    if (this.flight) return this.flight;
    this.flight = this.update().finally(() => {
      this.flight = null;
    });
    return this.flight;
  }
  private async update(): Promise<Board> {
    const results = await Promise.allSettled([
      this.sources.structure(),
      this.sources.schedule(),
      this.sources.wiki().then((pages) => {
        this.wikiParser.parse(pages);
        return pages;
      }),
    ]);
    const [structure, schedule, pages] = results;
    const errors: string[] = [];
    for (const [i, result] of results.entries())
      if (result.status === "rejected")
        errors.push(
          `${["Riot structure", "Riot schedule", "Leaguepedia"][i]}: ${result.reason instanceof Error ? result.reason.message : "Fetch failed"}`,
        );
    if (structure.status === "fulfilled") this.structure = structure.value;
    if (
      structure.status === "fulfilled" &&
      this.structure.some((p) => p.matches.length !== phaseInfo[p.key].expected)
    )
      errors.push("Riot structure: incomplete phase coverage");
    const old = new Map(this.schedule.map((s) => [s.id, s]));
    const staleIds = new Set<string>();
    if (schedule.status === "fulfilled") {
      const latest = new Map(schedule.value.map((s) => [s.id, s]));
      for (const phase of this.structure)
        for (const m of phase.matches) {
          const fresh = latest.get(m.id);
          const unusable =
            fresh?.state === "completed" && finalWinner(fresh) === null;
          if (!fresh || unusable) {
            staleIds.add(m.id);
            const cached = old.get(m.id);
            if (cached) latest.set(m.id, cached);
            else latest.delete(m.id);
          }
        }
      this.schedule = [...latest.values()];
      if (staleIds.size)
        errors.push(
          `Riot schedule: ${staleIds.size} series missing usable results`,
        );
    } else for (const s of this.schedule) staleIds.add(s.id);
    if (pages.status === "fulfilled") this.pages = pages.value;
    const lastChecked = this.board?.lastChecked ?? null;
    const board = assemble(
      this.structure,
      this.schedule,
      this.pages,
      this.board,
      errors,
      staleIds,
      pages.status === "rejected",
      this.wikiParser.parse(this.pages),
    );
    if (this.cacheError) board.warnings.push(this.cacheError);
    this.board = board;
    try {
      await this.cache.write(
        JSON.stringify({
          version: 1,
          structure: this.structure,
          schedule: this.schedule,
          pages: this.pages,
          board,
        }),
      );
      this.cacheError = null;
    } catch {
      board.errors.push("Cache could not be saved");
      board.stale = true;
      board.lastChecked = lastChecked;
    }
    return board;
  }
}
