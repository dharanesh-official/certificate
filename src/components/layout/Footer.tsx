import { Shield, CheckCircle2, Globe, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-[#E5E3D8] bg-[#F2F1E4] text-[#57534E] text-sm">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand — full width on mobile */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-xs border border-[#D5D2C4] overflow-hidden">
                <Image
                  src="/icon.png"
                  alt="CertifyMe Logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-extrabold tracking-tight text-[#1C1917] text-lg">
                Certify<span className="text-[#C62828]">Me</span>
              </span>
            </div>
            <p className="text-xs text-[#57534E] max-w-md leading-relaxed">
              Institutional Event Certificate Issuance &amp; Verification Infrastructure.
              Cryptographically verified IDs, zero permanent PDF storage, and tamper-proof public verification.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
              <span className="inline-flex items-center gap-1 text-[#2E7D32] font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> In-Memory PDF
              </span>
              <span className="inline-flex items-center gap-1 text-[#C62828] font-medium">
                <Shield className="h-3.5 w-3.5" /> SHA-256 Verification
              </span>
            </div>
          </div>

          {/* Portal Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1917] mb-3">
              Portal Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/generate" className="hover:text-[#1C1917] transition">
                  Generate Certificate
                </Link>
              </li>
              <li>
                <Link href="/verify" className="hover:text-[#1C1917] transition">
                  Verify Certificate ID
                </Link>
              </li>
              <li>
                <Link href="/verify" className="hover:text-[#1C1917] transition">
                  Sample Verification
                </Link>
              </li>
            </ul>
          </div>

          {/* Security */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1917] mb-3">
              Security
            </h4>
            <ul className="space-y-2 text-xs text-[#57534E]">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D32]"></span>
                SHA-256 HMAC Auth
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D32]"></span>
                Tamper-Evident QR
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2E7D32]"></span>
                Zero-Storage PDF
              </li>
              <li className="text-[#8C8880]">Role-based Access</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E3D8] flex flex-col md:flex-row items-center justify-between text-xs text-[#8C8880] gap-4">
          <p className="text-center md:text-left">
            © {new Date().getFullYear()} <span className="font-semibold text-[#1C1917]">CertifyMe</span>. Official Event Certification Registry. All rights reserved.
          </p>

          {/* Watermark & Developer Credits */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right gap-1">
            <div className="flex items-center gap-1.5 text-xs text-[#57534E]">
              <span className="text-[#8C8880]">Built with passion by</span>
              <a
                href="https://www.linkedin.com/in/dharaneshk/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#C62828] hover:text-[#B71C1C] inline-flex items-center gap-1.5 transition-colors no-underline"
                title="Connect with Dharanesh K on LinkedIn"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#0077B5] text-white p-0.5 shadow-2xs shrink-0">
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                </span>
                <span>Dharanesh K</span>
                <ExternalLink className="h-3 w-3 text-[#C62828]" />
              </a>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#57534E]">
              <a
                href="https://dharaneshkumar.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#57534E] hover:text-[#C62828] hover:underline transition-colors"
                title="Visit Dharanesh Kumar's Portfolio Website"
              >
                <Globe className="h-3.5 w-3.5 text-[#2E7D32]" />
                <span>https://dharaneshkumar.me/</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
