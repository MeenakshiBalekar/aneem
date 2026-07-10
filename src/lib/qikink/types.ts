// Shapes mirror Qikink's documented Product/Order/Fulfillment API contracts.
// Keeping these separate from our Prisma models means a Qikink API change
// only touches the mapper in sync.ts, not the rest of the app.

export interface QikinkAuthToken {
  access_token: string;
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

export interface QikinkOrderLineItem {
  sku: string;
  quantity: number;
  price: number;
}

export interface QikinkCreateOrderPayload {
  order_number: string; // our order number, used as idempotency key
  line_items: QikinkOrderLineItem[];
  shipping_address: {
    name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  payment_status: "prepaid" | "cod";
  total_order_value: number;
}

export interface QikinkCreateOrderResponse {
  order_id: string;
  status: string;
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
