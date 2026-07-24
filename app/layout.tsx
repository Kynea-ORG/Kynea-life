import type { Metadata } from "next";
import Script from "next/script";
import { Hanken_Grotesk, Figtree } from "next/font/google";
import "./globals.css";

// GTM only fires in the real production environment — NEXT_PUBLIC_APP_ENV is
// set per Vercel environment (Production/Preview/Development), so local dev
// and preview deploys never send traffic to the live GTM container.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
const GTM_ENABLED = process.env.NEXT_PUBLIC_APP_ENV === "production" && !!GTM_ID;

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree-loaded",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kynea – La primera plataforma integral de danza en Latinoamérica",
  description: "Encuentra clases de baile, audiciones, shows, eventos culturales y tiendas especializadas. Donde la pasión por la danza cobra vida.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${hanken.variable} ${figtree.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {GTM_ENABLED && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {children}
      </body>
      {GTM_ENABLED && (
        <Script id="gtm-base" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      )}
    </html>
  );
}
