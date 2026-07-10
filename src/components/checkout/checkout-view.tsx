"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cart-store";
import { formatINR, cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const EMPTY_ADDRESS = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function CheckoutView() {
  const { status } = useSession();
  const router = useRouter();
  const { lines, subtotal, clear } = useCartStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "COD">("RAZORPAY");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/checkout");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/account/addresses")
      .then((r) => r.json())
      .then((data: Address[]) => {
        setAddresses(data);
        const def = data.find((a) => a.isDefault) ?? data[0];
        if (def) setSelectedAddressId(def.id);
        else setShowNewAddressForm(true);
      });
  }, [status]);

  if (lines.length === 0) {
    return (
      <div className="container-aneem py-24 text-center">
        <p className="text-ink-400">Your bag is empty.</p>
      </div>
    );
  }

  async function saveNewAddress(): Promise<string | null> {
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAddress),
    });
    if (!res.ok) {
      toast.error("Please check your address details");
      return null;
    }
    const created = await res.json();
    return created.id;
  }

  async function placeOrder() {
    setPlacing(true);
    try {
      let addressId = selectedAddressId;
      if (showNewAddressForm || !addressId) {
        addressId = await saveNewAddress();
        if (!addressId) return;
      }

      await fetch("/api/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })) }),
      });

      const orderRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId, paymentMethod }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        toast.error(orderData.error ?? "Could not place order");
        return;
      }

      if (paymentMethod === "COD") {
        clear();
        router.push(`/checkout/success?order=${orderData.orderNumber}`);
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Aneem",
        description: `Order ${orderData.orderNumber}`,
        order_id: orderData.razorpayOrderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: orderData.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          if (verifyRes.ok) {
            clear();
            router.push(`/checkout/success?order=${orderData.orderNumber}`);
          } else {
            toast.error("Payment verification failed. Contact support if amount was deducted.");
          }
        },
        theme: { color: "#0a0a0a" },
      });
      razorpay.open();
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="container-aneem grid gap-10 py-10 lg:grid-cols-3">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="lg:col-span-2">
        <h1 className="mb-6 text-2xl font-black uppercase">Checkout</h1>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase">Delivery Address</h2>
          <div className="space-y-3">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={cn(
                  "block cursor-pointer border p-4",
                  selectedAddressId === a.id && !showNewAddressForm ? "border-ink" : "border-ink-200",
                )}
              >
                <input
                  type="radio"
                  name="address"
                  className="mr-2"
                  checked={selectedAddressId === a.id && !showNewAddressForm}
                  onChange={() => {
                    setSelectedAddressId(a.id);
                    setShowNewAddressForm(false);
                  }}
                />
                <span className="text-sm font-semibold">{a.fullName}</span>
                <p className="text-ink-400 ml-5 text-xs">
                  {a.line1}, {a.line2 ? `${a.line2}, ` : ""}
                  {a.city}, {a.state} - {a.pincode} · {a.phone}
                </p>
              </label>
            ))}
            <button
              onClick={() => setShowNewAddressForm(true)}
              className="text-xs font-semibold underline underline-offset-4"
            >
              + Add a new address
            </button>
          </div>

          {showNewAddressForm && (
            <div className="border-ink-200 mt-4 grid gap-3 border p-4 sm:grid-cols-2">
              <input placeholder="Full name" value={newAddress.fullName} onChange={(e) => setNewAddress((a) => ({ ...a, fullName: e.target.value }))} className="border-ink-200 h-11 border px-3 text-sm sm:col-span-2" />
              <input placeholder="Phone" value={newAddress.phone} onChange={(e) => setNewAddress((a) => ({ ...a, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} className="border-ink-200 h-11 border px-3 text-sm" />
              <input placeholder="Pincode" value={newAddress.pincode} onChange={(e) => setNewAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className="border-ink-200 h-11 border px-3 text-sm" />
              <input placeholder="Address line 1" value={newAddress.line1} onChange={(e) => setNewAddress((a) => ({ ...a, line1: e.target.value }))} className="border-ink-200 h-11 border px-3 text-sm sm:col-span-2" />
              <input placeholder="Address line 2 (optional)" value={newAddress.line2} onChange={(e) => setNewAddress((a) => ({ ...a, line2: e.target.value }))} className="border-ink-200 h-11 border px-3 text-sm sm:col-span-2" />
              <input placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))} className="border-ink-200 h-11 border px-3 text-sm" />
              <input placeholder="State" value={newAddress.state} onChange={(e) => setNewAddress((a) => ({ ...a, state: e.target.value }))} className="border-ink-200 h-11 border px-3 text-sm" />
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase">Payment Method</h2>
          <div className="space-y-3">
            <label className={cn("flex items-center gap-3 border p-4", paymentMethod === "RAZORPAY" ? "border-ink" : "border-ink-200")}>
              <input type="radio" name="payment" checked={paymentMethod === "RAZORPAY"} onChange={() => setPaymentMethod("RAZORPAY")} />
              <span className="text-sm font-semibold">UPI / Cards / Netbanking / Wallets (Razorpay)</span>
            </label>
            <label className={cn("flex items-center gap-3 border p-4", paymentMethod === "COD" ? "border-ink" : "border-ink-200")}>
              <input type="radio" name="payment" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
              <span className="text-sm font-semibold">Cash on Delivery (+₹49 fee)</span>
            </label>
          </div>
        </section>
      </div>

      <div className="border-ink-100 h-fit border p-6">
        <h2 className="mb-4 text-lg font-black uppercase">Order Summary</h2>
        <ul className="mb-4 space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.variantId} className="flex justify-between">
              <span className="text-ink-400">
                {l.title} ({l.size}) x{l.quantity}
              </span>
              <span>{formatINR(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-ink-100 flex justify-between border-t pt-4 text-lg font-bold">
          <span>Subtotal</span>
          <span>{formatINR(subtotal())}</span>
        </div>
        <button
          onClick={placeOrder}
          disabled={placing}
          className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-6 w-full disabled:opacity-50")}
        >
          {placing ? "Placing order..." : "Place Order"}
        </button>
      </div>
    </div>
  );
}
