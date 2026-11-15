"use client";

import { useEffect, useState } from "react";

const PREFIX = "dovatech.";

/**
 * A string state that is remembered on this device (localStorage), so staff
 * don't have to retype the same thing for every sale or purchase.
 */
export function useRemembered(key: string, initial = ""): [string, (v: string) => void] {
  const [value, setValue] = useState<string>(initial);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PREFIX + key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setValue(stored);
    } catch {
      /* storage unavailable (private mode) — just don't remember */
    }
  }, [key]);

  const update = (v: string) => {
    setValue(v);
    try {
      window.localStorage.setItem(PREFIX + key, v);
    } catch {
      /* ignore */
    }
  };

  return [value, update];
}

/** Scroll the first visible invalid field into view and focus it. */
export function focusFirstError(): void {
  requestAnimationFrame(() => {
    const fields = Array.from(document.querySelectorAll<HTMLElement>(".input-error"));
    const el = fields.find((f) => f.offsetParent !== null);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  });
}
