"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { createPurchase, listPurchases } from "@/lib/api";
import { formatDay, formatNGN, todayLagos } from "@/lib/format";
import { focusFirstError, useRemembered } from "@/lib/remember";
import MoneyInput from "@/app/components/MoneyInput";
import type { PurchaseItemIn, PurchaseOut } from "@/types";

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "POS", "USSD", "Crypto"] as const;

interface PhoneRow extends PurchaseItemIn {
  _key: string;
}

function makeKey(): string {
  return Math.random().toString(36).slice(2, 9);
}

function emptyPhone(): PhoneRow {
  return { _key: makeKey(), description: "", serial: "", colour: "", cost_price: 0 };
}

type FormErrors = Partial<Record<string, string>>;

const PHONE_RE = /^\+?[\d\s-]{7,20}$/;

export default function NewPurchasePage() {
  const [sellerName, setSellerName] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [purchaseDate, setPurchaseDate] = useState<string>(() => todayLagos());
  const [staffName, setStaffName] = useRemembered("staffName");
  const [notes, setNotes] = useState("");
  const [phones, setPhones] = useState<PhoneRow[]>([emptyPhone()]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<PurchaseOut | null>(null);
  const [sellerHint, setSellerHint] = useState("");

  const total = phones.reduce((sum, p) => sum + p.cost_price, 0);

  /** Clear a field's error as soon as the user edits it. */
  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const updatePhone = useCallback((key: string, field: keyof PurchaseItemIn, value: string | number) => {
    setPhones((prev) => prev.map((p) => (p._key === key ? { ...p, [field]: value } : p)));
  }, []);

  const removePhone = useCallback((key: string) => {
    setPhones((prev) => (prev.length > 1 ? prev.filter((p) => p._key !== key) : prev));
  }, []);

  /** Returning seller? Fill in their name from the last purchase. */
  const lookupSeller = async () => {
    const phone = sellerPhone.trim();
    if (!PHONE_RE.test(phone)) {
      setSellerHint("");
      return;
    }
    try {
      const page = await listPurchases(0, 1, { q: phone });
      const last = page.items[0];
      if (last) {
        if (!sellerName.trim()) {
          setSellerName(last.seller_name);
          clearError("sellerName");
        }
        setSellerHint(
          `You've bought from ${last.seller_name} ${page.total} time${page.total === 1 ? "" : "s"} before (last on ${formatDay(last.purchase_date)}).`,
        );
      } else {
        setSellerHint("");
      }
    } catch {
      setSellerHint("");
    }
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!sellerName.trim()) e.sellerName = "Enter who you bought from.";
    if (!sellerPhone.trim()) e.sellerPhone = "Enter the seller's phone number.";
    else if (!PHONE_RE.test(sellerPhone.trim())) e.sellerPhone = "Enter a valid phone number.";
    if (!purchaseDate) e.purchaseDate = "Pick the date you bought it.";
    else if (purchaseDate > todayLagos()) e.purchaseDate = "Date can't be in the future.";
    phones.forEach((p, i) => {
      if (!p.description.trim()) e[`desc_${i}`] = "Enter the phone model.";
      if (p.cost_price <= 0) e[`price_${i}`] = "Enter how much you paid.";
    });
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError("");
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      focusFirstError();
      return;
    }
    setLoading(true);
    try {
      const result = await createPurchase({
        seller_name: sellerName.trim(),
        seller_phone: sellerPhone.trim(),
        payment_method: paymentMethod,
        purchase_date: purchaseDate,
        staff_name: staffName.trim(),
        notes: notes.trim(),
        items: phones.map((p) => ({
          description: p.description.trim(),
          serial: p.serial.trim(),
          colour: p.colour.trim(),
          cost_price: p.cost_price,
        })),
      });
      setSaved(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (keepSeller: boolean) => {
    setSaved(null);
    if (!keepSeller) {
      setSellerName("");
      setSellerPhone("");
      setSellerHint("");
      setPaymentMethod("Cash");
    }
    setPurchaseDate(todayLagos());
    setNotes("");
    setPhones([emptyPhone()]);
    setErrors({});
    setApiError("");
  };

  if (saved) {
    return <SavedScreen purchase={saved} onAnother={() => resetForm(false)} onSameSeller={() => resetForm(true)} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Buying</p>
          <h1 className="page-title">New Purchase</h1>
          <p className="page-sub">Record a phone you bought, who you bought it from and how you paid.</p>
        </div>
        <div className="total-badge">
          <span className="total-badge-label">Total paid</span>
          <span className="total-badge-amount">{formatNGN(total)}</span>
        </div>
      </div>

      {apiError && (
        <div className="alert-error" role="alert">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{apiError}</span>
        </div>
      )}

      {/* ── Seller ── */}
      <section className="card">
        <div className="card-title">
          <span className="section-number">01</span>
          Bought From
        </div>
        <div className="form-grid">
          <div className="field">
            <label className="field-label" htmlFor="seller_phone">Seller&apos;s Phone Number</label>
            <input
              id="seller_phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className={`field-input${errors.sellerPhone ? " input-error" : ""}`}
              placeholder="08031234567"
              value={sellerPhone}
              onChange={(e) => { setSellerPhone(e.target.value); clearError("sellerPhone"); }}
              onBlur={lookupSeller}
            />
            {errors.sellerPhone ? (
              <span className="field-error">{errors.sellerPhone}</span>
            ) : sellerHint ? (
              <span className="field-hint" style={{ color: "var(--success)" }}>{sellerHint}</span>
            ) : null}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="seller_name">Seller&apos;s Name</label>
            <input
              id="seller_name"
              autoComplete="off"
              className={`field-input${errors.sellerName ? " input-error" : ""}`}
              placeholder="e.g. Emeka Phones"
              value={sellerName}
              onChange={(e) => { setSellerName(e.target.value); clearError("sellerName"); }}
            />
            {errors.sellerName && <span className="field-error">{errors.sellerName}</span>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="payment_method">How You Paid</label>
            <select
              id="payment_method"
              className="field-input field-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="purchase_date">Date Bought</label>
            <input
              id="purchase_date"
              type="date"
              max={todayLagos()}
              className={`field-input${errors.purchaseDate ? " input-error" : ""}`}
              value={purchaseDate}
              onChange={(e) => { setPurchaseDate(e.target.value); clearError("purchaseDate"); }}
            />
            {errors.purchaseDate && <span className="field-error">{errors.purchaseDate}</span>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="staff_name">
              Bought By <span className="field-optional">(optional)</span>
            </label>
            <input
              id="staff_name"
              className="field-input"
              placeholder="Your name"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="notes">
              Notes <span className="field-optional">(optional)</span>
            </label>
            <input
              id="notes"
              className="field-input"
              placeholder="e.g. UK used, battery 89%"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── Phones ── */}
      <section className="card">
        <div className="card-title">
          <span className="section-number">02</span>
          Phones Bought
          <span className="pill" style={{ marginLeft: "auto" }}>{phones.length}</span>
        </div>

        <div className="phone-list">
          {phones.map((p, i) => (
            <div className="phone-row" key={p._key}>
              <div className="phone-row-head">
                <span className="phone-row-num">Phone {i + 1}</span>
                {phones.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger phone-remove"
                    onClick={() => removePhone(p._key)}
                    aria-label={`Remove phone ${i + 1}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                    Remove
                  </button>
                )}
              </div>
              <div className="phone-grid">
                <div className="field phone-desc">
                  <label className="field-label" htmlFor={`desc_${p._key}`}>Phone / Device</label>
                  <input
                    id={`desc_${p._key}`}
                    className={`field-input${errors[`desc_${i}`] ? " input-error" : ""}`}
                    placeholder="e.g. iPhone 15 Pro Max 256GB"
                    value={p.description}
                    onChange={(e) => { updatePhone(p._key, "description", e.target.value); clearError(`desc_${i}`); }}
                  />
                  {errors[`desc_${i}`] && <span className="field-error">{errors[`desc_${i}`]}</span>}
                </div>
                <div className="field">
                  <label className="field-label" htmlFor={`serial_${p._key}`}>
                    IMEI / Serial <span className="field-optional">(recommended)</span>
                  </label>
                  <input
                    id={`serial_${p._key}`}
                    className="field-input mono"
                    placeholder="e.g. 356789012345678"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={p.serial}
                    onChange={(e) => updatePhone(p._key, "serial", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor={`colour_${p._key}`}>
                    Colour <span className="field-optional">(optional)</span>
                  </label>
                  <input
                    id={`colour_${p._key}`}
                    className="field-input"
                    placeholder="e.g. Black"
                    value={p.colour}
                    onChange={(e) => updatePhone(p._key, "colour", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor={`price_${p._key}`}>Price Paid (₦)</label>
                  <MoneyInput
                    id={`price_${p._key}`}
                    className={`field-input mono${errors[`price_${i}`] ? " input-error" : ""}`}
                    placeholder="0"
                    value={p.cost_price}
                    onChange={(v) => { updatePhone(p._key, "cost_price", v); clearError(`price_${i}`); }}
                  />
                  {errors[`price_${i}`] && <span className="field-error">{errors[`price_${i}`]}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="field-hint" style={{ margin: "4px 0 12px" }}>
          Tip: add the IMEI so that when you sell this phone, the app shows where it came from and your profit.
        </p>

        <button type="button" className="add-row-btn" onClick={() => setPhones((prev) => [...prev, emptyPhone()])}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add another phone from this seller
        </button>
      </section>

      {/* ── Footer ── */}
      <div className="purchase-footer">
        <div className="purchase-total">
          <span>Total paid</span>
          <span className="mono">{formatNGN(total)}</span>
        </div>
        <button type="submit" className="btn btn-primary purchase-submit" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Saving…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Save Purchase
            </>
          )}
        </button>
      </div>

      <style>{purchaseFormStyles}</style>
    </form>
  );
}

function SavedScreen({
  purchase,
  onAnother,
  onSameSeller,
}: {
  purchase: PurchaseOut;
  onAnother: () => void;
  onSameSeller: () => void;
}) {
  const linked = purchase.items.filter((i) => i.sold);
  return (
    <div className="saved-wrap">
      <div className="saved-icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
        </svg>
      </div>
      <p className="saved-eyebrow">Purchase recorded</p>
      <h2 className="saved-title">Saved!</h2>
      <p className="saved-sub">
        <span className="mono">{purchase.ref}</span> · {purchase.seller_name} · {formatNGN(purchase.total)}
      </p>

      {linked.length > 0 && (
        <div className="alert-success" style={{ width: "100%", textAlign: "left" }}>
          <span>
            {linked.length === 1 ? "This phone was" : `${linked.length} of these phones were`} already sold. They&apos;ve been
            linked to the sale so you can see the profit.
          </span>
        </div>
      )}

      <div className="saved-actions">
        <button type="button" className="btn btn-primary" onClick={onSameSeller}>
          Add another from {purchase.seller_name.split(" ")[0] || "this seller"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onAnother}>
          New purchase
        </button>
        <Link href={`/purchases/${purchase.id}`} className="btn btn-secondary">
          View details
        </Link>
      </div>

      <div className="card" style={{ width: "100%", textAlign: "left" }}>
        {purchase.items.map((item, i) => (
          <div className="saved-item" key={i}>
            <div style={{ minWidth: 0 }}>
              <div className="cell-main">{item.description}</div>
              <div className="cell-sub">
                {[item.serial, item.colour].filter(Boolean).join(" · ") || "No IMEI recorded"}
              </div>
            </div>
            <span className="mono">{formatNGN(item.cost_price)}</span>
          </div>
        ))}
        <div className="saved-item" style={{ fontWeight: 600, borderBottom: "none" }}>
          <span>Paid by {purchase.payment_method}</span>
          <span className="mono">{formatNGN(purchase.total)}</span>
        </div>
      </div>

      <style>{`
        .saved-wrap { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 40px 0; max-width: 480px; margin: 0 auto; }
        .saved-icon { width: 58px; height: 58px; border-radius: 50%; background: var(--success-dim); border: 1px solid var(--success); color: var(--success); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .saved-eyebrow { font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--success); margin-bottom: 6px; }
        .saved-title { font-family: var(--font-serif); font-size: 30px; font-weight: 400; margin-bottom: 10px; }
        .saved-sub { font-size: 13px; color: var(--text-secondary); margin-bottom: 24px; overflow-wrap: anywhere; }
        .saved-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; width: 100%; margin-bottom: 24px; }
        .saved-actions .btn { flex: 1 1 140px; }
        .saved-item { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--navy-border); font-size: 13px; }
        .saved-item .mono { white-space: nowrap; }
      `}</style>
    </div>
  );
}

const purchaseFormStyles = `
  .section-number {
    font-family: var(--font-mono); font-size: 11px; font-weight: 500;
    color: var(--accent); background: var(--accent-dim);
    padding: 3px 7px; border-radius: var(--radius-sm); letter-spacing: 0.04em;
  }
  .total-badge {
    display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
    background: var(--surface-1); border: 1px solid var(--navy-border);
    border-top: 3px solid var(--accent); padding: 12px 18px; border-radius: var(--radius-md);
  }
  .total-badge-label { font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
  .total-badge-amount { font-family: var(--font-mono); font-size: 18px; font-weight: 500; letter-spacing: -0.02em; }
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }

  .phone-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 6px; }
  .phone-row {
    background: var(--surface-0); border: 1px solid var(--navy-border);
    border-radius: var(--radius-md); padding: 12px 14px 14px;
  }
  .phone-row-head { display: flex; align-items: center; justify-content: space-between; min-height: 32px; margin-bottom: 8px; }
  .phone-row-num { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
  .phone-remove { min-height: 32px; padding: 4px 12px; font-size: 12px; }
  .phone-grid { display: grid; grid-template-columns: 2fr 1.5fr 1fr 1.2fr; gap: 12px; }
  @container main (max-width: 760px) {
    .phone-grid { grid-template-columns: 1fr 1fr; }
    .phone-desc { grid-column: 1 / -1; }
  }
  @container main (max-width: 420px) {
    .phone-grid { grid-template-columns: 1fr; }
  }

  .add-row-btn {
    display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%;
    background: transparent; border: 1.5px dashed var(--navy-border); color: var(--text-muted);
    font-family: var(--font-display); font-size: 13px; font-weight: 500;
    min-height: 44px; padding: 10px 18px; border-radius: var(--radius-sm); cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .add-row-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }

  .purchase-footer {
    display: flex; align-items: center; justify-content: space-between; gap: 24px;
    padding-top: 8px; flex-wrap: wrap;
  }
  .purchase-total { display: flex; flex-direction: column; font-size: 13px; color: var(--text-muted); }
  .purchase-total .mono { font-size: 22px; color: var(--text-primary); font-weight: 500; letter-spacing: -0.02em; }
  .purchase-submit { min-height: 48px; padding: 12px 28px; font-size: 14px; }
  .spinner {
    width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.35); border-top-color: white;
    border-radius: 50%; animation: spin 0.65s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 640px) {
    .total-badge { display: none; }
    .purchase-footer {
      position: sticky; bottom: 0; z-index: 5;
      margin: 0 -14px; padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
      background: var(--surface-1); border-top: 1px solid var(--navy-border);
      box-shadow: 0 -6px 20px rgba(26, 20, 16, 0.06);
      flex-wrap: nowrap; gap: 12px;
    }
    .purchase-total .mono { font-size: 17px; }
    .purchase-submit { flex: 1; }
  }
`;
