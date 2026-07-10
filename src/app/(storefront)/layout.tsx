import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { CartDrawer } from "@/components/cart/cart-drawer";

export const revalidate = 300;

async function getNavCategories() {
  return prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    select: {
      name: true,
      slug: true,
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { name: true, slug: true },
      },
    },
  });
}

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const categories = await getNavCategories().catch(() => []);

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
