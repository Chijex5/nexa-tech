"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateSaleDate } from "@/lib/api";
import { formatDay, todayLagos } from "@/lib/format";

/**
 * Shows a sale's date with a "Change date" control. Used when a receipt is
 * written late (e.g. sold yesterday, receipt sent today) so the receipt
 * carries the real date of the sale.
 */
export default function SaleDateEditor({ saleId, day }: { saleId: string; day: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(day);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!value) return setError("Pick a date.");
    if (value > todayLagos()) return setError("Date can't be in the future.");
    if (value === day) return setEditing(false);
    setBusy(true);
    setError("");
    try {
      await updateSaleDate(saleId, value);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the date.");
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div className="date-editor">
        <span>{formatDay(day)}</span>
        <button
          type="button"
          className="date-editor-btn"
          onClick={() => {
            setValue(day);
            setError("");
            setEditing(true);
          }}
        >
          Change date
        </button>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="date-editor date-editor--open">
      <label className="field-label" htmlFor="edit_sale_date">Date of sale (shown on the receipt)</label>
      <div className="date-editor-row">
        <input
          id="edit_sale_date"
          type="date"
          className="field-input"
          max={todayLagos()}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
          autoFocus
        />
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </button>
      </div>
      {error && <span className="field-error">{error}</span>}
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .date-editor { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .date-editor--open { flex-direction: column; align-items: stretch; gap: 6px; max-width: 420px; }
  .date-editor-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .date-editor-row .field-input { flex: 1 1 160px; width: auto; }
  .date-editor-btn {
    background: none; border: 1px solid var(--navy-border); border-radius: var(--radius-sm);
    color: var(--accent); font-family: inherit; font-size: 12px; font-weight: 600;
    padding: 4px 10px; min-height: 30px; cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .date-editor-btn:hover { background: var(--accent-dim); border-color: var(--accent); }
`;
