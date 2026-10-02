import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ShieldCheck,
  FileCheck,
  ArrowRight,
  Database,
  Lock,
  Layers,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F0]">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-[#E5E3D8] bg-[#F5F5DC]/60 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D5D2C4] bg-white px-4 py-1.5 text-xs font-semibold text-[#8D6E63] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[#C62828]"></span>
              Official Institutional Certification Authority
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#1C1917] leading-[1.1]">
              Generate. Verify. <span className="text-[#C62828]">Trust.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#57534E] leading-relaxed max-w-2xl mx-auto">
              A secure platform for generating and verifying official event certificates.
              Engineered with cryptographic authenticity, on-demand memory rendering, and permanent QR-linked verification.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/generate"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#C62828] px-8 py-4 text-sm font-semibold text-white shadow-md hover:bg-[#B71C1C] transition-all"
              >
                <FileCheck className="h-4 w-4 text-[#FBC02D]" />
                Generate Certificate
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/verify"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#D5D2C4] bg-white px-8 py-4 text-sm font-semibold text-[#1C1917] shadow-xs hover:bg-[#F2F1E4] transition-all"
              >
                <ShieldCheck className="h-4 w-4 text-[#2E7D32]" />
                Verify Certificate
              </Link>
            </div>

            {/* Quick Trust Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-[#E5E3D8]/80 text-xs text-[#57534E] max-w-3xl mx-auto">
              <div className="p-4 rounded-xl bg-white/70 border border-[#E5E3D8] shadow-2xs">
                <span className="font-bold text-[#1C1917] block text-sm">On-Demand Stream</span>
                Zero permanent disk storage
              </div>
              <div className="p-4 rounded-xl bg-white/70 border border-[#E5E3D8] shadow-2xs">
                <span className="font-bold text-[#1C1917] block text-sm">Cryptographic Keys</span>
                Unique IDs & SHA-256 HMAC
              </div>
              <div className="p-4 rounded-xl bg-white/70 border border-[#E5E3D8] shadow-2xs">
                <span className="font-bold text-[#1C1917] block text-sm">Permanent QR Record</span>
                Instant scanner validation
              </div>
            </div>
          </div>
        </section>

        {/* 3-STEP USER WORKFLOW */}
        <section className="py-16 bg-white border-b border-[#E5E3D8]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-xs font-bold tracking-widest text-[#C62828] uppercase">
                Institutional Workflow
              </h2>
              <p className="mt-2 text-3xl font-extrabold text-[#1C1917]">
                How Event Certification Works
              </p>
              <p className="mt-2 text-sm text-[#57534E]">
                Strict server-side validation guarantees zero tampering and 100% authorized credentials.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="rounded-xl border border-[#E5E3D8] bg-[#F8F7F0] p-6 relative">
                <div className="text-xs font-extrabold text-[#C62828] mb-2">STEP 01</div>
                <h3 className="text-base font-bold text-[#1C1917] mb-1">Select Event</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Choose from currently active authorized symposiums, conferences, or workshops.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-[#E5E3D8] bg-[#F8F7F0] p-6 relative">
                <div className="text-xs font-extrabold text-[#FF8F00] mb-2">STEP 02</div>
                <h3 className="text-base font-bold text-[#1C1917] mb-1">Enter Roll Number</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Provide your official institutional Roll Number or Participant Identifier.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-[#E5E3D8] bg-[#F8F7F0] p-6 relative">
                <div className="text-xs font-extrabold text-[#FBC02D] mb-2">STEP 03</div>
                <h3 className="text-base font-bold text-[#1C1917] mb-1">Server Verification</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  The registry validates eligibility, matches official records, and binds the unique ID.
                </p>
              </div>

              {/* Step 4 */}
              <div className="rounded-xl border border-[#E5E3D8] bg-[#F8F7F0] p-6 relative">
                <div className="text-xs font-extrabold text-[#2E7D32] mb-2">STEP 04</div>
                <h3 className="text-base font-bold text-[#1C1917] mb-1">On-Demand Stream</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  High-res PDF generated in memory and streamed directly with embedded QR code.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY & ARCHITECTURE HIGHLIGHTS */}
        <section className="py-16 bg-[#F8F7F0]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="rounded-xl border border-[#E5E3D8] bg-white p-6 shadow-xs space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFF9C4] text-[#C62828] border border-[#FBC02D]">
                  <Database className="h-5 w-5" />
                </div>
                <h4 className="text-base font-bold text-[#1C1917]">Zero Static Disk Clutter</h4>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Certificates are rendered in volatile memory and piped straight to the client. No permanent PDF files linger on the server.
                </p>
              </div>

              <div className="rounded-xl border border-[#E5E3D8] bg-white p-6 shadow-xs space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFE0B2] text-[#FF8F00] border border-[#FF8F00]">
                  <Lock className="h-5 w-5" />
                </div>
                <h4 className="text-base font-bold text-[#1C1917]">Tamper-Proof Validation</h4>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Participant names are exclusively loaded from the authoritative database registry. Front-end submissions cannot manipulate issuance.
                </p>
              </div>

              <div className="rounded-xl border border-[#E5E3D8] bg-white p-6 shadow-xs space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFCDD2] text-[#C62828] border border-[#C62828]">
                  <Layers className="h-5 w-5" />
                </div>
                <h4 className="text-base font-bold text-[#1C1917]">Instant Revocation Control</h4>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Administrators can instantly flag or revoke misissued credentials. The public verification page immediately displays the revocation notice.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="border-t border-[#E5E3D8] bg-[#F5F5DC] py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <h3 className="text-2xl font-bold text-[#1C1917]">
              Need to obtain or verify an official certificate?
            </h3>
            <p className="text-sm text-[#57534E] max-w-xl mx-auto">
              Access the participant portal to generate your authorized credential or verify any certificate using its unique identifier.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-2">
              <Link
                href="/generate"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#C62828] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#B71C1C] transition"
              >
                Generate Certificate
              </Link>
              <Link
                href="/verify"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#D5D2C4] bg-white px-5 py-2.5 text-xs font-semibold text-[#1C1917] shadow-xs hover:bg-[#F2F1E4] transition"
              >
                Verify Existing ID
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
