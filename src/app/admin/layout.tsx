import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="bg-ink hidden w-60 shrink-0 flex-col p-6 text-white lg:flex">
        <Link href="/" className="mb-10 text-xl font-black uppercase">
          Aneem <span className="text-accent">Admin</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded px-3 py-2 text-sm font-medium hover:bg-white/10">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="mt-auto text-xs text-ink-200 hover:text-white">
          ← Back to storefront
        </Link>
      </aside>
      <main className="flex-1 p-6 lg:p-10">{children}</main>
    </div>
  );
}
