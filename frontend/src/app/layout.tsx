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
    default: `${siteName} — Tu app para el cuidado de mascotas`,
    template: `%s | ${siteName}`,
  },
  description:
    "PetsApp: cuidá, encontrá y acompañá a tus mascotas desde un solo lugar.",
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
