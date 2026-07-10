import { redirect } from "next/navigation";
import { getFounderSession } from "@/lib/founder/session";
import { FounderSidebar } from "@/components/founder/founder-sidebar";
import { DailyActionBanner } from "@/components/founder/daily-action-banner";

export default async function FounderPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getFounderSession();
  if (!session?.user) redirect("/founder/login");

  return (
    <div className="flex min-h-screen">
      <FounderSidebar name={session.user.name ?? session.user.email ?? "Founder"} />
      <main className="flex-1 overflow-x-hidden p-6 lg:p-8">
        <DailyActionBanner />
        {children}
      </main>
    </div>
  );
}
