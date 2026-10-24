import {
  currentPhase,
  finalWinner,
  isComplete,
  phaseInfo,
  type Board,
  type Match,
  type Phase,
  type Schedule,
} from "../shared/model.js";
import {
  parseWikiSeries,
  resolveHistory,
  teamAliases,
  type WikiSeries,
} from "./history.js";
import type { WikiPage } from "./sources.js";

export const swissGroups: Record<string, number>[] = [
  { "0-0": 8 },
  { "1-0": 4, "0-1": 4 },
  { "2-0": 2, "1-1": 4, "0-2": 2 },
  { "2-1": 3, "1-2": 3 },
  { "2-2": 3 },
];
export function assemble(
  structure: Phase[],
  schedule: Schedule[],
  pages: WikiPage[],
  previous: Board | null,
  errors: string[],
  staleIds: Set<string>,
  wikiStale: boolean,
  parsedRows?: WikiSeries[],
): Board {
  const warnings: string[] = [];
  const byId = new Map(schedule.map((s) => [s.id, s]));
  const previousMatches = new Map(
    previous?.phases.flatMap((p) => p.matches).map((m) => [m.id, m]),
  );
  const aliases = teamAliases(schedule.flatMap((s) => s.teams));
  const rows: WikiSeries[] = parsedRows ?? pages.flatMap(parseWikiSeries);
  const phases = structure.map((phase) => {
    const matches: Match[] = phase.matches.map((m) => ({
      ...m,
      schedule: byId.get(m.id) ?? null,
      stale: staleIds.has(m.id) || !byId.has(m.id),
      group:
        phase.key === "swiss"
          ? (/\((\d-\d)\)/.exec(m.description)?.[1] ?? null)
          : null,
      history: {
        status: "pending",
        winners: [],
        message: "Awaiting Leaguepedia",
      },
    }));
    if (matches.length !== phaseInfo[phase.key].expected)
      warnings.push(
        `${phaseInfo[phase.key].name}: ${matches.length}/${phaseInfo[phase.key].expected} official series available`,
      );
    if (phase.key === "swiss") validateSwiss(matches, warnings);
    for (const m of matches) {
      m.history = resolveHistory(
        m,
        phase.key,
        rows,
        aliases,
        previousMatches.get(m.id)?.history,
      );
      if (wikiStale)
        m.history = {
          ...m.history,
          stale: true,
          message: `${m.history.message} · Leaguepedia cache is stale`,
        };
      if (m.stale)
        warnings.push(`${m.description}: Riot schedule unavailable or stale`);
    }
    return {
      key: phase.key,
      matches,
      complete: isComplete(phase.key, matches),
    };
  });
  return {
    phases,
    currentPhase: currentPhase(phases),
    lastChecked: errors.length
      ? (previous?.lastChecked ?? null)
      : new Date().toISOString(),
    attemptedAt: new Date().toISOString(),
    errors,
    warnings,
    stale: errors.length > 0 || staleIds.size > 0,
  };
}
export function validateSwiss(matches: Match[], warnings: string[]): void {
  const records = new Map<string, { wins: number; losses: number }>();
  const ordered = matches.toSorted((a, b) =>
    (a.schedule?.startTime ?? "9999").localeCompare(
      b.schedule?.startTime ?? "9999",
    ),
  );
  for (const match of ordered) {
    const s = match.schedule;
    const prior =
      s?.teams
        .filter((t) => t.teamId !== "0")
        .map((t) => records.get(t.teamId) ?? { wins: 0, losses: 0 }) ?? [];
    const groups = prior.map((r) => `${r.wins}-${r.losses}`);
    if (
      prior.length === 2 &&
      groups[0] === groups[1] &&
      prior.every((r) => r.wins + r.losses === match.column)
    ) {
      if (!match.group) match.group = groups[0] ?? null;
      else if (match.group !== groups[0])
        warnings.push(
          `Swiss ${match.description}: published record disagrees with prior results`,
        );
    } else if (prior.length === 2 && s?.teams.every((t) => t.teamId !== "0"))
      warnings.push(
        `Swiss ${match.description}: prior results do not confirm the published round`,
      );
    const winner = finalWinner(s);
    if (winner && s && !match.stale)
      for (const team of s.teams) {
        const record = records.get(team.teamId) ?? { wins: 0, losses: 0 };
        records.set(team.teamId, {
          wins: record.wins + Number(team.teamId === winner),
          losses: record.losses + Number(team.teamId !== winner),
        });
      }
  }
  for (const [column, expected] of swissGroups.entries()) {
    const round = matches.filter((m) => m.column === column);
    const slots = Object.entries(expected).flatMap(([group, count]) =>
      Array.from({ length: count }, () => group),
    );
    for (const [index, match] of round.entries())
      if (
        !match.group &&
        (!match.schedule || match.schedule.teams.every((t) => t.teamId === "0"))
      ) {
        match.group = slots[index] ?? null;
        warnings.push(
          `Swiss ${match.id}: record description unavailable; official TBD slot retained`,
        );
      }
    for (const [group, count] of Object.entries(expected)) {
      const present = round.filter((m) => m.group === group).length;
      // Unpublished descriptions retain official card identities without assigning opponents.
      if (present !== count)
        warnings.push(
          `Swiss round ${column + 1}, ${group}: ${present}/${count} classified series; unclassified official slots retained`,
        );
    }
  }
}
