import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { finalWinner, type Match } from "../shared/model";
import { localTime } from "./time";
import { useMatchTooltip } from "./MatchTooltipContext";
export function MatchCard({
  match,
  style,
}: {
  match: Match;
  style?: CSSProperties;
}) {
  const { active, activate, close, togglePinned } = useMatchTooltip();
  const tip = active?.id === match.id;
  const pinned = tip && active.pinned;
  const card = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelDismiss = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = null;
  };
  const dismiss = () => {
    if (!pinned) {
      cancelDismiss();
      dismissTimer.current = setTimeout(() => close(match.id), 120);
    }
  };
  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    },
    [],
  );
  useLayoutEffect(() => {
    if (!tip) return;
    const position = () => {
      if (!tooltip.current || !card.current) return;
      const anchor = card.current.getBoundingClientRect();
      const box = tooltip.current.getBoundingClientRect();
      const right = anchor.right + 8;
      const left = anchor.left - box.width - 8;
      const beside =
        right + box.width <= window.innerWidth - 8
          ? "right"
          : left >= 8
            ? "left"
            : null;
      const x =
        beside === "right" ? right : beside === "left" ? left : anchor.left;
      const y = beside
        ? anchor.top + (anchor.height - box.height) / 2
        : anchor.bottom + box.height + 8 > window.innerHeight
          ? anchor.top - box.height - 8
          : anchor.bottom + 8;
      // Prefer the side of the card so the tooltip does not intercept its neighbours in the same column.
      tooltip.current.style.left = `${Math.max(8, Math.min(x, window.innerWidth - box.width - 8))}px`;
      tooltip.current.style.top = `${Math.max(8, Math.min(y, window.innerHeight - box.height - 8))}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [tip, match.history]);
  const schedule = match.schedule;
  const winner = finalWinner(schedule);
  const teams = schedule?.teams ?? [];
  const show = () => {
    cancelDismiss();
    activate(match.id);
  };
  const showFromPointer = (event: MouseEvent<HTMLButtonElement>) => {
    cancelDismiss();
    activate(match.id, { x: event.clientX, y: event.clientY });
  };
  useEffect(() => {
    if (!tip) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !card.current?.contains(event.target) &&
        !tooltip.current?.contains(event.target)
      ) {
        close(match.id);
      }
    };
    window.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("pointerdown", outside);
    };
  }, [tip, match.id, close]);
  const status = match.stale
    ? "Stale"
    : schedule?.state === "completed"
      ? winner
        ? "Final"
        : "Result unavailable"
      : schedule?.state === "inProgress"
        ? "LIVE"
        : schedule
          ? "Upcoming"
          : "Unavailable";
  const label = `${match.description}: ${teams.map((t) => `${t.code} ${t.result?.gameWins ?? "score unavailable"}${t.teamId === winner ? ", series winner" : ""}`).join(" vs ") || "TBD vs TBD"}, ${status}${schedule ? `, best of ${schedule.bestOf}, ${localTime(schedule.startTime)}` : ""}`;
  return (
    <>
      <button
        ref={card}
        className={`match ${schedule?.state === "inProgress" ? "live" : ""} ${winner ? "finished" : ""}`}
        style={style}
        data-match-id={match.id}
        aria-label={label}
        aria-describedby={tip ? `history-${match.id}` : undefined}
        onMouseEnter={showFromPointer}
        onMouseMove={showFromPointer}
        onMouseLeave={dismiss}
        onFocus={show}
        onBlur={() => {
          close(match.id);
        }}
        onClick={() => {
          cancelDismiss();
          togglePinned(match.id);
        }}
      >
        <span className="match-meta">
          <span>
            {schedule ? localTime(schedule.startTime) : "Time unavailable"}
          </span>
          <span className={status === "LIVE" ? "live-label" : ""}>
            {status} {schedule ? `· BO${schedule.bestOf}` : ""}
          </span>
        </span>
        {[0, 1].map((index) => {
          const team = teams[index];
          return (
            <span
              className={`team ${team?.teamId === winner ? "won" : ""}`}
              key={index}
            >
              <span className="team-identity">
                {team?.image && team.teamId !== "0" ? (
                  <img
                    width={16}
                    height={16}
                    src={team.image.replace(/^http:/, "https:")}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />
                ) : (
                  <span className="unknown-logo" aria-hidden="true">
                    ◇
                  </span>
                )}
                <strong>
                  {team?.teamId === "0" ? "TBD" : (team?.code ?? "TBD")}
                </strong>
              </span>
              <span className="score">
                {team?.teamId === winner ? (
                  <span className="winner-tick" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
                {team?.result?.gameWins ?? "–"}
              </span>
            </span>
          );
        })}
      </button>
      {tip
        ? createPortal(
            <div
              ref={tooltip}
              className="tooltip"
              onMouseEnter={cancelDismiss}
              onMouseLeave={dismiss}
              id={`history-${match.id}`}
              role="tooltip"
              style={{ left: 8, top: 8 }}
            >
              <div className="tip-header">
                <strong>
                  {teams.map((t) => t.code).join(" vs ") || "TBD vs TBD"}
                </strong>
                <span>
                  {schedule ? `BEST OF ${schedule.bestOf}` : "FORMAT UNKNOWN"}
                </span>
              </div>
              <p className="tip-date">
                {schedule
                  ? localTime(schedule.startTime)
                  : "Schedule unavailable"}{" "}
                · {match.description}
              </p>
              <div className="games">
                {Array.from({ length: schedule?.bestOf ?? 0 }, (_, i) => {
                  const winnerId = match.history.winners[i];
                  const game = schedule?.games.find((g) => g.number === i + 1);
                  const code = teams.find((t) => t.teamId === winnerId)?.code;
                  const notPlayed =
                    game?.state === "unneeded" || game?.state === "unstarted";
                  return (
                    <div
                      className={
                        code ? "known" : notPlayed ? "unplayed" : "missing"
                      }
                      key={i}
                    >
                      <span>G{i + 1}</span>
                      <strong>{code ?? (notPlayed ? "—" : "?")}</strong>
                      <small>
                        {code
                          ? "Winner"
                          : game?.state === "unneeded"
                            ? "Not needed"
                            : game?.state === "unstarted"
                              ? "Not played"
                              : game?.state === "inProgress"
                                ? "In progress"
                                : "Unavailable"}
                      </small>
                    </div>
                  );
                })}
              </div>
              <p className="history-state">
                {match.history.status === "complete" ? "✓ " : ""}
                {match.history.message}
              </p>
              {match.history.revid ? (
                <small className="revision">
                  Leaguepedia · revision {match.history.revid}
                  {match.history.stale ? " · STALE" : ""}
                </small>
              ) : null}
              <span className="tip-hint">
                Click / tap to pin · Esc to dismiss
              </span>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
