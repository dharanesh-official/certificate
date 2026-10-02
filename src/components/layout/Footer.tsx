import { Shield, Award, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#E5E3D8] bg-[#F2F1E4] text-[#57534E] text-sm">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand — full width on mobile */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#C62828] text-white">
                <Award className="h-5 w-5 text-[#FBC02D]" />
              </div>
              <span className="font-bold tracking-tight text-[#1C1917] text-base">
                CERT<span className="text-[#C62828]">PORTAL</span>
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

        <div className="mt-8 pt-6 border-t border-[#E5E3D8] flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C8880] gap-3">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} Official Event Certification Registry. All rights reserved.
          </p>
          <p className="flex items-center gap-2 shrink-0">
            <span>Identity:</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#F5F5DC] border border-[#D5D2C4]"></span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FBC02D]"></span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FF8F00]"></span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#C62828]"></span>
          </p>
        </div>
      </div>
    </footer>
  );
}
