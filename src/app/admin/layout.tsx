"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(isLoginPage ? true : null);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    let isMounted = true;

    async function verifySession() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          if (isMounted) {
            setIsAuthorized(false);
            router.replace("/admin/login");
          }
        } else {
          if (isMounted) {
            setIsAuthorized(true);
          }
        }
      } catch {
        if (isMounted) {
          setIsAuthorized(false);
          router.replace("/admin/login");
        }
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, router]);

  // If on login page, do NOT render the admin sidebar or top header!
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state while checking session on URL-based entry to /admin
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F7F0]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#C62828] border-t-transparent shadow-xs"></div>
          <p className="text-xs font-semibold text-[#57534E] tracking-wide">
            Verifying institutional authorization...
          </p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-[#F8F7F0]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#E5E3D8] bg-white px-6 sm:px-8 flex items-center justify-between shrink-0">
          <div className="text-xs font-semibold text-[#57534E]">
            Official Institutional Registry & Issuance System
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF9C4] px-3 py-1 text-xs font-semibold text-[#7F5800] border border-[#FBC02D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF8F00]"></span>
              Authority Session Active
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
