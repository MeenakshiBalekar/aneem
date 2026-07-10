import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aneem — Premium Oversized Streetwear",
    template: "%s | Aneem",
  },
  description:
    "Aneem is premium men's and women's oversized streetwear — oversized tees, hoodies, gym wear, and accessories built for the streets.",
  keywords: [
    "oversized t-shirts",
    "streetwear India",
    "premium streetwear",
    "oversized hoodies",
    "gym t-shirts",
    "Aneem",
  ],
  openGraph: {
    type: "website",
    siteName: "Aneem",
    title: "Aneem — Premium Oversized Streetwear",
    description: "Premium men's and women's oversized streetwear, engineered for the streets.",
    url: SITE_URL,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Aneem Streetwear" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aneem — Premium Oversized Streetwear",
    description: "Premium men's and women's oversized streetwear, engineered for the streets.",
    images: ["/og-image.jpg"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Aneem",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: ["https://instagram.com/aneem", "https://facebook.com/aneem"],
  };

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
