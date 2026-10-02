"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  CalendarDays,
  Award,
  FileBadge,
  ShieldCheck,
  ScrollText,
  LogOut,
  ExternalLink,
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      label: "Programs (Fests)",
      href: "/admin/programs",
      icon: Layers,
      active: pathname.startsWith("/admin/programs"),
    },
    {
      label: "Event Management",
      href: "/admin/events",
      icon: CalendarDays,
      active: pathname === "/admin/events" || (pathname.startsWith("/admin/events/") && !pathname.includes("template")),
    },
    {
      label: "Certificate Manager",
      href: "/admin/certificate-manager",
      icon: FileBadge,
      active: pathname.startsWith("/admin/certificate-manager") || pathname.includes("/template"),
    },
    {
      label: "Audit Logs",
      href: "/admin/audit-logs",
      icon: ScrollText,
      active: pathname.startsWith("/admin/audit-logs"),
    },
  ];

  return (
    <aside className="w-64 border-r border-[#E5E3D8] bg-[#FAF9F5] flex flex-col justify-between shrink-0">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[#E5E3D8]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C62828] text-white shadow-xs">
            <Award className="h-5 w-5 text-[#FBC02D]" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-[#1C1917] block leading-tight">
              ADMIN<span className="text-[#C62828]">PANEL</span>
            </span>
            <span className="text-[10px] text-[#8C8880] uppercase tracking-wider block">
              Authority Portal
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  item.active
                    ? "bg-[#EBEBD0] text-[#1C1917] shadow-2xs font-bold"
                    : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#F2F1E4]"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    item.active ? "text-[#C62828]" : "text-[#8C8880]"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Area */}
      <div className="p-4 border-t border-[#E5E3D8] space-y-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[#57534E] hover:bg-[#F2F1E4] hover:text-[#1C1917] transition"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-[#8C8880]" />
            Public Portal
          </span>
          <span className="text-[10px] text-[#8C8880]">View</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#C62828] hover:bg-[#FFEBEE] transition"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
