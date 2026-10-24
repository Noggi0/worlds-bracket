import type { Match, PhaseKey } from "../shared/model";
import { MatchCard } from "./MatchCard";

interface Position {
  x: number;
  y: number;
}
export function positions(
  phase: PhaseKey,
  matches: Match[],
): Map<string, Position> {
  const result = new Map<string, Position>();
  const columns = [...new Set(matches.map((m) => m.column))].sort(
    (a, b) => a - b,
  );
  for (const column of columns) {
    const list = matches.filter((m) => m.column === column);
    for (const [index, match] of list.entries()) {
      // Placement follows official columns and cells; connections follow destinations only.
      const y =
        phase === "play-ins"
          ? column === 0
            ? ([0.17, 0.43][index] ?? 0.7)
            : column === 1
              ? match.cell.startsWith("Upper")
                ? 0.3
                : 0.76
              : column === 2
                ? 0.67
                : 0.42
          : (index + 0.5) / list.length;
      result.set(match.structuralId, { x: (column + 0.5) / columns.length, y });
    }
  }
  return result;
}
export function Bracket({
  phase,
  matches,
}: {
  phase: PhaseKey;
  matches: Match[];
}) {
  if (phase === "swiss")
    return (
      <div className="swiss board" aria-label="Swiss bracket">
        {[0, 1, 2, 3, 4].map((column) => {
          const round = matches.filter((m) => m.column === column);
          const groups = [
            ...new Set(round.map((m) => m.group ?? "Unclassified")),
          ];
          return (
            <section
              className="swiss-column"
              key={column}
              aria-label={`Round ${column + 1}`}
            >
              <h3>
                <span>ROUND 0{column + 1}</span>
                <small>{round.length} SERIES</small>
              </h3>
              <div className="swiss-round">
                {groups.map((group) => (
                  <div className="record-group" key={group}>
                    <h4>
                      {group}
                      <span>
                        {group.startsWith("2-")
                          ? "QUALIFICATION"
                          : group.endsWith("-2")
                            ? "ELIMINATION"
                            : "WIN–LOSS"}
                      </span>
                    </h4>
                    {round
                      .filter((m) => (m.group ?? "Unclassified") === group)
                      .map((match) => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  const layout = positions(phase, matches);
  const columns = [...new Set(matches.map((m) => m.column))].sort(
    (a, b) => a - b,
  );
  const width = phase === "play-ins" ? 19 : 23;
  return (
    <div className={`connected board ${phase}`} aria-label={`${phase} bracket`}>
      <div className="round-titles">
        {columns.map((column) => (
          <h3 key={column}>
            {phase === "knockouts"
              ? ["QUARTERFINALS", "SEMIFINALS", "GRAND FINAL"][column]
              : [
                  "OPENING ROUND",
                  "UPPER FINAL / LOWER SEMI",
                  "LOWER FINAL",
                  "GRAND FINAL",
                ][column]}
          </h3>
        ))}
      </div>
      <div className="bracket-canvas">
        <svg
          className="connections"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          aria-label="Bracket advancement connections"
        >
          {matches.flatMap((match) => {
            const start = layout.get(match.structuralId);
            if (!start) return [];
            return (["win", "loss"] as const).flatMap((kind) => {
              const destination = match.destinations[kind];
              if (destination?.type !== "match" || !destination.structuralId)
                return [];
              const end = layout.get(destination.structuralId);
              if (!end) return [];
              const x1 = start.x * 1000 + width * 5;
              const x2 = end.x * 1000 - width * 5;
              const y1 = start.y * 1000 + (kind === "loss" ? 24 : 0);
              const y2 = end.y * 1000 + (destination.slot === 1 ? -18 : 18);
              const mid = (x1 + x2) / 2;
              return (
                <path
                  key={`${match.id}-${kind}`}
                  data-source={match.id}
                  data-target={destination.structuralId}
                  data-slot={destination.slot}
                  className={kind}
                  d={`M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`}
                >
                  <title>
                    {match.description} {kind === "win" ? "winner" : "loser"} →
                    destination slot {destination.slot}
                  </title>
                </path>
              );
            });
          })}
        </svg>
        {matches.map((match) => {
          const point = layout.get(match.structuralId);
          return point ? (
            <div
              key={match.id}
              className="bracket-node"
              style={{
                left: `${point.x * 100}%`,
                top: `${point.y * 100}%`,
                width: `${width}%`,
              }}
            >
              <span className="node-label">
                {match.cell} <b>{match.description}</b>
              </span>
              <MatchCard match={match} />
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}
