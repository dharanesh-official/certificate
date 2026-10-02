import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Certificate Portal | Generation & Verification",
  description: "Official institutional portal for dynamic event certificate issuance, on-demand generation, and cryptographic verification.",
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
