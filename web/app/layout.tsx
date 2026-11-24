import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "thermopb: find a route to your next meeting",
  description:
    "Route To Meeting. Share your Thermo ID, connect your circles, and discover a trusted way to your next meeting.",
  icons: {
    icon: { url: "/branding/thermopb-logo.png", type: "image/png" },
    apple: "/branding/thermopb-logo.png",
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
