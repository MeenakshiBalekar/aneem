import Image from "next/image";
import { Instagram } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

// Static fixture until the Instagram Graph API is wired (see docs/FUTURE_INTEGRATIONS.md) —
// swap this array for a fetch to /api/instagram once the access token exists.
const POSTS = Array.from({ length: 6 }).map((_, i) => ({
  id: i,
  imageUrl: `https://picsum.photos/seed/insta-${i}/600/600`,
}));

export function InstagramFeed() {
  return (
    <section className="container-aneem py-14 lg:py-20">
      <SectionHeading eyebrow="@aneem" title="Tag Us to Get Featured" align="center" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {POSTS.map((post) => (
          <a
            key={post.id}
            href="https://instagram.com/aneem"
            target="_blank"
            rel="noreferrer"
            className="group relative aspect-square overflow-hidden bg-ink-50"
          >
            <Image src={post.imageUrl} alt="Aneem on Instagram" fill sizes="200px" className="object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
              <Instagram className="text-white" size={22} />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
