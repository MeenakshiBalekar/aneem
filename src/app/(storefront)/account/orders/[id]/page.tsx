import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Image from "next/image";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ReorderButton } from "@/components/account/reorder-button";

export const metadata = { title: "Order Details", robots: { index: false } };

const STATUS_STEPS = ["PAID", "SENT_TO_QIKINK", "IN_PRODUCTION", "SHIPPED", "DELIVERED"];

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const order = await prisma.order.findFirst({
    where: { id, userId: session!.user.id },
    include: { items: { include: { product: { include: { images: { take: 1 } } }, variant: true } }, address: true },
  });
  if (!order) notFound();

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase">{order.orderNumber}</h1>
          <p className="text-ink-400 text-sm">
            Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Badge variant="outline">{order.status.replace(/_/g, " ")}</Badge>
      </div>

      {currentStepIndex >= 0 && (
        <div className="mb-8 flex items-center">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex flex-1 items-center">
              <div className={`h-2 w-2 rounded-full ${i <= currentStepIndex ? "bg-ink" : "bg-ink-100"}`} />
              {i < STATUS_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 ${i < currentStepIndex ? "bg-ink" : "bg-ink-100"}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {order.trackingNumber && (
        <div className="bg-paper mb-6 p-4 text-sm">
          <p>
            Tracking: <span className="font-bold">{order.trackingNumber}</span> via {order.courierName}
          </p>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
              Track shipment
            </a>
          )}
        </div>
      )}

      <ul className="divide-ink-100 divide-y">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4">
            <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-ink-50">
              <Image
                src={item.product.images[0]?.url ?? "https://picsum.photos/seed/order/200/250"}
                alt={item.product.title}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{item.product.title}</p>
              <p className="text-ink-400 text-xs">
                Size {item.variant.size} · Qty {item.quantity}
              </p>
            </div>
            <span className="text-sm font-bold">{formatINR(Number(item.totalPrice))}</span>
          </li>
        ))}
      </ul>

      <div className="border-ink-100 mt-4 space-y-1 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-400">Subtotal</span>
          <span>{formatINR(Number(order.subtotal))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-400">Discount</span>
          <span>-{formatINR(Number(order.discountAmount))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-400">Shipping</span>
          <span>{formatINR(Number(order.shippingAmount))}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatINR(Number(order.total))}</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm">
          <p className="font-semibold">Delivery Address</p>
          <p className="text-ink-400">
            {order.address.fullName}, {order.address.line1}, {order.address.city}, {order.address.state} -{" "}
            {order.address.pincode}
          </p>
        </div>
        <ReorderButton
          items={order.items.map((item) => ({
            variantId: item.variantId,
            productId: item.productId,
            slug: item.product.slug,
            title: item.product.title,
            size: item.variant.size,
            color: item.variant.color,
            price: Number(item.variant.price),
            imageUrl: item.product.images[0]?.url ?? "https://picsum.photos/seed/order/200/250",
            quantity: item.quantity,
            stock: item.variant.stock,
            isOutOfStock: item.variant.isOutOfStock,
          }))}
        />
      </div>
    </div>
  );
}
