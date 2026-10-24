import { z } from "zod";
export const phaseKeys = ["play-ins", "swiss", "knockouts"] as const;
export const phaseKeySchema = z.enum(phaseKeys);
export type PhaseKey = z.infer<typeof phaseKeySchema>;
export const phaseInfo = {
  "play-ins": { id: "115660540725570705", name: "Play-ins", expected: 6 },
  swiss: { id: "115660540725570706", name: "Swiss", expected: 33 },
  knockouts: { id: "115660540725570707", name: "Knockouts", expected: 7 },
};
export const teamSchema = z.object({
  teamId: z.string(),
  code: z.string(),
  name: z.string(),
  image: z.string().nullish(),
  result: z
    .object({
      gameWins: z.number().int().nonnegative().nullable(),
      outcome: z.string().nullable(),
    })
    .nullish(),
});
export const gameSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  state: z.enum(["completed", "inProgress", "unstarted", "unneeded"]),
});
export const scheduleSchema = z
  .object({
    id: z.string(),
    state: z.enum(["completed", "inProgress", "unstarted"]),
    startTime: z.iso.datetime(),
    bestOf: z.union([z.literal(1), z.literal(3), z.literal(5)]),
    teams: z.array(teamSchema).length(2),
    games: z.array(gameSchema),
  })
  .superRefine((s, context) => {
    if (
      s.games.length !== s.bestOf ||
      new Set(s.games.map((g) => g.number)).size !== s.bestOf ||
      s.games.some((g) => g.number > s.bestOf)
    )
      context.addIssue({
        code: "custom",
        path: ["games"],
        message: "Expected unique numbered game metadata for each best-of slot",
      });
  });
export type Schedule = z.infer<typeof scheduleSchema>;
export type Team = z.infer<typeof teamSchema>;
export const destinationSchema = z.object({
  type: z.string(),
  structuralId: z.string().nullable(),
  slot: z.number().int(),
});
export const structuralMatchSchema = z.object({
  id: z.string(),
  structuralId: z.string(),
  description: z.string(),
  column: z.number().int().nonnegative(),
  cell: z.string(),
  destinations: z.object({
    win: destinationSchema.nullish(),
    loss: destinationSchema.nullish(),
  }),
});
export const phaseSchema = z.object({
  key: phaseKeySchema,
  matches: z.array(structuralMatchSchema),
});
export type Phase = z.infer<typeof phaseSchema>;
export const historySchema = z.object({
  status: z.enum([
    "complete",
    "partial",
    "pending",
    "unavailable",
    "inconsistent",
  ]),
  winners: z.array(z.string().nullable()),
  message: z.string(),
  page: z.string().optional(),
  revid: z.number().optional(),
  signature: z.string().optional(),
  stale: z.boolean().optional(),
});
export type History = z.infer<typeof historySchema>;
export const matchSchema = structuralMatchSchema.extend({
  schedule: scheduleSchema.nullable(),
  stale: z.boolean(),
  group: z.string().nullable(),
  history: historySchema,
});
export type Match = z.infer<typeof matchSchema>;
export const boardSchema = z.object({
  phases: z.array(
    z.object({
      key: phaseKeySchema,
      matches: z.array(matchSchema),
      complete: z.boolean(),
    }),
  ),
  currentPhase: phaseKeySchema,
  lastChecked: z.string().nullable(),
  attemptedAt: z.string(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  stale: z.boolean(),
});
export type Board = z.infer<typeof boardSchema>;
export function finalWinner(s: Schedule | null): string | null {
  if (
    !s ||
    s.state !== "completed" ||
    s.teams.length !== 2 ||
    s.teams.some((t) => t.teamId === "0" || t.result?.gameWins == null)
  )
    return null;
  const winner = s.teams.find((t) => t.result?.outcome === "win");
  const loser = s.teams.find((t) => t.teamId !== winner?.teamId);
  const threshold = Math.floor(s.bestOf / 2) + 1;
  return winner &&
    loser &&
    winner.result?.gameWins === threshold &&
    loser.result?.outcome === "loss" &&
    loser.result.gameWins != null &&
    loser.result.gameWins < threshold
    ? winner.teamId
    : null;
}
export function isComplete(
  key: PhaseKey,
  matches: Pick<Match, "id" | "schedule" | "stale">[],
): boolean {
  const distinct = new Map(matches.map((m) => [m.id, m]));
  return (
    distinct.size === phaseInfo[key].expected &&
    [...distinct.values()].every(
      (m) => !m.stale && finalWinner(m.schedule) !== null,
    )
  );
}
export function currentPhase(
  phases: { key: PhaseKey; complete: boolean }[],
): PhaseKey {
  return (
    phaseKeys.find((key) => !phases.find((p) => p.key === key)?.complete) ??
    "knockouts"
  );
}
