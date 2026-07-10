import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/account/logout-button";

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/addresses", label: "Addresses" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/account");

  return (
    <div className="container-aneem grid gap-10 py-10 lg:grid-cols-[220px_1fr]">
      <aside>
        <p className="mb-4 text-sm font-semibold">Hi, {session.user.name?.split(" ")[0] ?? "there"}</p>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:bg-ink-50 px-3 py-2 text-sm font-medium">
              {item.label}
            </Link>
          ))}
          <LogoutButton />
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
