"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ShieldCheck, FileCheck, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home", exact: true, icon: null },
  { href: "/generate", label: "Generate Certificate", exact: false, icon: FileCheck },
  { href: "/verify", label: "Verify Certificate", exact: false, icon: ShieldCheck },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5E3D8] bg-[#F8F7F0]/95 backdrop-blur supports-[backdrop-filter]:bg-[#F8F7F0]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-xs border border-[#D5D2C4] overflow-hidden transition-transform group-hover:scale-105">
            <Image
              src="/icon.png"
              alt="CertifyMe Logo"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#1C1917] block leading-tight">
              Certify<span className="text-[#C62828]">Me</span>
            </span>
            <span className="hidden sm:block text-[11px] font-medium tracking-wider text-[#57534E] uppercase">
              Event Certification &amp; Registry
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, exact, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive(href, exact)
                  ? "bg-[#EBEBD0] text-[#1C1917] font-semibold"
                  : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#F2F1E4]"
              }`}
            >
              {Icon && (
                <Icon
                  className={`h-4 w-4 ${
                    href === "/generate" ? "text-[#FF8F00]" : "text-[#2E7D32]"
                  }`}
                />
              )}
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status badge — hidden on small screens */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#FAF9F5] px-3 py-1 text-xs font-medium text-[#57534E] border border-[#E5E3D8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2E7D32]"></span>
            Official Registry Active
          </span>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-[#D5D2C4] bg-white text-[#57534E] hover:bg-[#F2F1E4] transition"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E3D8] bg-[#F8F7F0] px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ href, label, exact, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(href, exact)
                  ? "bg-[#EBEBD0] text-[#1C1917] font-semibold"
                  : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#F2F1E4]"
              }`}
            >
              {Icon && (
                <Icon
                  className={`h-4 w-4 ${
                    href === "/generate" ? "text-[#FF8F00]" : "text-[#2E7D32]"
                  }`}
                />
              )}
              {label}
            </Link>
          ))}
          {/* Status on mobile */}
          <div className="pt-2 border-t border-[#E5E3D8] mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#8C8880]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2E7D32]"></span>
              Official Registry Active
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
