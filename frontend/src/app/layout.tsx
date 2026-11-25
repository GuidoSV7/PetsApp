import type { Metadata, Viewport } from "next";
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

/** Keep form controls / scrollbars on the light palette until AA dark tokens exist. */
export const viewport: Viewport = {
  colorScheme: "light",
};

export default function LayoutRaiz({
  children: contenido,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fuenteSans.variable} ${fuenteMono.variable}`}>
      <body suppressHydrationWarning>
        <a className="skipLink" href="#inicio">
          Ir al contenido
        </a>
        <RouteThemeProvider>
          <AppProviders>
            <NotificationsProvider>{contenido}</NotificationsProvider>
          </AppProviders>
        </RouteThemeProvider>
      </body>
    </html>
  );
}
