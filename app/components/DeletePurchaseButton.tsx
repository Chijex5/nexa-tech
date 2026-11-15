"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deletePurchase } from "@/lib/api";

export default function DeletePurchaseButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onDelete = async () => {
    if (!window.confirm(`Delete purchase ${label}? This can't be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      await deletePurchase(id);
      router.push("/purchases");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button type="button" className="btn btn-danger" onClick={onDelete} disabled={busy}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
        {busy ? "Deleting…" : "Delete purchase"}
      </button>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
