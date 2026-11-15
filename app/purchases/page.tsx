import Link from "next/link";
import { listPurchases, purchasesExportUrl } from "@/lib/api";
import { firstParam, formatDay, formatNGN, queryIsPerson } from "@/lib/format";
import {
  ErrorAlert,
  ExcelIcon,
  FilterBar,
  PAGE_SIZE,
  Pager,
  isDate,
  pageFromParam,
} from "@/app/components/ListControls";
import type { PurchaseItemOut, PurchaseListPage, PurchaseOut } from "@/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_OPTIONS = [
  { value: "", label: "All phones" },
  { value: "in_stock", label: "In stock" },
  { value: "sold", label: "Sold" },
];

function StatusCell({ item }: { item: PurchaseItemOut }) {
  if (!item.sold) return <span className="pill pill-success">In stock</span>;
  return (
    <div>
      <span className="pill pill-accent">Sold{item.sold.is_swap ? " (swap)" : ""}</span>
      <div className="cell-sub">
        to{" "}
        <Link href={`/sales/${item.sold.sale_id}`} className="cell-link" style={{ color: "var(--accent)" }}>
          {item.sold.customer_name}
        </Link>
        {!item.sold.is_swap && <> for <span className="mono">{formatNGN(item.sold.sold_price)}</span></>}
      </div>
      {item.profit !== null && (
        <div className={`cell-sub mono ${item.profit >= 0 ? "positive" : "negative"}`}>
          Profit {formatNGN(item.profit)}
        </div>
      )}
    </div>
  );
}

export default async function PurchasesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = firstParam(sp.q).trim().slice(0, 100);
  const dateFrom = isDate(firstParam(sp.date_from)) ? firstParam(sp.date_from) : "";
  const dateTo = isDate(firstParam(sp.date_to)) ? firstParam(sp.date_to) : "";
  const rawStatus = firstParam(sp.status);
  const status = rawStatus === "in_stock" || rawStatus === "sold" ? rawStatus : "";
  const page = pageFromParam(firstParam(sp.page));
  const filters = { q, date_from: dateFrom, date_to: dateTo, status };
  const filtered = Boolean(q || dateFrom || dateTo || status);

  let data: PurchaseListPage = {
    items: [], total: 0, total_amount: 0, phone_count: 0, in_stock: 0, profit: 0, skip: 0, limit: PAGE_SIZE,
  };
  let fetchError = "";
  try {
    data = await listPurchases((page - 1) * PAGE_SIZE, PAGE_SIZE, filters);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load purchases.";
  }

  // One row per phone, like a spreadsheet. Respect the status filter per phone.
  const rows: { purchase: PurchaseOut; item: PurchaseItemOut; index: number }[] = [];
  for (const purchase of data.items) {
    purchase.items.forEach((item, index) => {
      if (status === "in_stock" && item.sold) return;
      if (status === "sold" && !item.sold) return;
      rows.push({ purchase, item, index });
    });
  }

  const sellers = new Set(data.items.map((p) => p.seller_phone));
  const singleSeller =
    q &&
    data.items.length > 0 &&
    sellers.size === 1 &&
    queryIsPerson(q, data.items[0].seller_name, data.items[0].seller_phone)
      ? data.items[0]
      : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Buying</p>
          <h1 className="page-title">Purchase History</h1>
          <p className="page-sub">
            {data.phone_count} phone{data.phone_count === 1 ? "" : "s"} {filtered ? "match" : "bought"} ·{" "}
            {data.in_stock} still in stock
          </p>
        </div>
        <div className="page-actions">
          <a href={purchasesExportUrl(filters)} className="btn btn-secondary" download title="Download as an Excel sheet">
            <ExcelIcon />
            Excel
          </a>
          <Link href="/new-purchase" className="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Purchase
          </Link>
        </div>
      </div>

      <FilterBar
        action="/purchases"
        q={q}
        dateFrom={dateFrom}
        dateTo={dateTo}
        placeholder="Seller name, phone, IMEI, model…"
        extra={
          <div className="filter-field">
            <label className="field-label" htmlFor="status">Status</label>
            <select id="status" name="status" className="field-input field-select" defaultValue={status}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        }
        activeNote={
          filtered ? (
            singleSeller ? (
              <>
                <span className="pill pill-accent">Seller history</span>
                <span>
                  Bought from <strong>{singleSeller.seller_name}</strong> · {singleSeller.seller_phone}{" "}
                  {data.total} time{data.total === 1 ? "" : "s"}, {formatNGN(data.total_amount)} in total.
                </span>
              </>
            ) : (
              <span>Showing purchases that match your filters.</span>
            )
          ) : null
        }
      />

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Phones Bought</div>
          <div className="stat-value">{data.phone_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value mono">{formatNGN(data.total_amount)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Stock</div>
          <div className="stat-value">{data.in_stock}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Profit on Sold</div>
          <div className={`stat-value mono ${data.profit > 0 ? "positive" : data.profit < 0 ? "negative" : ""}`}>
            {formatNGN(data.profit)}
          </div>
        </div>
      </div>

      {fetchError && <ErrorAlert message={fetchError} />}

      {rows.length === 0 && !fetchError ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 8l-9-5-9 5 9 5 9-5z" />
            <path d="M3 8v8l9 5 9-5V8M12 13v8" />
          </svg>
          {filtered ? (
            <>
              <p>No purchases match your filters.</p>
              <Link href="/purchases" className="empty-cta">Show all purchases →</Link>
            </>
          ) : (
            <>
              <p>No purchases recorded yet.</p>
              <Link href="/new-purchase" className="empty-cta">Record a phone you bought →</Link>
            </>
          )}
        </div>
      ) : rows.length > 0 ? (
        <>
          <div className="table-wrap show-wide">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bought From</th>
                  <th>Phone</th>
                  <th className="right">Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ purchase, item, index }) => (
                  <tr key={`${purchase.id}-${index}`}>
                    <td className="nowrap">
                      <div style={{ fontSize: 12 }} className="muted-text">{formatDay(purchase.purchase_date)}</div>
                      <Link href={`/purchases/${purchase.id}`} className="invoice-num" style={{ marginTop: 4 }}>
                        {purchase.ref}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/purchases?q=${encodeURIComponent(purchase.seller_phone)}`}
                        className="cell-link cell-main"
                        title="See everything bought from this seller"
                      >
                        {purchase.seller_name}
                      </Link>
                      <div className="cell-sub mono">{purchase.seller_phone}</div>
                    </td>
                    <td>
                      <div className="cell-main">{item.description}</div>
                      <div className="cell-sub">
                        {item.serial && <span className="mono">{item.serial}</span>}
                        {item.serial && item.colour && " · "}
                        {item.colour}
                      </div>
                    </td>
                    <td className="right nowrap">
                      <div className="mono">{formatNGN(item.cost_price)}</div>
                      <div className="cell-sub">{purchase.payment_method}</div>
                    </td>
                    <td><StatusCell item={item} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card-list show-narrow">
            {rows.map(({ purchase, item, index }) => (
              <Link
                href={`/purchases/${purchase.id}`}
                key={`${purchase.id}-${index}`}
                className="list-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="list-card-top">
                  <span className="list-card-title">{item.description}</span>
                  <span className="list-card-amount">{formatNGN(item.cost_price)}</span>
                </div>
                {(item.serial || item.colour) && (
                  <div className="list-card-meta">
                    {item.serial && <span className="mono">{item.serial}</span>}
                    {item.serial && item.colour && <span aria-hidden="true">·</span>}
                    {item.colour && <span>{item.colour}</span>}
                  </div>
                )}
                <div className="list-card-meta" style={{ color: "var(--text-secondary)" }}>
                  From <strong>{purchase.seller_name}</strong>
                  <span className="mono">{purchase.seller_phone}</span>
                </div>
                <div className="list-card-meta">
                  <span>{formatDay(purchase.purchase_date)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{purchase.payment_method}</span>
                </div>
                <div className="list-card-footer">
                  {item.sold ? (
                    <span className="pill pill-accent">Sold to {item.sold.customer_name}</span>
                  ) : (
                    <span className="pill pill-success">In stock</span>
                  )}
                  {item.profit !== null && (
                    <span className={`mono ${item.profit >= 0 ? "positive" : "negative"}`} style={{ fontSize: 12 }}>
                      Profit {formatNGN(item.profit)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <Pager basePath="/purchases" params={filters} page={page} total={data.total} noun="purchases" />
        </>
      ) : null}
    </div>
  );
}
