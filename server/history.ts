import {
  finalWinner,
  type History,
  type Match,
  type PhaseKey,
  type Team,
} from "../shared/model.js";
import type { WikiPage } from "./sources.js";

const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const aliases: Record<string, string[]> = {
  KC: ["KCORP", "Karmine Corp"],
  C9: ["Cloud9", "Cloud9 Kia"],
  DK: ["DPLUS", "Dplus KIA", "DAMWON Gaming"],
  TLAW: ["TL", "Team Liquid", "Team Liquid Alienware"],
  GEN: ["Gen.G", "Gen.G Esports"],
  MVK: ["MVK Esports"],
  FUR: ["FURIA"],
  IG: ["Invictus Gaming"],
  TES: ["Top Esports"],
  HLE: ["Hanwha Life Esports"],
  MKOI: ["Movistar KOI"],
  BLG: ["Bilibili Gaming"],
  AL: ["AL CN", "Anyone’s Legend", "Anyone's Legend"],
  G2: ["G2 Esports"],
  CFO: ["CTBC Flying Oyster"],
  LYON: ["LYON24"],
  TSW: ["TSTW", "Team Secret Whales"],
};
export function teamAliases(teams: Team[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const team of teams)
    if (team.teamId !== "0")
      for (const alias of [team.code, team.name, ...(aliases[team.code] ?? [])])
        result.set(normalize(alias), team.teamId);
  return result;
}
interface Template {
  name: string;
  fields: Record<string, string>;
  start: number;
  end: number;
}
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let start = 0,
    depth = 0,
    links = 0;
  for (let i = 0; i < text.length; i++) {
    const pair = text.slice(i, i + 2);
    if (pair === "{{") {
      depth++;
      i++;
    } else if (pair === "}}") {
      depth--;
      i++;
    } else if (pair === "[[") {
      links++;
      i++;
    } else if (pair === "]]") {
      links--;
      i++;
    } else if (text[i] === "|" && depth === 0 && links === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}
export function templates(source: string): Template[] {
  const text = source.replace(/<!--[\s\S]*?-->/g, (match) =>
    " ".repeat(match.length),
  );
  const result: Template[] = [];
  const stack: number[] = [];
  for (let i = 0; i < text.length - 1; i++) {
    const pair = text.slice(i, i + 2);
    if (pair === "{{") {
      stack.push(i);
      i++;
    } else if (pair === "}}") {
      const start = stack.pop();
      if (start === undefined) throw new Error("Unbalanced wikitext");
      const parts = splitTopLevel(text.slice(start + 2, i));
      const name = parts.shift()?.trim() ?? "";
      const fields: Record<string, string> = {};
      for (const part of parts) {
        const eq = part.indexOf("=");
        if (eq >= 0)
          fields[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
      }
      result.push({ name, fields, start, end: i + 2 });
      i++;
    }
  }
  if (stack.length) throw new Error("Unbalanced wikitext");
  return result.sort((a, b) => a.start - b.start);
}
export interface WikiSeries {
  phase: PhaseKey;
  round: number | null;
  fields: Record<string, string>;
  games: Map<number, { blue: string; red: string; winner: string }>;
  page: string;
  revid: number;
}
export class WikiParser {
  private readonly cache = new Map<
    string,
    { revid: number; content: string; rows: WikiSeries[] }
  >();
  parse(pages: WikiPage[]): WikiSeries[] {
    return pages.flatMap((page) => {
      const cached = this.cache.get(page.title);
      if (cached?.revid === page.revid && cached.content === page.content)
        return cached.rows;
      const rows = parseWikiSeries(page);
      this.cache.set(page.title, {
        revid: page.revid,
        content: page.content,
        rows,
      });
      return rows;
    });
  }
}
export function parseWikiSeries(page: WikiPage): WikiSeries[] {
  const parsed = templates(page.content);
  const rows: WikiSeries[] = [];
  let tab = "";
  for (const template of parsed) {
    if (template.name === "MatchSchedule/Start")
      tab = template.fields.tab ?? "";
    if (template.name !== "MatchSchedule") continue;
    const phase: PhaseKey = page.title.endsWith("/Play-In")
      ? "play-ins"
      : /quarter|semi|final/i.test(tab)
        ? "knockouts"
        : "swiss";
    const round = /Round\s+(\d+)/i.exec(tab)?.[1];
    const games = new Map<
      number,
      { blue: string; red: string; winner: string }
    >();
    for (const [key, value] of Object.entries(template.fields)) {
      const number = /^game(\d+)$/.exec(key)?.[1];
      if (!number) continue;
      const game = templates(value).find(
        (t) => t.name === "MatchSchedule/Game",
      );
      if (game)
        games.set(Number(number), {
          blue: game.fields.blue ?? "",
          red: game.fields.red ?? "",
          winner: game.fields.winner ?? "",
        });
    }
    rows.push({
      phase,
      round: round
        ? Number(round)
        : phase === "knockouts"
          ? /quarter/i.test(tab)
            ? 1
            : /semi/i.test(tab)
              ? 2
              : 3
          : null,
      fields: template.fields,
      games,
      page: page.title,
      revid: page.revid,
    });
  }
  if (!rows.length)
    throw new Error(`No MatchSchedule templates: ${page.title}`);
  return rows;
}
export function wikiDate(
  iso: string,
  timezone: string,
  dst: string,
): string | null {
  const offsets: Record<string, number> = {
    UTC: 0,
    GMT: 0,
    PST: -8,
    PDT: -7,
    CET: 1,
    CEST: 2,
    KST: 9,
    CST: 8,
    EST: -5,
    EDT: -4,
  };
  let offset = offsets[timezone.toUpperCase()];
  if (offset === undefined) return null;
  if (
    dst.toLowerCase() === "yes" &&
    ["PST", "CET", "EST"].includes(timezone.toUpperCase())
  )
    offset++;
  return new Date(new Date(iso).getTime() + offset * 3600000)
    .toISOString()
    .slice(0, 10);
}
export function resultSignature(match: Match): string {
  return JSON.stringify(match.schedule);
}
export function resolveHistory(
  match: Match,
  phase: PhaseKey,
  rows: WikiSeries[],
  aliases: Map<string, string>,
  previous?: History,
): History {
  const s = match.schedule;
  const pending = (
    message: string,
    status: History["status"] = "pending",
  ): History => ({ status, winners: [], message });
  if (!s || s.teams.length !== 2 || s.teams.some((t) => t.teamId === "0"))
    return pending("Awaiting published participants");
  const ids = s.teams
    .map((t) => t.teamId)
    .sort()
    .join("|");
  // Leaguepedia numbers the upper and lower brackets independently.
  const expectedRound =
    phase === "play-ins"
      ? /semifinals/i.test(match.cell)
        ? 1
        : /bracket.*finals/i.test(match.cell)
          ? 2
          : /^finals$/i.test(match.cell)
            ? 3
            : null
      : match.column + 1;
  const candidates = rows.filter(
    (row) =>
      row.phase === phase &&
      [row.fields.team1 ?? "", row.fields.team2 ?? ""]
        .map((t) => aliases.get(normalize(t)) ?? "?")
        .sort()
        .join("|") === ids &&
      wikiDate(s.startTime, row.fields.timezone ?? "", row.fields.dst ?? "") ===
        row.fields.date &&
      (row.round === null ||
        expectedRound === null ||
        row.round === expectedRound),
  );
  if (candidates.length !== 1)
    return pending(
      candidates.length
        ? "Ambiguous Leaguepedia match"
        : "History not yet matched to Leaguepedia",
      "unavailable",
    );
  const row = candidates[0];
  if (!row) return pending("History unavailable", "unavailable");
  const signature = resultSignature(match);
  if (
    previous?.status === "complete" &&
    previous.page === row.page &&
    previous.revid === row.revid &&
    previous.signature === signature
  )
    return { ...previous, stale: false };
  const base = { page: row.page, revid: row.revid, signature };
  const winners: (string | null)[] = Array.from(
    { length: s.bestOf },
    () => null,
  );
  let inconsistent = false;
  for (const [number, game] of row.games) {
    if (!game.winner) continue;
    const winner = aliases.get(
      normalize(
        game.winner === "1" ? game.blue : game.winner === "2" ? game.red : "",
      ),
    );
    const metadata = s.games.find((g) => g.number === number);
    if (
      !winner ||
      !s.teams.some((t) => t.teamId === winner) ||
      !metadata ||
      metadata.state !== "completed" ||
      number > s.bestOf
    ) {
      inconsistent = true;
      continue;
    }
    winners[number - 1] = winner;
  }
  const counts = new Map(
    s.teams.map((t) => [
      t.teamId,
      winners.filter((w) => w === t.teamId).length,
    ]),
  );
  if (
    s.teams.some((t) => (counts.get(t.teamId) ?? 0) > (t.result?.gameWins ?? 0))
  )
    inconsistent = true;
  if (inconsistent)
    return {
      ...base,
      status: "inconsistent",
      winners: [],
      message: "Leaguepedia conflicts with Riot; history withheld",
    };
  const winner = finalWinner(s);
  const complete =
    winner !== null &&
    s.teams.every((t) => counts.get(t.teamId) === t.result?.gameWins) &&
    s.games.every(
      (g) => g.state !== "completed" || winners[g.number - 1] != null,
    ) &&
    counts.get(winner) === Math.floor(s.bestOf / 2) + 1;
  return {
    ...base,
    status: complete
      ? "complete"
      : winners.some(Boolean)
        ? "partial"
        : "pending",
    winners,
    message: complete
      ? "Validated against Riot"
      : winners.some(Boolean)
        ? "Partial history · awaiting published results"
        : "Game winners not yet published",
  };
}
