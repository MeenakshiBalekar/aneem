// Shapes mirror Qikink's documented Order/Fulfillment API contracts
// (documenter.getpostman.com/view/26157218/2sB3QKqpma — "QIKINK API COPY").
// Confirmed against the real docs: POST /token (form-urlencoded) -> this
// shape; then ClientId + Accesstoken as headers on every other call.
// Qikink has no products/catalog API at all — the Postman collection only
// has Authorization and Orders folders. See mock-data.ts and sync.ts for
// how that's handled (fixtures locally; real catalog data has to come from
// a CSV export, not a sync).
export interface QikinkAuthToken {
  ClientId: string;
  Accesstoken: string;
  expires_in: number;
}

export interface QikinkVariant {
  variant_id: string;
  sku: string;
  size: string;
  color?: string;
  price: number;
  mrp?: number;
  quantity: number; // available stock
  weight_grams?: number;
}

export interface QikinkImage {
  url: string;
  is_primary: boolean;
  alt_text?: string;
}

export interface QikinkProduct {
  product_id: string;
  name: string;
  description: string;
  category: string; // free-text category from Qikink, mapped to our Category slug
  fabric?: string;
  care_instructions?: string;
  base_price: number;
  mrp?: number;
  images: QikinkImage[];
  variants: QikinkVariant[];
  status: "active" | "inactive" | "draft";
  updated_at: string;
}

/** search_from_my_products: 1 means "look this SKU up in my existing
 * Qikink products" (what we use — our catalog is already pushed/designed
 * in Qikink) — designs[] is only required when it's 0. All numeric-looking
 * fields are sent as strings in Qikink's own examples despite being
 * described as "Numeric"/"Number". */
export interface QikinkOrderLineItem {
  search_from_my_products: 1;
  sku: string;
  quantity: string;
  price: string;
}

/** Confirmed against a real example request/response
 * (documenter.getpostman.com/view/26157218/2sB3QKqpma, Create Order). */
export interface QikinkCreateOrderPayload {
  order_number: string; // unique, never reused — our order number as idempotency key
  qikink_shipping: "0" | "1"; // 0 = self-ship, 1 = Qikink handles shipment
  gateway: "COD" | "Prepaid";
  total_order_value: string;
  line_items: QikinkOrderLineItem[];
  shipping_address?: {
    first_name: string;
    last_name?: string;
    address1: string;
    address2?: string;
    phone: string;
    email: string;
    city: string;
    zip: string;
    province: string;
    country_code: string; // ISO 3166-1 alpha-2, e.g. "IN"
  };
}

export interface QikinkCreateOrderResponse {
  message: string;
  order_id: number;
  status_code: string;
}

export interface QikinkFulfillmentUpdate {
  order_id: string;
  order_number: string;
  status: "in_production" | "printed" | "shipped" | "delivered" | "cancelled" | "returned" | "rto";
  tracking_number?: string;
  tracking_url?: string;
  courier_name?: string;
  updated_at: string;
}

export interface QikinkWebhookPayload {
  event: "product.updated" | "inventory.updated" | "order.fulfillment_updated";
  data: QikinkProduct | QikinkFulfillmentUpdate | { sku: string; quantity: number }[];
  signature?: string;
}
