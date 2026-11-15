import type {
  CreatePurchaseRequest,
  CreateSaleRequest,
  CreateSaleResponse,
  ListFilters,
  PurchaseListPage,
  PurchaseOut,
  SaleListPage,
  SaleOut,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/** Readable label for a field name coming back in a validation error. */
const FIELD_LABELS: Record<string, string> = {
  customer_name: "Customer name",
  customer_phone: "Customer phone",
  seller_name: "Seller name",
  seller_phone: "Seller phone",
  staff_name: "Staff name",
  payment_method: "Payment method",
  purchase_date: "Date",
  description: "Device",
  serial: "Serial / IMEI",
  unit_price: "Price",
  cost_price: "Price",
  qty: "Qty",
};

/** Turn a FastAPI error body into a short message a shop owner can act on. */
function friendlyError(status: number, body: string): string {
  try {
    const data = JSON.parse(body) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      const first = data.detail[0] as { loc?: unknown[]; msg?: string };
      const field = [...(first.loc ?? [])].reverse().find((l) => typeof l === "string" && l !== "body");
      const label = typeof field === "string" ? FIELD_LABELS[field] ?? field : "";
      const msg = (first.msg ?? "is invalid").replace(/^Value error, /, "");
      return label ? `${label}: ${msg}` : msg;
    }
  } catch {
    /* not JSON */
  }
  if (status >= 500) return "The server had a problem. Please try again in a moment.";
  return `Request failed (${status}). Please try again.`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(friendlyError(res.status, body));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { cache: "no-store", ...init });
  } catch {
    throw new Error("Can't reach the server. Check your internet connection and try again.");
  }
  return handleResponse<T>(res);
}

function query(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/* ── Sales ── */

export async function createSale(payload: CreateSaleRequest): Promise<CreateSaleResponse> {
  return request<CreateSaleResponse>("/sales/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function listSales(
  skip = 0,
  limit = 50,
  filters: ListFilters = {},
): Promise<SaleListPage> {
  return request<SaleListPage>(`/sales/${query({ skip, limit, ...filters })}`);
}

export async function getSale(id: string): Promise<SaleOut> {
  return request<SaleOut>(`/sales/${encodeURIComponent(id)}`);
}

export async function getSalePurchases(id: string): Promise<PurchaseOut[]> {
  return request<PurchaseOut[]>(`/sales/${encodeURIComponent(id)}/purchases`);
}

export function receiptUrl(id: string, proforma = false): string {
  const base = `${BASE_URL}/sales/${encodeURIComponent(id)}/receipt`;
  return proforma ? `${base}?proforma=true` : base;
}

export function salesExportUrl(filters: ListFilters = {}): string {
  return `${BASE_URL}/sales/export${query({ ...filters })}`;
}

/* ── Purchases ── */

export async function createPurchase(payload: CreatePurchaseRequest): Promise<PurchaseOut> {
  return request<PurchaseOut>("/purchases/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function listPurchases(
  skip = 0,
  limit = 50,
  filters: ListFilters = {},
): Promise<PurchaseListPage> {
  return request<PurchaseListPage>(`/purchases/${query({ skip, limit, ...filters })}`);
}

export async function getPurchase(id: string): Promise<PurchaseOut> {
  return request<PurchaseOut>(`/purchases/${encodeURIComponent(id)}`);
}

export async function deletePurchase(id: string): Promise<void> {
  return request<void>(`/purchases/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function purchasesExportUrl(filters: ListFilters = {}): string {
  return `${BASE_URL}/purchases/export${query({ ...filters })}`;
}
