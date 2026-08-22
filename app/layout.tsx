import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { PwaRegister } from "./components/pwa-register";

export const metadata: Metadata = {
  metadataBase: new URL("https://selva-plus.abnerlucas571.chatgpt.site"),
  title: { default: "SELVA+", template: "%s | SELVA+" },
  description: "A rede social dos aventureiros. Explore, registre, compartilhe e preserve.",
  applicationName: "SELVA+",
  other: { "codex-preview": "development" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SELVA+", statusBarStyle: "black-translucent" },
  openGraph: { title: "SELVA+ — A rede social dos aventureiros", description: "Explore. Registre. Compartilhe. Preserve.", type: "website", locale: "pt_BR", images: [{ url: "/og.png", width: 1200, height: 630, alt: "SELVA+ — A rede social dos aventureiros" }] },
  twitter: { card: "summary_large_image", title: "SELVA+ — A rede social dos aventureiros", description: "Explore. Registre. Compartilhe. Preserve.", images: ["/og.png"] },
  icons: {
    icon: "/brand/selva-symbol.png",
    shortcut: "/brand/selva-symbol.png",
    apple: "/brand/selva-symbol.png",
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
      <body>{children}<PwaRegister /></body>
    </html>
  );
}
