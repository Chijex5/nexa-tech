import Link from "next/link";
import type { ReactNode } from "react";

export const PAGE_SIZE = 50;

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const ExcelIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13l4 5M12 13l-4 5M15 13v5" />
  </svg>
);

interface FilterBarProps {
  action: string;
  q: string;
  dateFrom: string;
  dateTo: string;
  placeholder: string;
  /** Extra fields (e.g. a status select) placed before the buttons. */
  extra?: ReactNode;
  /** Shown under the bar when a filter is active. */
  activeNote?: ReactNode;
}

/** Plain GET form: works without JavaScript and keeps filters in the URL. */
export function FilterBar({ action, q, dateFrom, dateTo, placeholder, extra, activeNote }: FilterBarProps) {
  return (
    <form className="filter-bar" action={action} method="get" role="search">
      <div className="filter-search">
        <label className="field-label" htmlFor="q" style={{ display: "block", marginBottom: 4 }}>
          Search
        </label>
        <div style={{ position: "relative" }}>
          <SearchIcon />
          <input
            id="q"
            name="q"
            type="search"
            className="field-input"
            placeholder={placeholder}
            defaultValue={q}
            maxLength={100}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      </div>
      <div className="filter-field">
        <label className="field-label" htmlFor="date_from">From</label>
        <input id="date_from" name="date_from" type="date" className="field-input" defaultValue={dateFrom} />
      </div>
      <div className="filter-field">
        <label className="field-label" htmlFor="date_to">To</label>
        <input id="date_to" name="date_to" type="date" className="field-input" defaultValue={dateTo} />
      </div>
      {extra}
      <div className="filter-actions">
        <button type="submit" className="btn btn-primary">Search</button>
        {activeNote ? (
          <Link href={action} className="btn btn-secondary">Clear</Link>
        ) : null}
      </div>
      {activeNote ? <div className="filter-note">{activeNote}</div> : null}
    </form>
  );
}

interface PagerProps {
  basePath: string;
  params: Record<string, string>;
  page: number;
  total: number;
  pageSize?: number;
  noun: string;
}

export function Pager({ basePath, params, page, total, pageSize = PAGE_SIZE, noun }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav className="pager" aria-label="Pages">
      <span>
        Showing {from}–{to} of {total} {noun}
      </span>
      <div className="pager-links">
        <Link className="btn btn-secondary" href={href(page - 1)} aria-disabled={page <= 1}>
          ← Newer
        </Link>
        <Link className="btn btn-secondary" href={href(page + 1)} aria-disabled={page >= pages}>
          Older →
        </Link>
      </div>
    </nav>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="alert-error" role="alert">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function pageFromParam(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 20000) : 1;
}

export function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
