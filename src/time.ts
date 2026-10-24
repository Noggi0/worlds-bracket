const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
export const localTime = (iso: string) => dateFormat.format(new Date(iso));
