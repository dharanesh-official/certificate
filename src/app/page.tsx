import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ShieldCheck,
  FileCheck,
  ArrowRight,
  Database,
  Lock,
  Layers,
  CheckCircle2,
  Search,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F0]">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION WITH AVATAR */}
        <section className="relative overflow-hidden border-b border-[#E5E3D8] bg-gradient-to-b from-[#F5F5DC]/80 via-[#F8F7F0] to-[#F8F7F0] py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              
              {/* Left Column: Headline, Description & CTAs */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#D5D2C4] bg-white px-4 py-1.5 text-xs font-semibold text-[#8D6E63] shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C62828] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C62828]"></span>
                  </span>
                  Official Institutional Certification Authority
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1C1917] leading-[1.15]">
                  Generate. Verify. <span className="text-[#C62828] underline decoration-[#FBC02D] decoration-wavy decoration-from-font">Trust.</span>
                </h1>

                <p className="text-base sm:text-lg text-[#57534E] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Search across all institutional events by entering your <strong>Name</strong> or <strong>Roll Number</strong>. 
                  View your available certificates, preview verified records, and download print-ready tamper-proof credentials instantly with <strong>CertifyMe</strong>.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-1">
                  <Link
                    href="/generate"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#C62828] px-7 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#B71C1C] hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <FileCheck className="h-4 w-4 text-[#FBC02D]" />
                    Generate Certificate
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/verify"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl border border-[#D5D2C4] bg-white px-7 py-3.5 text-sm font-semibold text-[#1C1917] shadow-xs hover:bg-[#F2F1E4] hover:border-[#8D6E63] transition-all"
                  >
                    <ShieldCheck className="h-4 w-4 text-[#2E7D32]" />
                    Verify Authenticity
                  </Link>
                </div>

                {/* Quick Trust Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#E5E3D8]/80 text-xs text-[#57534E]">
                  <div className="p-3.5 rounded-xl bg-white/80 border border-[#E5E3D8] shadow-2xs">
                    <span className="font-bold text-[#1C1917] block text-sm mb-0.5">On-Demand Stream</span>
                    Zero static file storage on server
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/80 border border-[#E5E3D8] shadow-2xs">
                    <span className="font-bold text-[#1C1917] block text-sm mb-0.5">Cryptographic Keys</span>
                    Unique IDs &amp; SHA-256 HMAC
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/80 border border-[#E5E3D8] shadow-2xs">
                    <span className="font-bold text-[#1C1917] block text-sm mb-0.5">Permanent QR Record</span>
                    Instant scanner validation
                  </div>
                </div>
              </div>

              {/* Right Column: Avatar Showcase */}
              <div className="lg:col-span-5 flex justify-center items-center relative">
                {/* Ambient Soft Glow Behind Avatar */}
                <div className="absolute -inset-4 sm:-inset-8 rounded-full bg-gradient-to-tr from-[#FBC02D]/25 via-[#C62828]/15 to-[#2E7D32]/15 blur-3xl opacity-80 pointer-events-none" />

                {/* Main Avatar Card Frame */}
                <div className="relative group w-full max-w-[340px] sm:max-w-[400px] flex justify-center">
                  
                  {/* Floating Shield Badge (Top-Right) */}
                  <div className="absolute top-8 -right-2 sm:-right-4 z-20 flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur-md px-3.5 py-2 border border-[#E5E3D8] shadow-lg text-left animate-bounce [animation-duration:4s]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-[#1C1917] leading-tight">100% Verified</div>
                      <div className="text-[10px] text-[#57534E]">Cryptographic Seal</div>
                    </div>
                  </div>

                  {/* Floating Multi-Event Badge (Bottom-Left) */}
                  <div className="absolute bottom-12 -left-2 sm:-left-6 z-20 flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur-md px-3.5 py-2 border border-[#E5E3D8] shadow-lg text-left">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF9C4] text-[#C62828] border border-[#FBC02D]">
                      <Search className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-[#1C1917] leading-tight">Multi-Event Search</div>
                      <div className="text-[10px] text-[#57534E]">Name &amp; Roll Number</div>
                    </div>
                  </div>

                  {/* High Resolution Avatar Image */}
                  <div className="relative z-10 transition-transform duration-500 group-hover:scale-[1.03]">
                    <Image
                      src="/avatar.png"
                      alt="CertifyMe Assistant Avatar"
                      width={440}
                      height={660}
                      priority
                      className="w-full h-auto max-h-[500px] sm:max-h-[560px] object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>

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
                <h3 className="text-base font-bold text-[#1C1917] mb-1">Enter Name or Roll No</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Search across all events and programs instantly without needing to pick an event first.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-[#E5E3D8] bg-[#F8F7F0] p-6 relative">
                <div className="text-xs font-extrabold text-[#FF8F00] mb-2">STEP 02</div>
                <h3 className="text-base font-bold text-[#1C1917] mb-1">Select Available Event</h3>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  View all events where your certificate is available and select the desired one.
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
