import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import NotificationsProvider from "./_components/NotificationsProvider";
import AppProviders from "./providers";
import "./globals.css";
import RouteThemeProvider from "./theme/RouteThemeProvider";
import { getSiteUrl } from "@/config/site";
import { landingShareMetadata } from "@/features/public-marketing/share-metadata";

const fuenteSans = Space_Grotesk({
  variable: "--fuente-geist-sans",
  subsets: ["latin"],
});

const fuenteMono = JetBrains_Mono({
  variable: "--fuente-geist-mono",
  subsets: ["latin"],
});

const siteOrigin = getSiteUrl();
const share = landingShareMetadata();

export const metadata: Metadata = {
  ...share,
  metadataBase: new URL(siteOrigin),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    ...share.openGraph,
    url: siteOrigin,
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
