import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOLDR Revenue Rocket",
  description: "Customer intelligence workbench for BOLDR watch support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
