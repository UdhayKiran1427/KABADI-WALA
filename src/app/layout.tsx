import type { Metadata, Viewport } from "next";
import "./globals.css";
import { VoiceLanguageProvider } from "@/components/voice/VoiceLanguageContext";

export const metadata: Metadata = {
  title: "E-Waste Saathi | Circular E-Waste Supply Chain Platform",
  description: "Bridging informal e-waste collectors with authorized recyclers through fair pricing, safety, and traceability.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>♻️</text></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <VoiceLanguageProvider>{children}</VoiceLanguageProvider>
      </body>
    </html>
  );
}
