import Link from "next/link";
import { listSales, salesExportUrl } from "@/lib/api";
import { firstParam, formatDate, formatDateTime, formatNGN, queryIsPerson } from "@/lib/format";
import ReceiptDownload from "@/app/components/ReceiptDownload";
import {
  ErrorAlert,
  ExcelIcon,
  FilterBar,
  PAGE_SIZE,
  Pager,
  isDate,
  pageFromParam,
} from "@/app/components/ListControls";
import type { SaleListPage } from "@/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SalesHistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = firstParam(sp.q).trim().slice(0, 100);
  const dateFrom = isDate(firstParam(sp.date_from)) ? firstParam(sp.date_from) : "";
  const dateTo = isDate(firstParam(sp.date_to)) ? firstParam(sp.date_to) : "";
  const page = pageFromParam(firstParam(sp.page));
  const filters = { q, date_from: dateFrom, date_to: dateTo };
  const filtered = Boolean(q || dateFrom || dateTo);

  let data: SaleListPage = { items: [], total: 0, total_amount: 0, skip: 0, limit: PAGE_SIZE };
  let fetchError = "";

  try {
    data = await listSales((page - 1) * PAGE_SIZE, PAGE_SIZE, filters);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load sales.";
  }

  const sales = data.items;
  const avg = data.total > 0 ? data.total_amount / data.total : 0;

  // When every result belongs to one phone number, this is a customer history.
  const phones = new Set(sales.map((s) => s.customer_phone).filter(Boolean));
  const singleCustomer =
    q && sales.length > 0 && phones.size === 1 && queryIsPerson(q, sales[0].customer_name, sales[0].customer_phone)
      ? sales[0]
      : null;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Sales</p>
          <h1 className="page-title">Sales History</h1>
          <p className="page-sub">
            {filtered
              ? `${data.total} matching sale${data.total === 1 ? "" : "s"}`
              : `${data.total} total sale${data.total === 1 ? "" : "s"} recorded`}
          </p>
        </div>
        <div className="page-actions">
          <a
            href={salesExportUrl(filters)}
            className="btn btn-secondary"
            download
            title={filtered ? "Download these sales as an Excel sheet" : "Download all sales as an Excel sheet"}
          >
            <ExcelIcon />
            Excel
          </a>
          <Link href="/new-sale" className="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Sale
          </Link>
        </div>
      </div>

      <FilterBar
        action="/sales"
        q={q}
        dateFrom={dateFrom}
        dateTo={dateTo}
        placeholder="Customer name, phone, IMEI, invoice…"
        activeNote={
          filtered ? (
            singleCustomer ? (
              <>
                <span className="pill pill-accent">Customer history</span>
                <span>
                  <strong>{singleCustomer.customer_name}</strong> · {singleCustomer.customer_phone} has bought{" "}
                  {data.total} time{data.total === 1 ? "" : "s"}, {formatNGN(data.total_amount)} in total.
                </span>
              </>
            ) : (
              <span>Showing sales that match your search.</span>
            )
          ) : null
        }
      />

      {/* ── Stats strip ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">{filtered ? "Matching Sales" : "Total Sales"}</div>
          <div className="stat-value">{data.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value mono">{formatNGN(data.total_amount)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg. Sale Value</div>
          <div className="stat-value mono">{formatNGN(avg)}</div>
        </div>
      </div>

      {fetchError && <ErrorAlert message={fetchError} />}

      {sales.length === 0 && !fetchError ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
          </svg>
          {filtered ? (
            <>
              <p>No sales match your search.</p>
              <Link href="/sales" className="empty-cta">Show all sales →</Link>
            </>
          ) : (
            <>
              <p>No sales recorded yet.</p>
              <Link href="/new-sale" className="empty-cta">Record your first sale →</Link>
            </>
          )}
        </div>
      ) : sales.length > 0 ? (
        <>
          {/* ══ TABLE (wide screens) ══ */}
          <div className="table-wrap show-wide">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th className="right">Amount</th>
                  <th className="right">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="nowrap">
                      <Link href={`/sales/${sale.id}`} className="invoice-num" title="View sale details">
                        {sale.invoice_number}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/sales?q=${encodeURIComponent(sale.customer_phone || sale.customer_name)}`}
                        className="cell-link cell-main"
                        title="See everything this customer has bought"
                      >
                        {sale.customer_name}
                      </Link>
                      {sale.customer_phone && <div className="cell-sub mono">{sale.customer_phone}</div>}
                    </td>
                    <td>
                      <div className="cell-main" style={{ fontWeight: 400 }}>{sale.items_summary}</div>
                      {sale.has_swap && <span className="pill pill-warning" style={{ marginTop: 4 }}>Swap</span>}
                    </td>
                    <td className="nowrap">
                      <span className="pill">{sale.payment_method}</span>
                    </td>
                    <td className="nowrap">
                      <div className="muted-text" style={{ fontSize: 12 }}>{formatDateTime(sale.created_at)}</div>
                      <div className="cell-sub">by {sale.staff_name}</div>
                    </td>
                    <td className="right mono nowrap">{formatNGN(sale.subtotal)}</td>
                    <td className="right nowrap">
                      <ReceiptDownload id={sale.id} invoiceNumber={sale.invoice_number} variant="row" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ══ CARD LIST (phones / narrow) ══ */}
          <div className="card-list show-narrow">
            {sales.map((sale) => (
              <div key={sale.id} className="list-card">
                <div className="list-card-top">
                  <Link href={`/sales/${sale.id}`} className="invoice-num">{sale.invoice_number}</Link>
                  <span className="list-card-amount">{formatNGN(sale.subtotal)}</span>
                </div>
                <Link
                  href={`/sales?q=${encodeURIComponent(sale.customer_phone || sale.customer_name)}`}
                  className="list-card-title"
                >
                  {sale.customer_name}
                </Link>
                <div className="list-card-meta" style={{ color: "var(--text-secondary)" }}>
                  {sale.items_summary}
                  {sale.has_swap && <span className="pill pill-warning">Swap</span>}
                </div>
                <div className="list-card-meta">
                  {sale.customer_phone && <span className="mono">{sale.customer_phone}</span>}
                  <span aria-hidden="true">·</span>
                  <span>{sale.payment_method}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDate(sale.created_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{sale.staff_name}</span>
                </div>
                <div className="list-card-footer">
                  <Link href={`/sales/${sale.id}`} className="btn btn-secondary" style={{ minHeight: 36, padding: "6px 14px" }}>
                    Details
                  </Link>
                  <ReceiptDownload id={sale.id} invoiceNumber={sale.invoice_number} variant="row" />
                </div>
              </div>
            ))}
          </div>

          <Pager basePath="/sales" params={filters} page={page} total={data.total} noun="sales" />
        </>
      ) : null}
    </div>
  );
}
