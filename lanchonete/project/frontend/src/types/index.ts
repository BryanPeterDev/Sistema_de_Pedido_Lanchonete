// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "atendente" | "cozinha" | "motoboy";

export type OrderStatus =
  | "recebido"
  | "preparando"
  | "pronto"
  | "a_caminho"
  | "entregue"
  | "cancelado";

export type OrderType = "delivery" | "retirada" | "local";

export type PaymentMethod = "pix" | "cartao" | "dinheiro" | "nao_pago";

export type DeliveryStatus = "pendente" | "saiu_para_entrega" | "entregue";

export type StockOperation = "entrada" | "saida" | "ajuste" | "cancelamento";

// ── Models ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  image_url?: string | null;
  is_available?: boolean;
  is_visible?: boolean;
  is_promotional?: boolean;
  promotional_price?: number | null;
  stock_quantity?: number;
  stock_alert_threshold: number;
  is_low_stock: boolean;
  category: Category;
  created_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product: { id: number; name: string };
  quantity: number;
  unit_price: string;
  notes: string | null;
  subtotal: string;
}

export interface Order {
  id: number;
  status: OrderStatus;
  order_type: OrderType;
  total: string;
  notes: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  payment_method: PaymentMethod;
  items: OrderItem[];
  is_edited: boolean;
  edit_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderList {
  id: number;
  status: OrderStatus;
  order_type: OrderType;
  total: string;
  notes: string | null;
  customer_name: string;
  payment_method: PaymentMethod;
  items: OrderItem[];
  is_edited: boolean;
  edit_note: string | null;
  created_at: string;
}

export interface DeliveryOrderInfo {
  id: number;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  order_type: OrderType;
  status: OrderStatus;
  total: string;
  notes: string | null;
  items: OrderItem[];
}

export interface Delivery {
  id: number;
  order_id: number;
  motoboy_id: number | null;
  status: DeliveryStatus;
  notes: string | null;
  delivered_at: string | null;
  created_at: string;
  order: DeliveryOrderInfo | null;
}

export interface StockLog {
  id: number;
  product_id: number;
  operation: StockOperation;
  delta: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  order_id: number | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// ── Attendant Order (criação de pedido) ───────────────────────────────────────

export interface AttendantOrderPayload {
  items: { product_id: number; quantity: number; notes?: string }[];
  customer_name: string;
  order_type: OrderType;
  payment_method: PaymentMethod;
  notes?: string;
  customer_phone?: string;
  customer_address?: string;
}
