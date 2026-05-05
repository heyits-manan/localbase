import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Localbase",
  description: "Local-first backend infrastructure for AI coding agents."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
