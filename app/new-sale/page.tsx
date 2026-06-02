"use client";

import { useState, useCallback } from "react";
import { createSale, receiptUrl } from "@/lib/api";
import { formatNGN } from "@/lib/format";
import type { CreateSaleRequest, SaleItemIn, SaleOut } from "@/types";

interface LineItem extends SaleItemIn {
  _key: string;
}

const PAYMENT_METHODS = [
  "Bank Transfer",
  "Cash",
  "POS",
  "USSD",
  "Crypto",
] as const;

function makeKey(): string {
  return Math.random().toString(36).slice(2, 9);
}

function emptyItem(): LineItem {
  return {
    _key: makeKey(),
    description: "",
    serial: "",
    colour: "",
    qty: 1,
    unit_price: 0,
    is_swap: false,
    swap_from_description: "",
    swap_from_serial: "",
    swap_from_colour: "",
  };
}

type FormError = Partial<Record<string, string>>;

function validateForm(
  customerName: string,
  customerPhone: string,
  staffName: string,
  items: LineItem[],
): FormError {
  const errors: FormError = {};
  if (!customerName.trim()) errors.customerName = "Customer name is required.";
  if (!customerPhone.trim()) errors.customerPhone = "Phone number is required.";
  else if (!/^[\d\s+\-]{7,20}$/.test(customerPhone))
    errors.customerPhone = "Enter a valid phone number.";
  if (!staffName.trim()) errors.staffName = "Staff name is required.";
  items.forEach((item, i) => {
    if (!item.description.trim())
      errors[`item_desc_${i}`] = "Description required.";
    if (item.is_swap) {
      if (!item.serial.trim())
        errors[`item_serial_${i}`] = "New device serial is required for swaps.";
      if (!item.swap_from_description.trim())
        errors[`item_swap_desc_${i}`] = "Swap-from device is required.";
      if (!item.swap_from_serial.trim())
        errors[`item_swap_serial_${i}`] = "Swap-from serial is required.";
    }
    if (item.qty < 1) errors[`item_qty_${i}`] = "Min qty is 1.";
    if (item.unit_price <= 0)
      errors[`item_price_${i}`] = "Enter a valid price.";
  });
  return errors;
}

export default function NewSalePage() {
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [staffName, setStaffName] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  const [errors, setErrors] = useState<FormError>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [savedSale, setSavedSale] = useState<SaleOut | null>(null);
  const [apiError, setApiError] = useState<string>("");

  const subtotal = items.reduce(
    (sum, item) => sum + item.qty * item.unit_price,
    0,
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyItem()]);
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) =>
      prev.length > 1 ? prev.filter((i) => i._key !== key) : prev,
    );
  }, []);

  const updateItem = useCallback(
    (key: string, field: keyof SaleItemIn, value: string | number | boolean) => {
      setItems((prev) =>
        prev.map((item) =>
          item._key === key ? { ...item, [field]: value } : item,
        ),
      );
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    setApiError("");
    const errs = validateForm(customerName, customerPhone, staffName, items);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const payload: CreateSaleRequest = {
        customer_name: customerName,
        customer_phone: customerPhone,
        staff_name: staffName,
        payment_method: paymentMethod,
        items: items.map((item) => ({
          description: item.description,
          serial: item.serial,
          colour: item.colour,
          qty: item.qty,
          unit_price: item.unit_price,
          is_swap: item.is_swap,
          swap_from_description: item.is_swap ? item.swap_from_description : "",
          swap_from_serial: item.is_swap ? item.swap_from_serial : "",
          swap_from_colour: item.is_swap ? item.swap_from_colour : "",
        })),
      };
      const result = await createSale(payload);
      setSavedSale(result.sale);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [customerName, customerPhone, staffName, paymentMethod, items]);

  const handleReset = useCallback(() => {
    setSavedSale(null);
    setCustomerName("");
    setCustomerPhone("");
    setStaffName("");
    setPaymentMethod("Bank Transfer");
    setItems([emptyItem()]);
    setErrors({});
    setApiError("");
  }, []);

  if (savedSale) {
    return <SuccessScreen sale={savedSale} onNewSale={handleReset} />;
  }

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Sales</p>
          <h1 className="page-title">New Invoice</h1>
        </div>
        <div className="subtotal-badge">
          <span className="subtotal-label">Running total</span>
          <span className="subtotal-amount">{formatNGN(subtotal)}</span>
        </div>
      </div>

      {apiError && (
        <div className="alert-error" role="alert">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          {apiError}
        </div>
      )}

      {/* ── Customer details ── */}
      <section className="form-section">
        <div className="section-header">
          <span className="section-number">01</span>
          <span className="section-label">Customer Details</span>
        </div>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="customer_name">Full Name</label>
            <input
              id="customer_name"
              className={`field-input${errors.customerName ? " input-error" : ""}`}
              placeholder="Jane Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="off"
            />
            {errors.customerName && <span className="field-error">{errors.customerName}</span>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="customer_phone">Phone Number</label>
            <input
              id="customer_phone"
              className={`field-input${errors.customerPhone ? " input-error" : ""}`}
              placeholder="07023455678"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              type="tel"
            />
            {errors.customerPhone && <span className="field-error">{errors.customerPhone}</span>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="staff_name">Handled By</label>
            <input
              id="staff_name"
              className={`field-input${errors.staffName ? " input-error" : ""}`}
              placeholder="John Smith"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
            />
            {errors.staffName && <span className="field-error">{errors.staffName}</span>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="payment_method">Payment Method</label>
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
        </div>
      </section>

      {/* ── Line items ── */}
      <section className="form-section">
        <div className="section-header">
          <span className="section-number">02</span>
          <span className="section-label">Line Items</span>
          <span className="item-count">{items.length}</span>
        </div>

        {/* Desktop column headers */}
        <div className="items-table-header">
          <span style={{ flex: "2.3" }}>Device</span>
          <span style={{ flex: "1.2" }}>Serial / IMEI</span>
          <span style={{ flex: "1" }}>Colour</span>
          <span style={{ flex: "0.65", textAlign: "center" }}>Qty</span>
          <span style={{ flex: "1.15", textAlign: "right" }}>Unit Price (₦)</span>
          <span style={{ flex: "1.15", textAlign: "right" }}>Amount</span>
          <span style={{ width: "36px" }} />
        </div>

        <div className="items-list">
          {items.map((item, i) => (
            <div key={item._key} className={`item-row${item.is_swap ? " item-row--swap" : ""}`}>

              {/* ══ DESKTOP ══ */}
              <div className="item-row-desktop">
                {/* Swap mode banner — only visible when is_swap */}
                {item.is_swap && (
                  <div className="swap-banner-desktop">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                    </svg>
                    Device Swap
                  </div>
                )}

                <div className="item-row-inner">
                  {/* Description col */}
                  <div className="item-field" style={{ flex: "2.3" }}>
                    <div className="desc-with-toggle">
                      <input
                        className={`field-input item-input${errors[`item_desc_${i}`] ? " input-error" : ""}`}
                        placeholder={item.is_swap ? "New device e.g. iPhone 17 Pro Max 1TB" : "e.g. MacBook Pro M4"}
                        value={item.description}
                        onChange={(e) => updateItem(item._key, "description", e.target.value)}
                      />
                      <button
                        type="button"
                        className={`swap-pill${item.is_swap ? " swap-pill--active" : ""}`}
                        onClick={() => updateItem(item._key, "is_swap", !item.is_swap)}
                        title={item.is_swap ? "Remove swap" : "Mark as device swap"}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                        </svg>
                        {item.is_swap ? "Swap ✓" : "Swap"}
                      </button>
                    </div>
                    {errors[`item_desc_${i}`] && (
                      <span className="field-error">{errors[`item_desc_${i}`]}</span>
                    )}

                    {/* Swap sub-fields — from device */}
                    {item.is_swap && (
                      <div className="swap-subfields">
                        <div className="swap-from-label">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 19V5M5 12l7-7 7 7" />
                          </svg>
                          Trading in
                        </div>
                        <input
                          className={`field-input item-input swap-input${errors[`item_swap_desc_${i}`] ? " input-error" : ""}`}
                          placeholder="Device being traded e.g. iPhone 15 Pro 256GB"
                          value={item.swap_from_description}
                          onChange={(e) => updateItem(item._key, "swap_from_description", e.target.value)}
                        />
                        <input
                          className={`field-input item-input swap-input${errors[`item_swap_serial_${i}`] ? " input-error" : ""}`}
                          placeholder="Trade-in serial / IMEI"
                          value={item.swap_from_serial}
                          onChange={(e) => updateItem(item._key, "swap_from_serial", e.target.value)}
                        />
                        <input
                          className="field-input item-input swap-input"
                          placeholder="Trade-in colour"
                          value={item.swap_from_colour}
                          onChange={(e) => updateItem(item._key, "swap_from_colour", e.target.value)}
                        />
                        {(errors[`item_swap_desc_${i}`] || errors[`item_swap_serial_${i}`]) && (
                          <span className="field-error">
                            {errors[`item_swap_desc_${i}`] ?? errors[`item_swap_serial_${i}`]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Serial col */}
                  <div className="item-field" style={{ flex: "1.2" }}>
                    <input
                      className={`field-input item-input${errors[`item_serial_${i}`] ? " input-error" : ""}`}
                      placeholder={item.is_swap ? "New serial / IMEI" : "SN:12345 (opt.)"}
                      value={item.serial}
                      onChange={(e) => updateItem(item._key, "serial", e.target.value)}
                    />
                    {errors[`item_serial_${i}`] && (
                      <span className="field-error">{errors[`item_serial_${i}`]}</span>
                    )}
                  </div>

                  {/* Colour col */}
                  <div className="item-field" style={{ flex: "1" }}>
                    <input
                      className="field-input item-input"
                      placeholder="e.g. Black"
                      value={item.colour}
                      onChange={(e) => updateItem(item._key, "colour", e.target.value)}
                    />
                  </div>

                  {/* Qty col */}
                  <div className="item-field" style={{ flex: "0.65" }}>
                    <input
                      className={`field-input item-input text-center${errors[`item_qty_${i}`] ? " input-error" : ""}`}
                      type="number"
                      value={item.qty === 0 ? "" : item.qty}
                      onChange={(e) =>
                        updateItem(item._key, "qty", parseInt(e.target.value) || 0)
                      }
                      onBlur={(e) => {
                        const v = parseInt(e.target.value);
                        if (!v || v < 1) updateItem(item._key, "qty", 1);
                      }}
                    />
                  </div>

                  {/* Price col */}
                  <div className="item-field" style={{ flex: "1.15" }}>
                    <input
                      className={`field-input item-input text-right${errors[`item_price_${i}`] ? " input-error" : ""}`}
                      type="number"
                      min={0}
                      step={100}
                      placeholder="0"
                      value={item.unit_price === 0 ? "" : item.unit_price}
                      onChange={(e) =>
                        updateItem(item._key, "unit_price", parseFloat(e.target.value) || 0)
                      }
                    />
                    {errors[`item_price_${i}`] && (
                      <span className="field-error">{errors[`item_price_${i}`]}</span>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="item-amount" style={{ flex: "1.15" }}>
                    {formatNGN(item.qty * item.unit_price)}
                  </div>

                  {/* Remove */}
                  <button
                    className="remove-btn"
                    onClick={() => removeItem(item._key)}
                    aria-label={`Remove item ${i + 1}`}
                    disabled={items.length === 1}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ══ MOBILE ══ */}
              <div className="item-row-mobile">
                {/* Swap mode header bar */}
                {item.is_swap && (
                  <div className="swap-banner-mobile">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                    </svg>
                    Device Swap
                  </div>
                )}

                {/* Top row: description + remove */}
                <div className="mobile-item-top">
                  <div className="field" style={{ flex: 1 }}>
                    <div className="mobile-label-row">
                      <label className="field-label">{item.is_swap ? "New Device" : "Device"}</label>
                      <button
                        type="button"
                        className={`swap-pill${item.is_swap ? " swap-pill--active" : ""}`}
                        onClick={() => updateItem(item._key, "is_swap", !item.is_swap)}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                        </svg>
                        {item.is_swap ? "Swap ✓" : "Swap"}
                      </button>
                    </div>
                    <input
                      className={`field-input${errors[`item_desc_${i}`] ? " input-error" : ""}`}
                      placeholder={item.is_swap ? "e.g. iPhone 17 Pro Max 1TB" : "e.g. MacBook Pro M4"}
                      value={item.description}
                      onChange={(e) => updateItem(item._key, "description", e.target.value)}
                    />
                    {errors[`item_desc_${i}`] && <span className="field-error">{errors[`item_desc_${i}`]}</span>}
                  </div>
                  <button
                    className="remove-btn remove-btn-mobile"
                    onClick={() => removeItem(item._key)}
                    aria-label={`Remove item ${i + 1}`}
                    disabled={items.length === 1}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Serial */}
                <div className="field">
                  <label className="field-label">New Serial / IMEI{item.is_swap ? "" : " (optional)"}</label>
                  <input
                    className={`field-input${errors[`item_serial_${i}`] ? " input-error" : ""}`}
                    placeholder={item.is_swap ? "New serial / IMEI" : "SN:12345"}
                    value={item.serial}
                    onChange={(e) => updateItem(item._key, "serial", e.target.value)}
                  />
                  {errors[`item_serial_${i}`] && <span className="field-error">{errors[`item_serial_${i}`]}</span>}
                </div>

                {/* Colour */}
                <div className="field">
                  <label className="field-label">Colour</label>
                  <input
                    className="field-input"
                    placeholder="e.g. Black"
                    value={item.colour}
                    onChange={(e) => updateItem(item._key, "colour", e.target.value)}
                  />
                </div>

                {/* Swap-from sub-card */}
                {item.is_swap && (
                  <div className="mobile-swap-subcard">
                    <div className="swap-from-label">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      </svg>
                      Trading in
                    </div>
                    <div className="field">
                      <label className="field-label">Device</label>
                      <input
                        className={`field-input${errors[`item_swap_desc_${i}`] ? " input-error" : ""}`}
                        placeholder="e.g. iPhone 15 Pro 256GB"
                        value={item.swap_from_description}
                        onChange={(e) => updateItem(item._key, "swap_from_description", e.target.value)}
                      />
                      {errors[`item_swap_desc_${i}`] && <span className="field-error">{errors[`item_swap_desc_${i}`]}</span>}
                    </div>
                    <div className="field">
                      <label className="field-label">Serial / IMEI</label>
                      <input
                        className={`field-input${errors[`item_swap_serial_${i}`] ? " input-error" : ""}`}
                        placeholder="Trade-in serial / IMEI"
                        value={item.swap_from_serial}
                        onChange={(e) => updateItem(item._key, "swap_from_serial", e.target.value)}
                      />
                      {errors[`item_swap_serial_${i}`] && <span className="field-error">{errors[`item_swap_serial_${i}`]}</span>}
                    </div>
                    <div className="field">
                      <label className="field-label">Colour</label>
                      <input
                        className="field-input"
                        placeholder="Trade-in colour"
                        value={item.swap_from_colour}
                        onChange={(e) => updateItem(item._key, "swap_from_colour", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Qty / Price / Amount row */}
                <div className="mobile-item-row">
                  <div className="field" style={{ flex: "0 0 76px" }}>
                    <label className="field-label">Qty</label>
                    <input
                      className={`field-input text-center${errors[`item_qty_${i}`] ? " input-error" : ""}`}
                      type="number"
                      value={item.qty === 0 ? "" : item.qty}
                      onChange={(e) =>
                        updateItem(item._key, "qty", parseInt(e.target.value) || 0)
                      }
                      onBlur={(e) => {
                        const v = parseInt(e.target.value);
                        if (!v || v < 1) updateItem(item._key, "qty", 1);
                      }}
                    />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">Unit Price (₦)</label>
                    <input
                      className={`field-input text-right${errors[`item_price_${i}`] ? " input-error" : ""}`}
                      type="number"
                      min={0}
                      step={100}
                      placeholder="0"
                      value={item.unit_price === 0 ? "" : item.unit_price}
                      onChange={(e) =>
                        updateItem(item._key, "unit_price", parseFloat(e.target.value) || 0)
                      }
                    />
                    {errors[`item_price_${i}`] && <span className="field-error">{errors[`item_price_${i}`]}</span>}
                  </div>
                  <div className="mobile-amount-block">
                    <span className="field-label">Amount</span>
                    <span className="mobile-amount-value">{formatNGN(item.qty * item.unit_price)}</span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

        <button className="add-item-btn" onClick={addItem}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add another item
        </button>
      </section>

      {/* ── Footer ── */}
      <div className="form-footer">
        <div className="total-summary">
          <div className="total-row">
            <span className="total-label">Subtotal</span>
            <span className="total-value">{formatNGN(subtotal)}</span>
          </div>
          <div className="total-row">
            <span className="total-label">VAT</span>
            <span className="total-value muted">₦0.00</span>
          </div>
          <div className="total-divider" />
          <div className="total-row total-final">
            <span>Total</span>
            <span>{formatNGN(subtotal)}</span>
          </div>
        </div>

        <button className="submit-btn" onClick={handleSubmit} disabled={loading} aria-busy={loading}>
          {loading ? (
            <><span className="spinner" aria-hidden="true" />Generating…</>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
              Save &amp; Generate Invoice
            </>
          )}
        </button>
      </div>

      <style>{`
        /* ── Header ── */
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 32px;
          gap: 16px;
        }
        .page-eyebrow {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 4px;
        }
        .page-title {
          font-family: var(--font-serif);
          font-size: 34px;
          font-weight: 400;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          line-height: 1.1;
        }
        .subtotal-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          background: var(--surface-1);
          border: 1px solid var(--navy-border);
          border-top: 3px solid var(--accent);
          padding: 12px 18px;
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }
        .subtotal-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .subtotal-amount {
          font-family: var(--font-mono);
          font-size: 18px;
          font-weight: 500;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .alert-error {
          display: flex;
          align-items: center;
          gap: 9px;
          background: var(--danger-dim);
          border: 1px solid var(--danger);
          border-left: 3px solid var(--danger);
          color: var(--danger);
          font-size: 13px;
          padding: 11px 14px;
          border-radius: var(--radius-md);
          margin-bottom: 24px;
        }

        /* ── Sections ── */
        .form-section {
          background: var(--surface-1);
          border: 1px solid var(--navy-border);
          border-radius: var(--radius-lg);
          padding: 24px;
          margin-bottom: 16px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--navy-border);
        }
        .section-number {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 500;
          color: var(--accent);
          background: var(--accent-dim);
          padding: 3px 7px;
          border-radius: var(--radius-sm);
          letter-spacing: 0.04em;
        }
        .section-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .item-count {
          margin-left: auto;
          font-family: var(--font-mono);
          font-size: 11px;
          background: var(--surface-2);
          color: var(--text-muted);
          padding: 3px 9px;
          border-radius: 99px;
          font-weight: 500;
        }

        /* ── Field grid ── */
        .field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.02em;
        }
        .field-input {
          background: var(--surface-0);
          border: 1px solid var(--navy-border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          padding: 10px 13px;
          font-size: 14px;
          font-family: var(--font-display);
          width: 100%;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .field-input:hover { border-color: #c9b8a6; background: var(--surface-1); }
        .field-input:focus {
          outline: none;
          border-color: var(--accent);
          background: var(--surface-1);
          box-shadow: 0 0 0 3px var(--accent-dim);
        }
        .field-input::placeholder { color: var(--text-muted); font-weight: 300; }
        .input-error { border-color: var(--danger) !important; box-shadow: 0 0 0 3px var(--danger-dim) !important; }
        .field-select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239e8e7e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 13px center;
          padding-right: 34px;
        }
        .field-error { font-size: 11px; color: var(--danger); font-weight: 500; }

        /* ── Items table header ── */
        .items-table-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px 10px;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .items-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }

        /* ── Item row ── */
        .item-row {
          background: var(--surface-0);
          border: 1px solid var(--navy-border);
          border-radius: var(--radius-sm);
          transition: border-color 0.15s;
          overflow: hidden;
        }
        .item-row:hover { border-color: #c9b8a6; }

        /* Swap mode: amber left border + warm tint */
        .item-row--swap {
          border-color: rgba(196, 124, 26, 0.4);
          background: rgba(196, 124, 26, 0.03);
        }
        .item-row--swap:hover { border-color: rgba(196, 124, 26, 0.65); }

        /* ── Desktop layout ── */
        .item-row-desktop { display: block; }
        .item-row-mobile  { display: none; }

        /* Swap banner strip — desktop */
        .swap-banner-desktop {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: rgba(196, 124, 26, 0.08);
          border-bottom: 1px solid rgba(196, 124, 26, 0.18);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--warning);
        }

        .item-row-inner {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px;
        }
        .item-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* Description cell: input + swap pill side by side */
        .desc-with-toggle {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .desc-with-toggle .item-input {
          flex: 1;
        }

        /* ── Swap pill button ── */
        .swap-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          padding: 5px 10px;
          border-radius: 99px;
          border: 1px solid var(--navy-border);
          background: var(--surface-1);
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .swap-pill:hover {
          border-color: var(--warning);
          color: var(--warning);
          background: rgba(196, 124, 26, 0.06);
        }
        .swap-pill--active {
          border-color: rgba(196, 124, 26, 0.5);
          background: rgba(196, 124, 26, 0.10);
          color: var(--warning);
        }
        .swap-pill--active:hover {
          background: rgba(196, 124, 26, 0.18);
        }

        /* ── Swap sub-fields (desktop) ── */
        .swap-subfields {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 8px;
          padding: 10px 12px;
          background: rgba(196, 124, 26, 0.05);
          border: 1px solid rgba(196, 124, 26, 0.18);
          border-radius: var(--radius-sm);
        }
        .swap-from-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--warning);
          margin-bottom: 4px;
        }
        .swap-input {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid rgba(196, 124, 26, 0.25) !important;
          border-radius: 0 !important;
          padding: 5px 2px !important;
          font-size: 12px;
          box-shadow: none !important;
          color: var(--text-secondary) !important;
        }
        .swap-input:focus {
          border-bottom-color: var(--warning) !important;
          box-shadow: none !important;
        }
        .swap-input::placeholder { color: var(--text-muted) !important; }

        /* ── Inline item inputs ── */
        .item-input {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid var(--navy-border) !important;
          border-radius: 0 !important;
          padding: 6px 4px !important;
          font-size: 13px;
          box-shadow: none !important;
        }
        .item-input:focus {
          border-bottom-color: var(--accent) !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        .item-input.input-error {
          border-bottom-color: var(--danger) !important;
          box-shadow: none !important;
        }
        .text-center { text-align: center; }
        .text-right  { text-align: right; }

        .item-amount {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          text-align: right;
          padding-top: 8px;
          white-space: nowrap;
        }
        .remove-btn {
          width: 30px;
          height: 32px;
          margin-top: 2px;
          flex-shrink: 0;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .remove-btn:hover:not(:disabled) {
          background: var(--danger-dim);
          border-color: var(--danger);
          color: var(--danger);
        }
        .remove-btn:disabled { opacity: 0.25; cursor: not-allowed; }

        /* ── Add item ── */
        .add-item-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          background: transparent;
          border: 1.5px dashed var(--navy-border);
          color: var(--text-muted);
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 500;
          padding: 10px 18px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          width: 100%;
          justify-content: center;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
          letter-spacing: 0.01em;
        }
        .add-item-btn:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-dim);
        }

        /* ── Footer ── */
        .form-footer {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 32px;
          padding-top: 12px;
          margin-top: 8px;
        }
        .total-summary { display: flex; flex-direction: column; gap: 6px; min-width: 260px; }
        .total-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-secondary); }
        .total-label { color: var(--text-muted); }
        .total-value { font-family: var(--font-mono); font-size: 13px; font-weight: 500; }
        .muted { color: var(--text-muted); }
        .total-divider { height: 1px; background: var(--navy-border); margin: 6px 0; }
        .total-final { font-family: var(--font-mono); font-size: 20px; font-weight: 500; color: var(--text-primary); letter-spacing: -0.02em; }

        .submit-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          background: var(--accent);
          border: none;
          color: white;
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          padding: 14px 28px;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
          white-space: nowrap;
          letter-spacing: 0.01em;
          box-shadow: 0 2px 12px rgba(232, 98, 44, 0.3);
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.92; box-shadow: 0 4px 20px rgba(232, 98, 44, 0.4); transform: translateY(-1px); }
        .submit-btn:active:not(:disabled) { transform: scale(0.98) translateY(0); box-shadow: 0 1px 6px rgba(232, 98, 44, 0.25); }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ══ MOBILE ══ */
        @media (max-width: 640px) {
          .page-title { font-size: 26px; }
          .subtotal-badge { padding: 10px 14px; }
          .subtotal-amount { font-size: 15px; }
          .form-section { padding: 16px; }
          .field-grid { grid-template-columns: 1fr; gap: 14px; }
          .items-table-header { display: none; }
          .item-row-desktop { display: none; }
          .item-row-mobile {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          /* Swap banner — mobile full-width strip */
          .swap-banner-mobile {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 7px 14px;
            background: rgba(196, 124, 26, 0.08);
            border-bottom: 1px solid rgba(196, 124, 26, 0.18);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.09em;
            text-transform: uppercase;
            color: var(--warning);
            margin: 0;
          }

          /* Padding for mobile card content below banner */
          .item-row-mobile > *:not(.swap-banner-mobile):first-child,
          .item-row-mobile > .mobile-item-top {
            padding-top: 0;
          }

          /* Give the mobile card content proper padding */
          .mobile-item-top,
          .item-row-mobile > .field,
          .mobile-item-row,
          .mobile-swap-subcard {
            padding-left: 14px;
            padding-right: 14px;
          }
          .item-row-mobile > .field { padding-left: 14px; padding-right: 14px; }

          /* First & last child padding */
          .item-row-mobile > *:first-child { padding-top: 14px; }
          .item-row-mobile > *:last-child  { padding-bottom: 14px; }
          .swap-banner-mobile + * { padding-top: 14px; }

          .mobile-item-top {
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }
          .mobile-label-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 2px;
          }
          .remove-btn-mobile {
            margin-top: 22px;
            flex-shrink: 0;
          }
          .mobile-item-row {
            display: flex;
            align-items: flex-end;
            gap: 10px;
          }
          .mobile-amount-block {
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex-shrink: 0;
            text-align: right;
          }
          .mobile-amount-value {
            font-family: var(--font-mono);
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            white-space: nowrap;
            padding-bottom: 10px;
          }

          /* Trade-in sub-card on mobile */
          .mobile-swap-subcard {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 12px 14px;
            background: rgba(196, 124, 26, 0.05);
            border-top: 1px solid rgba(196, 124, 26, 0.15);
            border-bottom: 1px solid rgba(196, 124, 26, 0.15);
          }
          .mobile-swap-subcard .swap-from-label { margin-bottom: 2px; }

          .form-footer { flex-direction: column; align-items: stretch; gap: 20px; }
          .total-summary { min-width: 0; width: 100%; }
          .submit-btn { width: 100%; justify-content: center; padding: 16px; font-size: 15px; }
        }
      `}</style>
    </div>
  );
}

function SuccessScreen({ sale, onNewSale }: { sale: SaleOut; onNewSale: () => void }) {
  return (
    <div className="success-wrap">
      <div className="success-icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
        </svg>
      </div>
      <p className="success-eyebrow">Invoice created</p>
      <h2 className="success-title">Sale Saved!</h2>
      <p className="success-sub">
        <span className="mono">{sale.invoice_number}</span> &middot; {sale.customer_name} &middot; {formatNGN(sale.subtotal)}
      </p>

      <div className="success-actions">
        <a href={receiptUrl(sale.id)} target="_blank" rel="noopener noreferrer" className="btn-receipt" download={`${sale.invoice_number}.pdf`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" />
          </svg>
          Download Receipt PDF
        </a>
        <button className="btn-new" onClick={onNewSale}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Sale
        </button>
      </div>

      <div className="sale-summary-card">
        <div className="summary-meta">
          <div className="summary-row"><span>Invoice No</span><span className="mono">{sale.invoice_number}</span></div>
          <div className="summary-row"><span>Date</span><span>{sale.invoice_date}</span></div>
          <div className="summary-row"><span>Handled by</span><span>{sale.staff_name}</span></div>
          <div className="summary-row">
            <span>Payment</span>
            <span className="payment-pill">{sale.payment_method}</span>
          </div>
        </div>
        <div className="summary-divider" />
        <div className="summary-items">
          {sale.items.map((item, i) => (
            <div className="summary-item" key={i}>
              <div className="summary-item-name">
                <span>{item.description}</span>
                {item.colour && <span className="summary-serial">Colour: {item.colour}</span>}
                {item.is_swap ? (
                  <span className="summary-swap">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline", verticalAlign: "middle", marginRight: "3px" }}>
                      <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
                    </svg>
                    Trade-in: {item.swap_from_description} · {item.swap_from_serial}
                    {item.swap_from_colour ? ` · ${item.swap_from_colour}` : ""}
                  </span>
                ) : item.serial ? (
                  <span className="summary-serial">{item.serial}</span>
                ) : null}
              </div>
              <div className="summary-item-right">
                {item.is_swap && <span className="swap-badge-sm">Swap</span>}
                <span className="summary-qty">×{item.qty}</span>
                <span className="mono">{formatNGN(item.amount)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="summary-divider" />
        <div className="summary-total-row">
          <span>Total</span>
          <span className="mono summary-total-amount">{formatNGN(sale.subtotal)}</span>
        </div>
      </div>

      <style>{`
        .success-wrap {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 48px 0 40px; max-width: 460px; margin: 0 auto;
        }
        .success-icon {
          width: 58px; height: 58px; border-radius: 50%;
          background: var(--success-dim); border: 1px solid var(--success); color: var(--success);
          display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
        }
        .success-eyebrow {
          font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--success); margin-bottom: 6px;
        }
        .success-title {
          font-family: var(--font-serif); font-size: 30px; font-weight: 400;
          letter-spacing: -0.01em; margin-bottom: 10px; color: var(--text-primary);
        }
        .success-sub { font-size: 13px; color: var(--text-secondary); margin-bottom: 28px; line-height: 1.5; }
        .success-actions {
          display: flex; gap: 10px; margin-bottom: 32px;
          flex-wrap: wrap; justify-content: center; width: 100%;
        }
        .btn-receipt {
          display: flex; align-items: center; gap: 8px;
          background: var(--accent); border: none; color: white;
          font-family: var(--font-display); font-size: 13px; font-weight: 600;
          padding: 11px 22px; border-radius: var(--radius-md); cursor: pointer;
          text-decoration: none; transition: opacity 0.15s, transform 0.1s;
          box-shadow: 0 2px 12px rgba(232, 98, 44, 0.28); flex: 1; justify-content: center;
        }
        .btn-receipt:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-new {
          display: flex; align-items: center; gap: 8px;
          background: var(--surface-1); border: 1px solid var(--navy-border);
          color: var(--text-secondary); font-family: var(--font-display);
          font-size: 13px; font-weight: 500; padding: 11px 22px;
          border-radius: var(--radius-md); cursor: pointer;
          transition: border-color 0.15s, color 0.15s; flex: 1; justify-content: center;
        }
        .btn-new:hover { border-color: var(--text-muted); color: var(--text-primary); }
        .sale-summary-card {
          background: var(--surface-1); border: 1px solid var(--navy-border);
          border-radius: var(--radius-lg); padding: 20px 22px; width: 100%; text-align: left;
        }
        .summary-meta { display: flex; flex-direction: column; gap: 4px; }
        .summary-row {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 13px; color: var(--text-secondary); padding: 5px 0;
        }
        .summary-row span:first-child { color: var(--text-muted); }
        .payment-pill {
          background: var(--accent-dim); color: var(--accent);
          border: 1px solid rgba(232,98,44,0.2);
          font-size: 11px; font-weight: 600; padding: 2px 10px;
          border-radius: 99px; letter-spacing: 0.03em;
        }
        .summary-divider { height: 1px; background: var(--navy-border); margin: 12px 0; }
        .summary-items { display: flex; flex-direction: column; gap: 10px; }
        .summary-item {
          display: flex; justify-content: space-between;
          align-items: flex-start; gap: 12px; font-size: 13px;
        }
        .summary-item-name {
          color: var(--text-primary); display: flex; flex-direction: column;
          gap: 3px; min-width: 0; word-break: break-word;
        }
        .summary-serial { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
        .summary-swap {
          font-size: 11px; color: var(--warning);
          background: rgba(196, 124, 26, 0.08);
          border: 1px solid rgba(196, 124, 26, 0.18);
          border-radius: var(--radius-sm);
          padding: 3px 7px; line-height: 1.5;
        }
        .summary-item-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .summary-qty { font-size: 12px; color: var(--text-muted); }
        .swap-badge-sm {
          font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
          background: rgba(196, 124, 26, 0.1); color: var(--warning);
          border: 1px solid rgba(196, 124, 26, 0.25);
          padding: 2px 7px; border-radius: 99px;
        }
        .summary-total-row {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 15px; font-weight: 600; color: var(--text-primary);
        }
        .summary-total-amount { font-size: 20px; letter-spacing: -0.02em; }
        .mono { font-family: var(--font-mono); }
        @media (max-width: 640px) {
          .success-wrap { padding: 32px 0 32px; }
          .success-title { font-size: 26px; }
        }
      `}</style>
    </div>
  );
}
