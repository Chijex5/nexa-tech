import { listSales } from "@/lib/api";
import { formatNGN } from "@/lib/format";
import { receiptUrl } from "@/lib/api";
import type { SaleListItem } from "@/types";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SalesHistoryPage() {
  let sales: SaleListItem[] = [];
  let fetchError = "";

  try {
    sales = await listSales(0, 100);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load sales.";
  }

  const totalRevenue = sales.reduce((sum, s) => sum + s.subtotal, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="page-sub">{sales.length} total sales recorded</p>
        </div>
        <a href="/new-sale" className="new-sale-link">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Sale
        </a>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Sales</div>
          <div className="stat-value">{sales.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value mono">{formatNGN(totalRevenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg. Sale Value</div>
          <div className="stat-value mono">
            {sales.length > 0 ? formatNGN(totalRevenue / sales.length) : "₦0"}
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="alert-error" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          {fetchError}
        </div>
      )}

      {sales.length === 0 && !fetchError ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
          </svg>
          <p>No sales recorded yet.</p>
          <a href="/new-sale" className="empty-cta">Record your first sale →</a>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="sales-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Staff</th>
                <th>Date</th>
                <th className="right">Amount</th>
                <th className="right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <span className="invoice-num">{sale.invoice_number}</span>
                  </td>
                  <td className="customer-name">{sale.customer_name}</td>
                  <td className="muted-text">{sale.staff_name}</td>
                  <td className="muted-text date-cell">{formatDate(sale.created_at)}</td>
                  <td className="right mono">{formatNGN(sale.subtotal)}</td>
                  <td className="right">
                    <a
                      href={receiptUrl(sale.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-link"
                      aria-label={`Download receipt for ${sale.invoice_number}`}
                      download={`${sale.invoice_number}.pdf`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <path d="M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
          gap: 16px;
        }
        .page-title {
          font-size: 26px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .page-sub {
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .new-sale-link {
          display: flex;
          align-items: center;
          gap: 7px;
          background: var(--accent);
          color: white;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 18px;
          border-radius: var(--radius-md);
          white-space: nowrap;
          transition: opacity 0.15s;
          flex-shrink: 0;
        }
        .new-sale-link:hover { opacity: 0.88; }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }
        .stat-card {
          background: var(--surface-1);
          border: 1px solid var(--navy-border);
          border-radius: var(--radius-md);
          padding: 16px 20px;
        }
        .stat-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .alert-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--danger-dim);
          border: 1px solid var(--danger);
          color: var(--danger);
          font-size: 13px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          margin-bottom: 20px;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 80px 0;
          color: var(--text-muted);
          text-align: center;
        }
        .empty-state p { font-size: 14px; }
        .empty-cta {
          color: var(--accent);
          font-size: 13px;
          text-decoration: none;
          font-weight: 500;
        }
        .empty-cta:hover { text-decoration: underline; }
        .table-wrap {
          background: var(--surface-1);
          border: 1px solid var(--navy-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .sales-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          table-layout: fixed;
        }
        .sales-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
          background: var(--surface-2);
          border-bottom: 1px solid var(--navy-border);
        }
        .sales-table th.right,
        .sales-table td.right {
          text-align: right;
        }
        .sales-table td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(36, 58, 110, 0.4);
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sales-table tbody tr:last-child td {
          border-bottom: none;
        }
        .sales-table tbody tr:hover td {
          background: var(--surface-2);
        }
        .invoice-num {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--accent);
          background: var(--accent-dim);
          padding: 3px 8px;
          border-radius: 4px;
        }
        .customer-name {
          font-weight: 500;
          letter-spacing: 0.01em;
        }
        .muted-text { color: var(--text-secondary); }
        .date-cell { font-size: 12px; }
        .mono { font-family: var(--font-mono); }
        .download-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 12px;
          font-weight: 500;
          padding: 5px 10px;
          border: 1px solid var(--navy-border);
          border-radius: var(--radius-sm);
          transition: color 0.15s, border-color 0.15s, background 0.15s;
        }
        .download-link:hover {
          color: var(--accent);
          border-color: var(--accent);
          background: var(--accent-dim);
        }
        @media (max-width: 640px) {
          .stats-row { grid-template-columns: 1fr; }
          .date-cell, .sales-table th:nth-child(3),
          .sales-table td:nth-child(3) { display: none; }
        }
      `}</style>
    </div>
  );
}
