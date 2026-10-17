import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import NotificationsProvider from "./_components/NotificationsProvider";
import AppProviders from "./providers";
import "./globals.css";
import RouteThemeProvider from "./theme/RouteThemeProvider";
import { siteName, siteUrl } from "@/config/site";

const fuenteSans = Space_Grotesk({
  variable: "--fuente-geist-sans",
  subsets: ["latin"],
});

const fuenteMono = JetBrains_Mono({
  variable: "--fuente-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Pago protegido hasta confirmar la entrega`,
    template: `%s | ${siteName}`,
  },
  description:
    "Vendé y comprá sin miedo a que te fallen. Pago protegido hasta confirmar la entrega. Cobrá en dólares (USDC) en Latinoamérica.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_LA",
    siteName,
  },
};

export default function LayoutRaiz({
  children: contenido,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fuenteSans.variable} ${fuenteMono.variable}`}>
      <body suppressHydrationWarning>
        <RouteThemeProvider>
          <AppProviders>
            <NotificationsProvider>{contenido}</NotificationsProvider>
          </AppProviders>
        </RouteThemeProvider>
      </body>
    </html>
  );
}
