import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CertifyMe | Event Certificate Portal & Verification",
  description: "Official institutional portal for dynamic event certificate issuance, on-demand generation, and cryptographic verification.",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased bg-[#F8F7F0] text-[#1C1917]">
        {children}
      </body>
    </html>
  );
}
