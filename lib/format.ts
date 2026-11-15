export function formatNGN(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
}

// Always show dates in Lagos time, even when the page is rendered on a server
// running in UTC.
const TZ = "Africa/Lagos";

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });
}

/** "2026-11-15" → "15 Nov 2026" without timezone drift. */
export function formatDay(ymd: string): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Today's date in Lagos as YYYY-MM-DD (for date inputs). */
export function todayLagos(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** True when a search query is (part of) this person's name or phone number. */
export function queryIsPerson(q: string, name: string, phone: string): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return false;
  const digits = query.replace(/[^\d]/g, "");
  if (digits.length >= 4 && digits.length === query.replace(/[\s+\-]/g, "").length) {
    return phone.replace(/[^\d]/g, "").includes(digits);
  }
  return name.toLowerCase().includes(query);
}
