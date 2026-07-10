import "server-only";
import Razorpay from "razorpay";
import crypto from "node:crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

export function isRazorpayConfigured(): boolean {
  return Boolean(KEY_ID && KEY_SECRET);
}

// Instantiated lazily so the app can boot (and mock/demo flows work) even
// before real Razorpay keys are supplied.
let instance: Razorpay | null = null;
export function razorpay(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  if (!instance) instance = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  return instance;
}

export async function createRazorpayOrder(amountInRupees: number, receipt: string) {
  return razorpay().orders.create({
    amount: Math.round(amountInRupees * 100), // paise
    currency: "INR",
    receipt,
    payment_capture: true,
  });
}

/** Verifies the signature returned by Razorpay Checkout after a successful payment. */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature));
  } catch {
    return false;
  }
}

/** Verifies the `X-Razorpay-Signature` header on inbound webhook events. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
