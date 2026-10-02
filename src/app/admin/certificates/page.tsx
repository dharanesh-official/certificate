"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileBadge, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function AdminCertificatesPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to Certificate Manager
    const timer = setTimeout(() => {
      router.push("/admin/certificate-manager");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 text-center space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] mx-auto shadow-xs">
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-[#1C1917]">
          Issued Certificates Registry Removed
        </h1>
        <p className="text-xs text-[#57534E] max-w-md mx-auto leading-relaxed">
          In accordance with your privacy and data minimization policies, persistent storage of issued certificates has been eliminated. Certificates are generated dynamically on demand strictly from your <strong>Participant Rosters</strong> and <strong>Certificate Templates</strong>.
        </p>
      </div>

      <div className="rounded-xl border border-[#E5E3D8] bg-white p-5 text-left text-xs space-y-3 max-w-lg mx-auto shadow-2xs">
        <span className="font-bold text-[#1C1917] block">
          Current Database Storage Guarantee:
        </span>
        <ul className="space-y-1.5 text-[#57534E] list-disc list-inside">
          <li><strong>Programs & Events:</strong> Structural event metadata.</li>
          <li><strong>Participant Rosters:</strong> Approved participant name & roll numbers.</li>
          <li><strong>Certificate Templates:</strong> Layout & styling configurations.</li>
          <li><strong>No Issued Certificates:</strong> Zero student certificates or logs stored.</li>
        </ul>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3">
        <Link
          href="/admin/certificate-manager"
          className="inline-flex items-center gap-2 rounded-lg bg-[#C62828] px-4 py-2 text-xs font-bold text-white hover:bg-[#B71C1C] transition shadow-xs"
        >
          <FileBadge className="h-4 w-4 text-[#FBC02D]" />
          Go to Certificate Manager
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
