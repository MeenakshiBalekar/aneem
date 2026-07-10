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

function isMockConfigured(): boolean {
  if (process.env.QIKINK_USE_MOCK === "false") return false;
  return process.env.QIKINK_USE_MOCK === "true" || !CLIENT_ID || !CLIENT_SECRET;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Matches the confirmed real contract exactly: POST /token as a
 * form-urlencoded body (not JSON), response has capitalized ClientId /
 * Accesstoken keys. Calling this again invalidates the previous token
 * ("previous token will be overwritten" per Qikink's own docs), so this
 * caches and only refreshes once the cached one is near expiry rather than
 * fetching a fresh one per request. */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const body = new URLSearchParams({ ClientId: CLIENT_ID, client_secret: CLIENT_SECRET });
  const res = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Qikink auth failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as QikinkAuthToken;
  cachedToken = { token: data.Accesstoken, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

/** ClientId + Accesstoken go in headers with those exact names/casing on
 * every call after the token exchange — confirmed from the real docs'
 * Create Order example, not a Bearer-token pattern. */
async function qikinkFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ClientId: CLIENT_ID,
      Accesstoken: token,
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
  /** Qikink has NO products/catalog API (confirmed against their real
   * Postman docs — the collection only has Authorization and Orders
   * folders). Real-mode calls throw instead of silently 404ing on a path
   * that was never real. Catalog data has to come from a CSV export, not
   * a sync — this stays mock-only for local dev fixtures. */
  async listProducts(): Promise<QikinkProduct[]> {
    if (isMockConfigured()) return MOCK_QIKINK_PRODUCTS;
    throw new Error(
      "Qikink has no products API — listProducts() only works in mock mode. Real catalog data must be imported from a Qikink CSV export.",
    );
  },

  async getProduct(productId: string): Promise<QikinkProduct | null> {
    if (isMockConfigured()) return MOCK_QIKINK_PRODUCTS.find((p) => p.product_id === productId) ?? null;
    throw new Error("Qikink has no products API — getProduct() only works in mock mode.");
  },

  /** Confirmed real endpoint: POST /order/create (singular "order").
   * See QikinkCreateOrderPayload for which fields are confirmed vs. still
   * a best guess pending the full example from the docs. */
  async createOrder(payload: QikinkCreateOrderPayload): Promise<QikinkCreateOrderResponse> {
    if (isMockConfigured()) {
      return { message: "Order created successfully", order_id: Date.now(), status_code: "200" };
    }
    return qikinkFetch<QikinkCreateOrderResponse>("/order/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Unconfirmed — Qikink's real Orders folder only lists Create Order,
   * Retrieve a list of Orders, and Retrieve Single Order; no cancel
   * endpoint was visible. Unused elsewhere in the app currently; verify
   * against the docs before wiring this up for real. */
  async cancelOrder(qikinkOrderId: string): Promise<{ status: string }> {
    if (isMockConfigured()) return { status: "cancelled" };
    throw new Error(`Qikink order cancellation endpoint is unconfirmed — verify against the API docs before use (order ${qikinkOrderId}).`);
  },

  isMockMode: isMockConfigured,
};
