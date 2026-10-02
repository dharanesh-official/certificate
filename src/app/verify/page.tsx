"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Calendar,
  Loader2,
} from "lucide-react";

interface VerificationResponse {
  valid: boolean;
  status: "VALID" | "REVOKED" | "EXPIRED" | "NOT_FOUND";
  message?: string;
  certificate?: {
    certificateId: string;
    participantName: string;
    rollNumber: string;
    department?: string | null;
    institution?: string | null;
    eventName: string;
    eventCode: string;
    eventDate: string;
    organizer: string;
    issuedAt: string;
    revokedAt?: string | null;
    revocationReason?: string | null;
    templateVersion: number;
  };
}

export default function VerifyPage() {
  const [certInput, setCertInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = certInput.trim().toUpperCase();
    if (!cleanId) return;

    setErrorMsg(null);
    setResult(null);
    setIsVerifying(true);

    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(cleanId)}`);
      const data = await res.json();
      if (!res.ok && res.status !== 404) {
        setErrorMsg(data.error || "Verification lookup failed");
      } else {
        setResult(data);
      }
    } catch {
      setErrorMsg("A network error occurred while verifying. Please check your connection.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F0]">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D5D2C4] bg-white px-3.5 py-1 text-xs font-semibold text-[#8D6E63] shadow-xs mb-3">
              <ShieldCheck className="h-4 w-4 text-[#2E7D32]" />
              Official Verification Registry
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1917]">
              Verify Your Certificate
            </h1>
            <p className="mt-2 text-sm text-[#57534E]">
              Enter the unique Certificate ID printed on the physical or digital certificate to verify its authenticity against official institutional records.
            </p>
          </div>

          {/* Verification Search Box */}
          <div className="rounded-xl border border-[#D5D2C4] bg-white p-6 sm:p-8 shadow-xs mb-8">
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label
                  htmlFor="certificate-id-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#1C1917] mb-2"
                >
                  Certificate ID
                </label>
                <div className="relative">
                  <input
                    id="certificate-id-input"
                    type="text"
                    value={certInput}
                    onChange={(e) => setCertInput(e.target.value)}
                    placeholder="e.g. CERT-2026-X7K9P4M2"
                    className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] px-4 py-3.5 text-base font-mono uppercase tracking-wider text-[#1C1917] placeholder:text-[#8C8880] focus:border-[#C62828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C62828]"
                    required
                  />
                  <div className="absolute right-3 top-3 text-xs text-[#8C8880] hidden sm:block">
                    Format: CERT-YYYY-XXXXXXXX
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isVerifying || !certInput.trim()}
                  className="w-full sm:w-auto rounded-lg bg-[#C62828] px-6 py-3 text-sm font-bold text-white shadow-xs hover:bg-[#B71C1C] disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#FBC02D]" />
                      Verifying with Registry...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-[#FBC02D]" />
                      VERIFY CERTIFICATE
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCertInput("CERT-2026-DEMO123")}
                  className="text-xs text-[#8D6E63] hover:text-[#1C1917] font-medium"
                >
                  Need a sample ID? Fill Demo
                </button>
              </div>
            </form>
          </div>

          {/* Network or parsing Error */}
          {errorMsg && (
            <div className="rounded-xl border border-[#FFCDD2] bg-[#FFEBEE] p-5 text-xs text-[#C62828] mb-8 flex items-start gap-3">
              <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Verification Error</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* RESULT 1: VALID CERTIFICATE */}
          {result && result.valid && result.certificate && (
            <div className="rounded-xl border border-[#A5D6A7] bg-white p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-[#2E7D32] block">
                      Authentic Record Confirmed
                    </span>
                    <h2 className="text-xl font-bold text-[#1C1917]">
                      &check; CERTIFICATE VERIFIED
                    </h2>
                  </div>
                </div>

                <span className="rounded-full bg-[#E8F5E9] px-3.5 py-1 text-xs font-bold text-[#2E7D32] border border-[#A5D6A7]">
                  STATUS: VALID
                </span>
              </div>

              {/* Verified Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div className="p-3.5 rounded-lg bg-[#F8F7F0] border border-[#E5E3D8]">
                  <span className="text-[#8C8880] block text-[11px] uppercase tracking-wider font-semibold">
                    Participant Name
                  </span>
                  <span className="text-lg font-bold text-[#1C1917] block font-serif mt-0.5">
                    {result.certificate.participantName}
                  </span>
                  <span className="text-xs text-[#57534E] font-mono mt-0.5 block">
                    Roll No: {result.certificate.rollNumber}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F8F7F0] border border-[#E5E3D8]">
                  <span className="text-[#8C8880] block text-[11px] uppercase tracking-wider font-semibold">
                    Certificate ID
                  </span>
                  <span className="text-base font-mono font-bold text-[#C62828] block mt-0.5">
                    {result.certificate.certificateId}
                  </span>
                  <span className="text-[11px] text-[#57534E] mt-0.5 block">
                    Template Version: {result.certificate.templateVersion}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F8F7F0] border border-[#E5E3D8]">
                  <span className="text-[#8C8880] block text-[11px] uppercase tracking-wider font-semibold">
                    Event Name & Date
                  </span>
                  <span className="text-sm font-bold text-[#1C1917] block mt-0.5">
                    {result.certificate.eventName}
                  </span>
                  <span className="text-xs text-[#57534E] mt-0.5 block flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#8D6E63]" />
                    {result.certificate.eventDate}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F8F7F0] border border-[#E5E3D8]">
                  <span className="text-[#8C8880] block text-[11px] uppercase tracking-wider font-semibold">
                    Issuing Organization
                  </span>
                  <span className="text-sm font-bold text-[#1C1917] block mt-0.5">
                    {result.certificate.organizer}
                  </span>
                  <span className="text-[11px] text-[#57534E] mt-0.5 block">
                    Issued on: {new Date(result.certificate.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-[#E5E3D8] pt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#57534E]">
                  This certificate has been verified via the official cryptographic hash registry.
                </span>
                <a
                  href={`/api/certificates/${result.certificate.certificateId}/download`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1C1917] px-4 py-2 text-xs font-semibold text-white hover:bg-[#292524] transition shadow-xs"
                >
                  <Download className="h-3.5 w-3.5 text-[#FBC02D]" />
                  Download Official PDF
                </a>
              </div>
            </div>
          )}

          {/* RESULT 2: REVOKED CERTIFICATE */}
          {result && result.status === "REVOKED" && result.certificate && (
            <div className="rounded-xl border-2 border-[#C62828] bg-white p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#FFCDD2] pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-[#C62828] block">
                      Invalidated Credential
                    </span>
                    <h2 className="text-xl font-bold text-[#C62828]">
                      &#9888; CERTIFICATE REVOKED
                    </h2>
                  </div>
                </div>

                <span className="rounded-full bg-[#FFEBEE] px-3.5 py-1 text-xs font-bold text-[#C62828] border border-[#FFCDD2]">
                  STATUS: REVOKED
                </span>
              </div>

              <div className="rounded-lg bg-[#FFEBEE] p-4 text-xs text-[#B71C1C] border border-[#FFCDD2] space-y-2">
                <p className="font-bold text-sm">
                  Warning: This certificate has been revoked by the issuing authority.
                </p>
                <p>
                  <span className="font-semibold">Revocation Reason:</span>{" "}
                  {result.certificate.revocationReason || "Revoked by institutional administrator."}
                </p>
                {result.certificate.revokedAt && (
                  <p>
                    <span className="font-semibold">Revocation Timestamp:</span>{" "}
                    {new Date(result.certificate.revokedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-[#57534E] pt-1">
                <div>
                  <span className="text-[#8C8880] block">Participant</span>
                  <span className="font-semibold text-[#1C1917]">{result.certificate.participantName}</span>
                </div>
                <div>
                  <span className="text-[#8C8880] block">Certificate ID</span>
                  <span className="font-mono font-semibold text-[#1C1917]">{result.certificate.certificateId}</span>
                </div>
              </div>
            </div>
          )}

          {/* RESULT 3: NOT FOUND / INVALID */}
          {result && (result.status === "NOT_FOUND" || (!result.valid && result.status !== "REVOKED")) && (
            <div className="rounded-xl border border-[#D5D2C4] bg-white p-6 sm:p-8 shadow-xs text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F5DC] text-[#C62828] border border-[#D5D2C4]">
                <XCircle className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold text-[#1C1917]">
                Certificate Not Found or Invalid
              </h2>
              <p className="text-xs text-[#57534E] max-w-md mx-auto leading-relaxed">
                This certificate ID does not exist in our institutional database. Please verify the ID format or confirm with the event issuing authority.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
