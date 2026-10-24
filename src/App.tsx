import { useCallback, useEffect, useRef, useState } from "react";
import {
  boardSchema,
  phaseInfo,
  phaseKeys,
  type Board,
  type PhaseKey,
} from "../shared/model";
import { Bracket } from "./Bracket";
import { HeaderBrand } from "./HeaderBrand";
import { MatchTooltipProvider } from "./MatchTooltipContext";

import { localTime } from "./time";
async function requestBoard(refresh = false): Promise<Board> {
  const response = await fetch(
    refresh ? "/api/refresh" : "/api/board",
    refresh
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }
      : {},
  );
  if (!response.ok)
    throw new Error(`Local server returned HTTP ${response.status}`);
  return boardSchema.parse(await response.json());
}
export function App() {
  const [board, setBoard] = useState<Board | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<PhaseKey | null>(null);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flight = useRef(false);
  const [details, setDetails] = useState(false);
  const refresh = useCallback((force = false) => {
    if (flight.current) return Promise.resolve();
    flight.current = true;
    return requestBoard(force)
      .then((next) => {
        setBoard(next);
        setSelectedPhase(
          (previous) =>
            previous ??
            (next.phases.some((p) => p.matches.length)
              ? next.currentPhase
              : null),
        );
        setError(null);
      })
      .catch((e: unknown) => {
        setError(
          e instanceof Error ? e.message : "Could not reach local server",
        );
      })
      .finally(() => {
        flight.current = false;
        setBusy(false);
      });
  }, []);
  useEffect(() => {
    void refresh(true);
    const timer = setInterval(() => {
      setBusy(true);
      void refresh(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [refresh]);
  const phase = selectedPhase ?? board?.currentPhase ?? "play-ins";
  const selected = board?.phases.find((p) => p.key === phase);
  const issues = [
    ...(error ? [error] : []),
    ...(board?.errors ?? []),
    ...(board?.warnings ?? []),
  ];
  return (
    <div className="app">
      <a className="skip-link" href="#tournament-board">
        Skip to tournament board
      </a>
      <header>
        <HeaderBrand />
        <div className="sync">
          <span
            className={issues.length ? "sync-state warning" : "sync-state"}
            role="status"
            aria-live="polite"
          >
            {issues.length
              ? "⚠ Data needs attention"
              : busy
                ? "Checking sources…"
                : "● Sources connected"}
          </span>
          <span>
            Last checked{" "}
            <strong>
              {board?.lastChecked ? localTime(board.lastChecked) : "Never"}
            </strong>
          </span>
          <button
            className="refresh"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void refresh(true);
            }}
          >
            {busy ? "Checking…" : error ? "Retry" : "↻ Refresh"}
          </button>
        </div>
      </header>
      <div className="navigation">
        <nav aria-label="Tournament phases">
          {phaseKeys.map((key, i) => (
            <button
              key={key}
              aria-current={phase === key ? "page" : undefined}
              onClick={() => {
                if (key !== phase)
                  setDirection(
                    phaseKeys.indexOf(key) > phaseKeys.indexOf(phase)
                      ? "next"
                      : "previous",
                  );
                setSelectedPhase(key);
                setDetails(false);
              }}
            >
              <span className="step">0{i + 1}</span>
              {phaseInfo[key].name}
              {board?.currentPhase === key ? (
                <span className="current">CURRENT</span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>
      <main
        id="tournament-board"
        tabIndex={-1}
        aria-label={`${phaseInfo[phase].name} tournament board`}
      >
        {issues.length ? (
          <div className="notice" role="status">
            <span>
              {error
                ? "Local connection failed. Previously loaded data is stale."
                : board?.stale
                  ? "Some data is stale or unavailable."
                  : "Source checks need attention."}{" "}
              Last successful results are retained where available.
            </span>
            <button
              aria-expanded={details}
              onClick={() => setDetails(!details)}
            >
              {details ? "Hide details" : "View details"} ({issues.length})
            </button>
            {details ? (
              <div className="issue-details" role="status">
                {issues.map((issue, i) => (
                  <p key={i}>{issue}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {selected?.matches.length ? (
          <div className="board-viewport">
            <div
              className="board-transition"
              key={phase}
              data-direction={direction}
            >
              <MatchTooltipProvider>
                <Bracket phase={phase} matches={selected.matches} />
              </MatchTooltipProvider>
            </div>
          </div>
        ) : (
          <div className="empty" role="status">
            <span className="empty-symbol">◇</span>
            <h2>
              {busy ? "Connecting to Worlds…" : "Tournament data unavailable"}
            </h2>
            <p>
              {busy
                ? "Loading official brackets and game histories."
                : "The official structure could not be loaded. No substitute results are shown."}
            </p>
            {!busy ? (
              <button
                onClick={() => {
                  setBusy(true);
                  void refresh(true);
                }}
              >
                Retry
              </button>
            ) : null}
          </div>
        )}
      </main>
      <footer>
        <span>
          <span className="winner-legend">✓ Series winner</span>
          <span>Dashed connection · loser advances</span>
        </span>
        <span>
          Riot · series & structure <b> / </b> Leaguepedia · game winners{" "}
          <b> / </b> Times: {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </span>
      </footer>
    </div>
  );
}
