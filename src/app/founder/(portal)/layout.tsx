import { redirect } from "next/navigation";
import { getFounderSession } from "@/lib/founder/session";
import { FounderSidebar } from "@/components/founder/founder-sidebar";
import { DailyActionBanner } from "@/components/founder/daily-action-banner";
import { CommandPalette } from "@/components/founder/command-palette";
import { CommandPaletteTrigger } from "@/components/founder/command-palette-trigger";

export default async function FounderPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getFounderSession();
  if (!session?.user) redirect("/founder/login");

  return (
    <div className="flex min-h-screen">
      <FounderSidebar name={session.user.name ?? session.user.email ?? "Founder"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-6 lg:px-8">
          <CommandPaletteTrigger />
        </header>
        <main className="flex-1 overflow-x-hidden p-6 lg:p-8">
          <DailyActionBanner />
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
