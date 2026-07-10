import "server-only";
import type {
  QikinkAuthToken,
  QikinkCreateOrderPayload,
  QikinkCreateOrderResponse,
  QikinkProduct,
} from "./types";
import { MOCK_QIKINK_PRODUCTS } from "./mock-data";

// Thin, typed wrapper around Qikink's REST API. Every real network call is
// isolated here so the rest of the app never touches fetch() directly for
// Qikink — and so it's obvious exactly where to look when Qikink changes
// their API. When QIKINK_USE_MOCK is true (default until real credentials
// are supplied), every method returns fixture data instead of calling out.

const BASE_URL = process.env.QIKINK_API_BASE_URL ?? "https://sandbox.qikink.com/api";
const CLIENT_ID = process.env.QIKINK_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.QIKINK_CLIENT_SECRET ?? "";

function useMock(): boolean {
  if (process.env.QIKINK_USE_MOCK === "false") return false;
  return process.env.QIKINK_USE_MOCK === "true" || !CLIENT_ID || !CLIENT_SECRET;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const res = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ClientId: CLIENT_ID, client_secret: CLIENT_SECRET }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Qikink auth failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as QikinkAuthToken;
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

async function qikinkFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Qikink API error on ${path}: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

export const qikinkClient = {
  /** Full product catalog, used by the nightly/on-demand full sync. */
  async listProducts(): Promise<QikinkProduct[]> {
    if (useMock()) return MOCK_QIKINK_PRODUCTS;
    return qikinkFetch<QikinkProduct[]>("/products");
  },

  /** Single product lookup, used when a targeted webhook event fires. */
  async getProduct(productId: string): Promise<QikinkProduct | null> {
    if (useMock()) return MOCK_QIKINK_PRODUCTS.find((p) => p.product_id === productId) ?? null;
    return qikinkFetch<QikinkProduct>(`/products/${productId}`);
  },

  /** Pushes a paid/COD-confirmed order to Qikink for production + fulfillment. */
  async createOrder(payload: QikinkCreateOrderPayload): Promise<QikinkCreateOrderResponse> {
    if (useMock()) {
      return { order_id: `qk_order_${payload.order_number}`, status: "received" };
    }
    return qikinkFetch<QikinkCreateOrderResponse>("/orders/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async cancelOrder(qikinkOrderId: string): Promise<{ status: string }> {
    if (useMock()) return { status: "cancelled" };
    return qikinkFetch<{ status: string }>(`/orders/${qikinkOrderId}/cancel`, { method: "POST" });
  },

  isMockMode: useMock,
};
