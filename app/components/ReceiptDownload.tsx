"use client";

import { useState } from "react";
import { receiptUrl } from "@/lib/api";

interface ReceiptDownloadProps {
  id: string;
  invoiceNumber: string;
  variant?: "panel" | "row";
}

const DownloadIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5M12 15V3" />
  </svg>
);

export default function ReceiptDownload({
  id,
  invoiceNumber,
  variant = "row",
}: ReceiptDownloadProps) {
  const [proforma, setProforma] = useState<boolean>(false);
  const href = receiptUrl(id, proforma);
  const filename = `${invoiceNumber}${proforma ? "-proforma" : ""}.pdf`;

  return (
    <div className={`receipt-dl receipt-dl-${variant}`}>
      <div className="receipt-toggle" role="group" aria-label="Invoice type">
        <button
          type="button"
          className={!proforma ? "active" : ""}
          aria-pressed={!proforma}
          onClick={() => setProforma(false)}
        >
          Paid
        </button>
        <button
          type="button"
          className={proforma ? "active" : ""}
          aria-pressed={proforma}
          onClick={() => setProforma(true)}
        >
          Proforma
        </button>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="receipt-dl-link"
        aria-label={`Download ${proforma ? "proforma invoice" : "paid receipt"} for ${invoiceNumber}`}
        download={filename}
      >
        <DownloadIcon size={variant === "panel" ? 15 : 14} />
        {variant === "panel"
          ? `Download ${proforma ? "Proforma Invoice" : "Receipt"} PDF`
          : "PDF"}
      </a>

      <style>{`
        .receipt-dl {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .receipt-dl-panel { flex-direction: column; width: 100%; gap: 12px; }
        .receipt-dl-row { justify-content: flex-end; }

        .receipt-toggle {
          display: inline-flex;
          border: 1px solid var(--navy-border);
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--surface-2);
        }
        .receipt-toggle button {
          appearance: none;
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--text-muted);
          font-family: inherit;
          font-weight: 600;
          letter-spacing: 0.02em;
          transition: background 0.15s, color 0.15s;
        }
        .receipt-dl-row .receipt-toggle button { font-size: 11px; padding: 4px 9px; }
        .receipt-dl-panel .receipt-toggle button { font-size: 13px; padding: 8px 20px; }
        .receipt-toggle button + button { border-left: 1px solid var(--navy-border); }
        .receipt-toggle button.active {
          background: var(--accent);
          color: #fff;
        }

        .receipt-dl-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.15s, transform 0.1s, color 0.15s, border-color 0.15s, background 0.15s;
        }
        .receipt-dl-row .receipt-dl-link {
          color: var(--text-secondary);
          font-size: 12px;
          padding: 5px 10px;
          border: 1px solid var(--navy-border);
          border-radius: var(--radius-sm);
        }
        .receipt-dl-row .receipt-dl-link:hover {
          color: var(--accent);
          border-color: var(--accent);
          background: var(--accent-dim);
        }
        .receipt-dl-panel .receipt-dl-link {
          justify-content: center;
          width: 100%;
          background: var(--accent);
          color: #fff;
          font-size: 13px;
          padding: 11px 22px;
          border-radius: var(--radius-md);
          box-shadow: 0 2px 12px rgba(232, 98, 44, 0.28);
        }
        .receipt-dl-panel .receipt-dl-link:hover { opacity: 0.9; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
