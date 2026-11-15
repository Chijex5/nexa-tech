import Link from "next/link";
import { notFound } from "next/navigation";
import { getPurchase } from "@/lib/api";
import { formatDateTime, formatDay, formatNGN } from "@/lib/format";
import { ErrorAlert } from "@/app/components/ListControls";
import DeletePurchaseButton from "@/app/components/DeletePurchaseButton";
import type { PurchaseOut } from "@/types";

export const dynamic = "force-dynamic";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let purchase: PurchaseOut | null = null;
  let error = "";
  try {
    purchase = await getPurchase(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load purchase.";
    if (/not found/i.test(message)) notFound();
    error = message;
  }

  return (
    <div>
      <Link href="/purchases" className="back-link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Purchase History
      </Link>

      {error && <ErrorAlert message={error} />}

      {purchase && (
        <>
          <div className="page-header">
            <div>
              <p className="page-eyebrow">Purchase</p>
              <h1 className="page-title">{purchase.ref}</h1>
              <p className="page-sub">Bought on {formatDay(purchase.purchase_date)}</p>
            </div>
            <Link href="/new-purchase" className="btn btn-primary">New Purchase</Link>
          </div>

          <section className="card">
            <div className="card-title">Bought from</div>
            <div className="detail-grid">
              <div>
                <div className="detail-label">Seller</div>
                <div className="detail-value">{purchase.seller_name}</div>
              </div>
              <div>
                <div className="detail-label">Phone</div>
                <div className="detail-value mono">
                  <a href={`tel:${purchase.seller_phone.replace(/\s+/g, "")}`}>{purchase.seller_phone}</a>
                </div>
              </div>
              <div>
                <div className="detail-label">Paid by</div>
                <div className="detail-value"><span className="pill pill-accent">{purchase.payment_method}</span></div>
              </div>
              {purchase.staff_name && (
                <div>
                  <div className="detail-label">Bought by</div>
                  <div className="detail-value">{purchase.staff_name}</div>
                </div>
              )}
              {purchase.notes && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="detail-label">Notes</div>
                  <div className="detail-value">{purchase.notes}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 16 }}>
              <Link href={`/purchases?q=${encodeURIComponent(purchase.seller_phone)}`} className="btn btn-secondary">
                See everything bought from this seller
              </Link>
            </div>
          </section>

          <section className="card">
            <div className="card-title">
              Phones <span className="pill">{purchase.items.length}</span>
            </div>
            {purchase.items.map((item, i) => (
              <div className="p-item" key={i}>
                <div className="p-item-main">
                  <div className="cell-main">{item.description}</div>
                  <div className="cell-sub">
                    {[item.serial && `IMEI/SN: ${item.serial}`, item.colour && `Colour: ${item.colour}`]
                      .filter(Boolean)
                      .join(" · ") || "No IMEI recorded"}
                  </div>
                  {item.sold ? (
                    <div className="p-item-sold">
                      <span className="pill pill-accent">Sold{item.sold.is_swap ? " (swap)" : ""}</span>{" "}
                      to{" "}
                      <Link href={`/sales/${item.sold.sale_id}`}>{item.sold.customer_name}</Link>{" "}
                      ({item.sold.customer_phone}) on {formatDateTime(item.sold.sold_at)} ·{" "}
                      <span className="mono">{item.sold.invoice_number}</span>
                      {!item.sold.is_swap && (
                        <>
                          {" "}for <span className="mono">{formatNGN(item.sold.sold_price)}</span>
                        </>
                      )}
                      {item.profit !== null && (
                        <>
                          {" "}· Profit{" "}
                          <span className={`mono ${item.profit >= 0 ? "positive" : "negative"}`}>{formatNGN(item.profit)}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-item-sold">
                      <span className="pill pill-success">In stock</span>
                      {!item.serial && (
                        <span className="cell-sub"> Add the IMEI next time so sales link automatically.</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="mono p-item-price">{formatNGN(item.cost_price)}</div>
              </div>
            ))}
            <div className="p-total">
              <span>Total paid</span>
              <span className="mono">{formatNGN(purchase.total)}</span>
            </div>
          </section>

          <section className="card danger-zone">
            <div>
              <div className="cell-main">Recorded by mistake?</div>
              <div className="cell-sub">Deleting removes this purchase from your records. Sales are not affected.</div>
            </div>
            <DeletePurchaseButton id={purchase.id} label={purchase.ref} />
          </section>
        </>
      )}

      <style>{`
        .p-item { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--navy-border); }
        .p-item:first-of-type { padding-top: 0; }
        .p-item-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .p-item-sold { font-size: 12px; color: var(--text-secondary); overflow-wrap: anywhere; }
        .p-item-sold a { color: var(--accent); text-decoration: none; font-weight: 500; }
        .p-item-sold a:hover { text-decoration: underline; }
        .p-item-price { font-weight: 600; white-space: nowrap; }
        .p-total { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; font-weight: 600; }
        .p-total .mono { font-size: 20px; letter-spacing: -0.02em; }
        .danger-zone { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        @media (max-width: 520px) {
          .p-item { flex-direction: column; gap: 6px; }
          .danger-zone .btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}
