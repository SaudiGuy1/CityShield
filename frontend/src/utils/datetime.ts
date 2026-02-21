const DEFAULT_TIMEZONE = "Asia/Riyadh";

export function formatDateTimeWithSeconds(iso: string): string {
  if (!iso) return "\u2014";

  const date = new Date(iso);
  if (isNaN(date.getTime())) return "\u2014";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: DEFAULT_TIMEZONE,
  }).format(date);
}

export function formatTimeWithSeconds(iso: string): string {
  if (!iso) return "\u2014";

  const date = new Date(iso);
  if (isNaN(date.getTime())) return "\u2014";

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: DEFAULT_TIMEZONE,
  }).format(date);
}

export function formatDateOnly(iso: string): string {
  if (!iso) return "\u2014";

  const date = new Date(iso);
  if (isNaN(date.getTime())) return "\u2014";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: DEFAULT_TIMEZONE,
  }).format(date);
}
