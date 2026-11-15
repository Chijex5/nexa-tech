export interface SwapDevice {
  description: string;
  serial: string;
  colour: string;
}

export interface SaleItemIn {
  description: string;
  serial: string;
  colour: string;
  qty: number;
  unit_price: number;
  is_swap: boolean;
  swap_from_devices: SwapDevice[];
}

export interface SaleItemOut {
  description: string;
  serial: string;
  colour: string;
  qty: number;
  unit_price: number;
  amount: number;
  is_swap: boolean;
  swap_from_devices: SwapDevice[];
}

export interface CreateSaleRequest {
  customer_name: string;
  customer_phone: string;
  staff_name: string;
  payment_method: string;
  items: SaleItemIn[];
}

export interface SaleOut {
  id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_phone: string;
  staff_name: string;
  payment_method: string;
  items: SaleItemOut[];
  subtotal: number;
  created_at: string;
}

export interface SaleListItem {
  id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_phone: string;
  staff_name: string;
  payment_method: string;
  items_summary: string;
  item_count: number;
  has_swap: boolean;
  subtotal: number;
  created_at: string;
}

export interface SaleListPage {
  items: SaleListItem[];
  total: number;
  total_amount: number;
  skip: number;
  limit: number;
}

/* ── Purchases: phones bought in from sellers ── */

export interface PurchaseItemIn {
  description: string;
  serial: string;
  colour: string;
  cost_price: number;
}

export interface CreatePurchaseRequest {
  seller_name: string;
  seller_phone: string;
  payment_method: string;
  purchase_date: string;
  staff_name: string;
  notes: string;
  items: PurchaseItemIn[];
}

export interface PurchaseSoldInfo {
  sale_id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  sold_price: number;
  is_swap: boolean;
  sold_at: string;
}

export interface PurchaseItemOut {
  description: string;
  serial: string;
  colour: string;
  cost_price: number;
  sold: PurchaseSoldInfo | null;
  profit: number | null;
}

export interface PurchaseOut {
  id: string;
  ref: string;
  seller_name: string;
  seller_phone: string;
  payment_method: string;
  purchase_date: string;
  staff_name: string;
  notes: string;
  items: PurchaseItemOut[];
  total: number;
  created_at: string;
}

export interface PurchaseListPage {
  items: PurchaseOut[];
  total: number;
  total_amount: number;
  phone_count: number;
  in_stock: number;
  profit: number;
  skip: number;
  limit: number;
}

export interface ListFilters {
  q?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
}

export interface CreateSaleResponse {
  message: string;
  sale: SaleOut;
}
