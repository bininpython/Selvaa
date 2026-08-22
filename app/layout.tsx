import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://selva-plus.oai-site.app"),
  title: "SELVA+",
  description: "A rede social dos aventureiros. Explore, registre, compartilhe e preserve.",
  applicationName: "SELVA+",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SELVA+", statusBarStyle: "black-translucent" },
  openGraph: { title: "SELVA+ — A rede social dos aventureiros", description: "Explore. Registre. Compartilhe. Preserve.", type: "website", locale: "pt_BR", images: [{ url: "/og.png", width: 1200, height: 630, alt: "SELVA+ — A rede social dos aventureiros" }] },
  twitter: { card: "summary_large_image", title: "SELVA+ — A rede social dos aventureiros", description: "Explore. Registre. Compartilhe. Preserve.", images: ["/og.png"] },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#063D24" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
