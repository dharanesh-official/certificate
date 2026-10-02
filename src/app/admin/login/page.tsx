"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  ArrowLeft,
  Award,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Authentication failed. Invalid credentials.");
      } else {
        router.push("/admin");
      }
    } catch {
      setErrorMsg("A network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8F7F0] px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] transition rounded-lg border border-[#D5D2C4] bg-white px-3 py-1.5 shadow-2xs hover:bg-[#F2F1E4]"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[#C62828]" />
          Return to Public Portal
        </Link>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#8C8880]">
          <span className="h-2 w-2 rounded-full bg-[#2E7D32]"></span>
          <span className="font-mono text-[11px]">PORTAL_V2.4 :: SECURE</span>
        </div>
      </div>

      {/* Main Login Box */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        {/* Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C62828] text-white shadow-md border-2 border-[#FBC02D] ring-4 ring-[#C62828]/10 transition-transform hover:scale-105">
            <Lock className="h-7 w-7 text-[#FBC02D]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D5D2C4] bg-[#FAF9F5] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#8D6E63] mb-1.5">
              <Award className="h-3 w-3 text-[#C62828]" />
              Authority Clearance Required
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1917]">
              Admin Authentication
            </h1>
            <p className="text-xs text-[#57534E] mt-1 max-w-sm mx-auto">
              Restricted portal for institutional administrators, certificate authorities, and event coordinators.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#D5D2C4] bg-white p-6 sm:p-9 shadow-lg shadow-black/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C62828] via-[#FBC02D] to-[#C62828]"></div>

          {errorMsg && (
            <div className="mb-5 rounded-lg border border-[#FFCDD2] bg-[#FFEBEE] p-3.5 text-xs text-[#C62828] flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Access Denied</span>
                <span className="mt-0.5 block">{errorMsg}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#1C1917] mb-1.5 uppercase tracking-wider text-[11px]">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#8C8880]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] pl-10 pr-3.5 py-2.5 text-sm text-[#1C1917] focus:border-[#C62828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C62828] transition"
                  placeholder="Enter your admin email"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1C1917] mb-1.5 uppercase tracking-wider text-[11px]">
                Secure Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-[#8C8880]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] pl-10 pr-10 py-2.5 text-sm text-[#1C1917] focus:border-[#C62828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C62828] transition"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#8C8880] hover:text-[#1C1917] focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-[#C62828] px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#B71C1C] disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#FBC02D]" />
                  Authenticating Session...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-[#FBC02D]" />
                  Sign In to Authority Portal
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#8C8880] mt-6 leading-relaxed">
          Authorized personnel only. All administrative access attempts are cryptographically recorded and IP-audited.
        </p>
      </div>

      {/* Bottom Line */}
      <div className="w-full max-w-5xl mx-auto text-center text-[11px] text-[#A8A29E] pt-4 border-t border-[#E5E3D8]">
        Official Event Certificate Generation &amp; Cryptographic Verification Platform
      </div>
    </div>
  );
}
