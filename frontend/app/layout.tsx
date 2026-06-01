import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOLDR SignalDesk",
  description: "Customer intelligence workbench for BOLDR watch support.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
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
