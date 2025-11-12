import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LEO Coaching – New",
  description: "Coaching simulator without HeyGen: static avatar, cookie auth, and evaluation API."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, Segoe UI, Roboto, Arial" }}>{children}</body>
    </html>
  );
}
