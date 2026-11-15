"use client";

import { useState } from "react";

interface MoneyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}

function format(text: string): string {
  const [int, dec] = text.split(".");
  const withCommas = (int || "").replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${withCommas || "0"}.${dec}` : withCommas;
}

function clean(raw: string): string {
  let s = raw.replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return s.slice(0, 13);
}

function toText(value: number): string {
  return value ? format(String(Math.round(value * 100) / 100)) : "";
}

/** Naira amount field that shows thousands separators while typing (1,250,000). */
export default function MoneyInput({ value, onChange, className, ...rest }: MoneyInputProps) {
  const [text, setText] = useState<string>(() => toText(value));
  const [lastValue, setLastValue] = useState<number>(value);

  // Keep in sync when the parent changes the value (e.g. form reset), using
  // React's "adjust state while rendering" pattern rather than an effect.
  if (value !== lastValue) {
    setLastValue(value);
    if ((parseFloat(text.replace(/,/g, "")) || 0) !== value) setText(toText(value));
  }

  return (
    <input
      {...rest}
      className={className}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(e) => {
        const cleaned = clean(e.target.value);
        const next = parseFloat(cleaned) || 0;
        setText(format(cleaned));
        setLastValue(next);
        onChange(next);
      }}
    />
  );
}
