import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-Waste Collector Platform",
  description: "Bridging informal e-waste collectors with authorized recyclers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

