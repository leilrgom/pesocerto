import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
import { WhatsAppButton } from "@/components/whatsapp-button";
export const metadata: Metadata = {
  title: "PESO CORRETO",
  description:
    "Seus animais, seus registros e estimativas experimentais de peso por IA.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Peso Correto",
  },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};
export const viewport: Viewport = {
  themeColor: "#003B24",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Shell>{children}</Shell>
        <WhatsAppButton />
      </body>
    </html>
  );
}
