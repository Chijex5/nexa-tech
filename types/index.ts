export interface SaleItemIn {
  description: string;
  serial: string;
  qty: number;
  unit_price: number;
  is_swap: boolean;
  swap_from_description: string;
  swap_from_serial: string;
}

export interface SaleItemOut {
  description: string;
  serial: string;
  qty: number;
  unit_price: number;
  amount: number;
  is_swap: boolean;
  swap_from_description: string;
  swap_from_serial: string;
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
  staff_name: string;
  subtotal: number;
  created_at: string;
}

export interface CreateSaleResponse {
  message: string;
  sale: SaleOut;
}
