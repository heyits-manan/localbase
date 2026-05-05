import type { Metadata } from "next";
import appleTouchIcon from "./assets/favicon_io/apple-touch-icon.png";
import favicon16 from "./assets/favicon_io/favicon-16x16.png";
import favicon32 from "./assets/favicon_io/favicon-32x32.png";
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
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href={favicon32.src} />
        <link rel="icon" type="image/png" sizes="16x16" href={favicon16.src} />
        <link rel="apple-touch-icon" sizes="180x180" href={appleTouchIcon.src} />
      </head>
      <body>{children}</body>
    </html>
  );
}
