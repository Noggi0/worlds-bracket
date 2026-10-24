import { z } from "zod";
import {
  phaseInfo,
  phaseKeys,
  phaseSchema,
  scheduleSchema,
  teamSchema,
  gameSchema,
  destinationSchema,
  type Phase,
  type Schedule,
} from "../shared/model.js";
import { riotConfig, tournamentId, wikiTitles } from "./config.js";

export type Fetcher = typeof fetch;
async function json(url: URL, fetcher: Fetcher): Promise<unknown> {
  const response = await fetcher(url, {
    headers: {
      "Content-Type": "application/json",
      "apollographql-client-name": "Esports Web",
      "apollographql-client-version": riotConfig.clientVersion,
    },
    signal: AbortSignal.timeout(
      Number(process.env.REQUEST_TIMEOUT_MS ?? 20000),
    ),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body: unknown = await response.json();
  const envelope = z
    .object({
      errors: z.array(z.unknown()).optional(),
      error: z.unknown().optional(),
    })
    .passthrough()
    .parse(body);
  if (envelope.errors?.length || envelope.error)
    throw new Error(
      `Source application error: ${JSON.stringify(envelope.errors ?? envelope.error).slice(0, 300)}`,
    );
  return body;
}
function gql(
  operationName: keyof typeof riotConfig.operations,
  variables: Record<string, unknown>,
): URL {
  const url = new URL(riotConfig.endpoint);
  url.search = new URLSearchParams({
    operationName,
    variables: JSON.stringify(variables),
    extensions: JSON.stringify({
      persistedQuery: {
        version: 1,
        sha256Hash: riotConfig.operations[operationName],
      },
    }),
  }).toString();
  return url;
}
const structureResponse = z.object({
  data: z.object({
    tournaments: z.array(
      z.object({
        id: z.string(),
        stages: z.array(
          z.object({
            id: z.string(),
            sections: z.array(
              z.object({
                columns: z.array(
                  z.object({
                    cells: z.array(
                      z.object({
                        name: z.string(),
                        matches: z.array(
                          z.object({
                            id: z.string(),
                            structuralId: z.string(),
                            description: z.string(),
                            destinations: z.object({
                              win: destinationSchema.nullish(),
                              loss: destinationSchema.nullish(),
                            }),
                          }),
                        ),
                      }),
                    ),
                  }),
                ),
              }),
            ),
          }),
        ),
      }),
    ),
  }),
});
export function parseStructure(body: unknown): Phase[] {
  const tournament = structureResponse
    .parse(body)
    .data.tournaments.find((t) => t.id === tournamentId);
  if (!tournament || !tournament.stages.length)
    throw new Error("Worlds 2026 structure missing");
  return phaseKeys.map((key) => {
    const stage = tournament.stages.find((s) => s.id === phaseInfo[key].id);
    const matches =
      stage?.sections.flatMap((section) =>
        section.columns.flatMap((column, i) =>
          column.cells.flatMap((cell) =>
            cell.matches.map((m) => ({ ...m, column: i, cell: cell.name })),
          ),
        ),
      ) ?? [];
    const phase = phaseSchema.parse({
      key,
      matches: [...new Map(matches.map((m) => [m.id, m])).values()],
    });
    const ids = new Set(phase.matches.map((m) => m.structuralId));
    for (const m of phase.matches)
      for (const d of Object.values(m.destinations))
        if (d?.type === "match" && !ids.has(d.structuralId ?? ""))
          throw new Error(`Unresolved bracket destination: ${m.id}`);
    return phase;
  });
}
export async function fetchStructure(
  fetcher: Fetcher = fetch,
): Promise<Phase[]> {
  return parseStructure(
    await json(
      gql("GetSeasonTournamentDisplay", {
        hl: "en-US",
        tournamentId: [tournamentId],
      }),
      fetcher,
    ),
  );
}
const eventSchema = z.object({
  tournament: z.object({ id: z.string() }),
  startTime: z.iso.datetime(),
  match: z.object({
    id: z.string(),
    state: scheduleSchema.shape.state,
    strategy: z.object({
      type: z.literal("bestOf"),
      count: scheduleSchema.shape.bestOf,
    }),
    games: z.array(gameSchema),
  }),
  matchTeams: z.array(teamSchema).max(2),
});
const scheduleResponse = z.object({
  data: z.object({
    esports: z.object({
      events: z.array(z.unknown()),
      pages: z.object({
        older: z.string().nullable(),
        newer: z.string().nullable(),
      }),
    }),
  }),
});
export function parseSchedulePage(body: unknown): {
  matches: Schedule[];
  tokens: string[];
} {
  const { events, pages } = scheduleResponse.parse(body).data.esports;
  const matches: Schedule[] = [];
  for (const value of events) {
    const header = z
      .object({ tournament: z.object({ id: z.string() }) })
      .parse(value);
    if (header.tournament.id !== tournamentId) continue;
    const e = eventSchema.parse(value);
    matches.push(
      scheduleSchema.parse({
        id: e.match.id,
        state: e.match.state,
        startTime: e.startTime,
        bestOf: e.match.strategy.count,
        teams: e.matchTeams,
        games: e.match.games.toSorted((a, b) => a.number - b.number),
      }),
    );
  }
  return {
    matches,
    tokens: [pages.older, pages.newer].filter((t): t is string => t !== null),
  };
}
export async function fetchSchedule(
  fetcher: Fetcher = fetch,
): Promise<Schedule[]> {
  const queue: (string | undefined)[] = [undefined];
  const seen = new Set<string>();
  const matches = new Map<string, Schedule>();
  while (queue.length) {
    if (seen.size > 100) throw new Error("Schedule pagination limit exceeded");
    const token = queue.shift();
    const page = parseSchedulePage(
      await json(
        gql("scheduleEvents", {
          hl: "en-US",
          leagues: ["98767975604431411"],
          eventDateStart: "2026-10-15",
          eventDateEnd: "2026-11-15",
          pageSize: 100,
          ...(token ? { pageToken: token } : {}),
        }),
        fetcher,
      ),
    );
    for (const match of page.matches) matches.set(match.id, match);
    for (const next of page.tokens)
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  }
  if (!matches.size) throw new Error("Worlds 2026 schedule missing");
  return [...matches.values()];
}
export const wikiPageSchema = z.object({
  title: z.string(),
  revid: z.number().int(),
  timestamp: z.iso.datetime(),
  content: z.string().min(1),
});
export type WikiPage = z.infer<typeof wikiPageSchema>;
const wikiResponse = z.object({
  query: z.object({
    pages: z.array(
      z.object({
        title: z.string(),
        missing: z.boolean().optional(),
        revisions: z
          .array(
            z.object({
              revid: z.number().int(),
              timestamp: z.iso.datetime(),
              slots: z.object({
                main: z.object({ content: z.string().min(1) }),
              }),
            }),
          )
          .optional(),
      }),
    ),
  }),
});
export function parseWiki(body: unknown): WikiPage[] {
  const { pages } = wikiResponse.parse(body).query;
  return wikiTitles.map((title) => {
    const page = pages.find((p) => p.title === title);
    const revision = page?.revisions?.[0];
    if (page?.missing || !revision)
      throw new Error(`Leaguepedia page missing: ${title}`);
    if (!revision.slots.main.content.includes("{{MatchSchedule"))
      throw new Error(`Unparseable Leaguepedia page: ${title}`);
    return {
      title,
      revid: revision.revid,
      timestamp: revision.timestamp,
      content: revision.slots.main.content,
    };
  });
}
export async function fetchWiki(fetcher: Fetcher = fetch): Promise<WikiPage[]> {
  const url = new URL("https://lol.fandom.com/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "revisions",
    rvprop: "ids|timestamp|content",
    rvslots: "main",
    redirects: "1",
    titles: wikiTitles.join("|"),
  }).toString();
  return parseWiki(await json(url, fetcher));
}
