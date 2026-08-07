import type {
  CreateSaleRequest,
  CreateSaleResponse,
  SaleListItem,
  SaleOut,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function createSale(
  payload: CreateSaleRequest
): Promise<CreateSaleResponse> {
  const res = await fetch(`${BASE_URL}/sales/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<CreateSaleResponse>(res);
}

export async function listSales(
  skip = 0,
  limit = 50
): Promise<SaleListItem[]> {
  const res = await fetch(`${BASE_URL}/sales/?skip=${skip}&limit=${limit}`, {
    cache: "no-store",
  });
  return handleResponse<SaleListItem[]>(res);
}

export async function getSale(id: string): Promise<SaleOut> {
  const res = await fetch(`${BASE_URL}/sales/${id}`, { cache: "no-store" });
  return handleResponse<SaleOut>(res);
}

export function receiptUrl(id: string, proforma = false): string {
  const base = `${BASE_URL}/sales/${id}/receipt`;
  return proforma ? `${base}?proforma=true` : base;
}
