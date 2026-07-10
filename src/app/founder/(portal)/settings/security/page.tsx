import { getFounderSession } from "@/lib/founder/session";
import { prisma } from "@/lib/prisma";
import { TwoFactorSetup } from "@/components/founder/two-factor-setup";

export const metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default async function FounderSecurityPage() {
  const session = await getFounderSession();
  const founder = await prisma.founderUser.findUnique({ where: { id: session!.user.id } });

  const recentAttempts = await prisma.founderLoginAttempt.findMany({
    where: { email: founder?.email },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black">Security</h1>

      <div className="mb-8">
        <TwoFactorSetup initiallyEnabled={founder?.twoFactorEnabled ?? false} />
      </div>

      <div className="max-w-2xl">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Recent Login Attempts</h2>
        <div className="border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-white/40">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">IP Address</th>
                <th className="p-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {recentAttempts.map((a) => (
                <tr key={a.id} className="border-b border-white/5">
                  <td className="p-3 text-white/60">{a.createdAt.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-white/60">{a.ipAddress}</td>
                  <td className="p-3">
                    {a.success ? (
                      <span className="text-emerald-400">Success</span>
                    ) : (
                      <span className="text-red-400">Failed — {a.failureReason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
