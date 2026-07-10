import { getFollowUpQueue, getTodaysOrders, type CallingQueueOrder } from "@/lib/founder/calling-queue";
import { CallingQueueCard, type CallingQueueOrderView } from "@/components/founder/calling-queue-card";

export const metadata = { title: "Customer Confirmation Queue" };
export const dynamic = "force-dynamic";

function toView(order: CallingQueueOrder): CallingQueueOrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    paymentMethod: order.paymentMethod,
    total: Number(order.total),
    contactStatus: order.contactStatus,
    contactAttempts: order.contactAttempts,
    nextFollowUpAt: order.nextFollowUpAt?.toISOString() ?? null,
    customerName: order.address.fullName,
    customerEmail: order.user.email,
    phone: order.address.phone,
    address: `${order.address.line1}${order.address.line2 ? ", " + order.address.line2 : ""}`,
    city: order.address.city,
    state: order.address.state,
    pincode: order.address.pincode,
    items: order.items.map((i) => ({ title: i.product.title, size: i.variant.size, color: i.variant.color, quantity: i.quantity })),
    lastNote: order.callLogs[0]?.note ?? null,
    lastAttemptAt: order.callLogs[0]?.createdAt.toISOString() ?? null,
  };
}

export default async function CallingQueuePage() {
  const [todaysOrders, followUps] = await Promise.all([getTodaysOrders(), getFollowUpQueue()]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-black">Customer Confirmation Queue</h1>
        <p className="mt-1 text-sm text-white/50">{todaysOrders.length} order(s) placed today.</p>
        <div className="mt-4 space-y-3">
          {todaysOrders.length === 0 ? (
            <p className="text-sm text-white/40">No orders yet today.</p>
          ) : (
            todaysOrders.map((o) => <CallingQueueCard key={o.id} order={toView(o)} />)
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold">Follow-up Queue</h2>
        <p className="mt-1 text-sm text-white/50">
          Customers marked No Response or Requested Callback — sorted by next follow-up date.
        </p>
        <div className="mt-4 space-y-3">
          {followUps.length === 0 ? (
            <p className="text-sm text-white/40">Nothing needs a follow-up right now.</p>
          ) : (
            followUps.map((o) => <CallingQueueCard key={o.id} order={toView(o)} />)
          )}
        </div>
      </div>
    </div>
  );
}
