import Link from "next/link";
import { notFound } from "next/navigation";
import { getSale, getSalePurchases } from "@/lib/api";
import { formatDateTime, formatDay, formatNGN, lagosDay } from "@/lib/format";
import ReceiptDownload from "@/app/components/ReceiptDownload";
import SaleDateEditor from "@/app/components/SaleDateEditor";
import { ErrorAlert } from "@/app/components/ListControls";
import type { PurchaseOut, SaleOut } from "@/types";

export const dynamic = "force-dynamic";

/** "16/11/2026" (as printed on the receipt) → "2026-11-16". */
function invoiceDay(invoiceDate: string, fallbackIso: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(invoiceDate);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : lagosDay(fallbackIso);
}

function serialKey(serial: string): string {
  return serial.replace(/[\s-]+/g, "").toUpperCase();
}

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let sale: SaleOut | null = null;
  let error = "";
  try {
    sale = await getSale(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load sale.";
    if (/not found/i.test(message)) notFound();
    error = message;
  }

  // Where the sold phones were bought from (linked by serial / IMEI).
  let sources: PurchaseOut[] = [];
  if (sale) {
    try {
      sources = await getSalePurchases(sale.id);
    } catch {
      sources = [];
    }
  }
  const sourceBySerial = new Map<string, { purchase: PurchaseOut; cost: number }>();
  for (const p of sources) {
    for (const item of p.items) {
      if (item.sold?.sale_id === sale?.id && item.serial) {
        sourceBySerial.set(serialKey(item.serial), { purchase: p, cost: item.cost_price });
      }
    }
  }

  return (
    <div>
      <Link href="/sales" className="back-link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Sales History
      </Link>

      {error && <ErrorAlert message={error} />}

      {sale && (
        <>
          <div className="page-header">
            <div>
              <p className="page-eyebrow">Sale</p>
              <h1 className="page-title">{sale.invoice_number}</h1>
              <p className="page-sub">{formatDateTime(sale.created_at)}</p>
            </div>
            <div style={{ minWidth: 0, width: "min(100%, 300px)" }}>
              <ReceiptDownload id={sale.id} invoiceNumber={sale.invoice_number} variant="panel" />
            </div>
          </div>

          <section className="card">
            <div className="card-title">Customer &amp; payment</div>
            <div className="detail-grid">
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="detail-label">Date of sale</div>
                <div className="detail-value">
                  <SaleDateEditor saleId={sale.id} day={invoiceDay(sale.invoice_date, sale.created_at)} />
                </div>
                {sale.recorded_at && lagosDay(sale.recorded_at) !== invoiceDay(sale.invoice_date, sale.created_at) && (
                  <div className="cell-sub">Entered on {formatDateTime(sale.recorded_at)}</div>
                )}
              </div>
              <div>
                <div className="detail-label">Customer</div>
                <div className="detail-value">{sale.customer_name}</div>
              </div>
              <div>
                <div className="detail-label">Phone</div>
                <div className="detail-value mono">
                  <a href={`tel:${sale.customer_phone.replace(/\s+/g, "")}`}>{sale.customer_phone}</a>
                </div>
              </div>
              <div>
                <div className="detail-label">Payment</div>
                <div className="detail-value"><span className="pill pill-accent">{sale.payment_method}</span></div>
              </div>
              <div>
                <div className="detail-label">Handled by</div>
                <div className="detail-value">{sale.staff_name}</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <Link
                href={`/sales?q=${encodeURIComponent(sale.customer_phone || sale.customer_name)}`}
                className="btn btn-secondary"
              >
                See all sales to this customer
              </Link>
            </div>
          </section>

          <section className="card">
            <div className="card-title">
              Items <span className="pill">{sale.items.length}</span>
            </div>
            <div className="sale-items">
              {sale.items.map((item, i) => {
                const source = item.serial ? sourceBySerial.get(serialKey(item.serial)) : undefined;
                const profit = source && !item.is_swap ? item.unit_price - source.cost : null;
                return (
                  <div className="sale-item" key={i}>
                    <div className="sale-item-main">
                      <div className="cell-main">
                        {item.description}
                        {item.is_swap && <span className="pill pill-warning" style={{ marginLeft: 8 }}>Swap</span>}
                      </div>
                      <div className="cell-sub">
                        {[item.serial && `IMEI/SN: ${item.serial}`, item.colour && `Colour: ${item.colour}`]
                          .filter(Boolean)
                          .join(" · ") || "No serial recorded"}
                      </div>
                      {item.is_swap && item.swap_from_devices.length > 0 && (
                        <div className="sale-item-swap">
                          <strong>Traded in:</strong>{" "}
                          {item.swap_from_devices
                            .map((d) => [d.description, d.serial, d.colour].filter(Boolean).join(" · "))
                            .join("; ")}
                        </div>
                      )}
                      {source && (
                        <div className="sale-item-source">
                          Bought from{" "}
                          <Link href={`/purchases/${source.purchase.id}`}>{source.purchase.seller_name}</Link>{" "}
                          on {formatDay(source.purchase.purchase_date)} for{" "}
                          <span className="mono">{formatNGN(source.cost)}</span>
                          {profit !== null && (
                            <>
                              {" "}· Profit{" "}
                              <span className={`mono ${profit >= 0 ? "positive" : "negative"}`}>{formatNGN(profit)}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="sale-item-amount">
                      <div className="cell-sub">
                        {item.qty} × {formatNGN(item.unit_price)}
                        {item.is_swap ? " top-up" : ""}
                      </div>
                      <div className="mono" style={{ fontWeight: 600 }}>{formatNGN(item.amount)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="sale-total">
              <span>Total</span>
              <span className="mono">{formatNGN(sale.subtotal)}</span>
            </div>
          </section>
        </>
      )}

      <style>{`
        .sale-items { display: flex; flex-direction: column; }
        .sale-item {
          display: flex; justify-content: space-between; gap: 16px;
          padding: 12px 0; border-bottom: 1px solid var(--navy-border);
        }
        .sale-item:first-child { padding-top: 0; }
        .sale-item-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .sale-item-amount { text-align: right; flex-shrink: 0; }
        .sale-item-swap {
          font-size: 12px; color: var(--warning);
          background: rgba(196, 124, 26, 0.08); border: 1px solid rgba(196, 124, 26, 0.18);
          border-radius: var(--radius-sm); padding: 4px 8px; overflow-wrap: anywhere;
        }
        .sale-item-source { font-size: 12px; color: var(--text-secondary); }
        .sale-item-source a { color: var(--accent); text-decoration: none; font-weight: 500; }
        .sale-item-source a:hover { text-decoration: underline; }
        .sale-total {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 14px; font-size: 15px; font-weight: 600;
        }
        .sale-total .mono { font-size: 20px; letter-spacing: -0.02em; }
        @media (max-width: 520px) {
          .sale-item { flex-direction: column; gap: 6px; }
          .sale-item-amount { text-align: left; display: flex; justify-content: space-between; align-items: baseline; }
        }
      `}</style>
    </div>
  );
}
