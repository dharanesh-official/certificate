import { prisma } from "@/lib/database/prisma";
import Link from "next/link";
import {
  Layers,
  CalendarDays,
  Users,
  FileBadge,
  ArrowRight,
  Plus,
  History,
  CheckCircle2,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const [
    totalPrograms,
    totalEvents,
    totalParticipants,
    totalTemplates,
    recentEvents,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.program.count(),
    prisma.event.count(),
    prisma.participant.count(),
    prisma.certificateTemplate.count({ where: { is_active: true } }),
    prisma.event.findMany({
      take: 6,
      orderBy: { created_at: "desc" },
      include: {
        program: { select: { name: true, code: true } },
        templates: { where: { is_active: true }, select: { id: true } },
        _count: {
          select: { participants: true },
        },
      },
    }),
    prisma.auditLog.findMany({
      take: 6,
      orderBy: { created_at: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">
            Institutional Registry Overview
          </h1>
          <p className="text-xs text-[#57534E]">
            Governance structure: Programs (Fests) &rarr; Events &rarr; Participant Rosters &rarr; Certificate Templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/programs"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2C4] bg-white px-3.5 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] transition"
          >
            <Layers className="h-4 w-4 text-[#7C3AED]" />
            Manage Programs
          </Link>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-2 rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#B71C1C] transition"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </Link>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/programs" className="block group">
          <div className="rounded-xl border border-[#E5E3D8] bg-white p-5 shadow-2xs group-hover:border-[#7C3AED] transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8C8880] uppercase tracking-wider">
                Programs & Fests
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3EEFF] text-[#7C3AED] border border-[#D8C7FF]">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#1C1917] tracking-tight">
                {totalPrograms}
              </span>
              <span className="text-[11px] text-[#57534E] block mt-0.5">
                Umbrella fests configured
              </span>
            </div>
          </div>
        </Link>

        <Link href="/admin/events" className="block group">
          <div className="rounded-xl border border-[#E5E3D8] bg-white p-5 shadow-2xs group-hover:border-[#FBC02D] transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8C8880] uppercase tracking-wider">
                Event Tracks
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF9C4] text-[#8D6E63] border border-[#FBC02D]">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#1C1917] tracking-tight">
                {totalEvents}
              </span>
              <span className="text-[11px] text-[#57534E] block mt-0.5">
                Active event registries
              </span>
            </div>
          </div>
        </Link>

        <Link href="/admin/events" className="block group">
          <div className="rounded-xl border border-[#E5E3D8] bg-white p-5 shadow-2xs group-hover:border-[#FF8F00] transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8C8880] uppercase tracking-wider">
                Registered Participants
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFE0B2] text-[#FF8F00] border border-[#FF8F00]">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#1C1917] tracking-tight">
                {totalParticipants}
              </span>
              <span className="text-[11px] text-[#57534E] block mt-0.5">
                Rostered across all tracks
              </span>
            </div>
          </div>
        </Link>

        <Link href="/admin/certificate-manager" className="block group">
          <div className="rounded-xl border border-[#E5E3D8] bg-white p-5 shadow-2xs group-hover:border-[#C62828] transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8C8880] uppercase tracking-wider">
                Configured Templates
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFCDD2] text-[#C62828] border border-[#FFCDD2]">
                <FileBadge className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#1C1917] tracking-tight">
                {totalTemplates}
              </span>
              <span className="text-[11px] text-[#57534E] block mt-0.5">
                Active certificate layouts
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* 2-COLUMN SECTION: RECENT EVENTS & AUDIT TRAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div className="rounded-xl border border-[#E5E3D8] bg-white shadow-2xs">
          <div className="p-5 border-b border-[#E5E3D8] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1C1917]">Recent Events</h2>
              <p className="text-[11px] text-[#8C8880]">Active & upcoming certification registries</p>
            </div>
            <Link
              href="/admin/events"
              className="text-xs font-semibold text-[#C62828] hover:underline flex items-center gap-1"
            >
              All Events <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-[#E5E3D8]">
            {recentEvents.length === 0 ? (
              <p className="p-6 text-xs text-[#8C8880] italic text-center">No events created yet.</p>
            ) : (
              recentEvents.map((ev) => (
                <div key={ev.id} className="p-4 flex items-center justify-between hover:bg-[#FBFBF9] transition">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#1C1917]">
                        {ev.name}
                      </span>
                      {ev.program && (
                        <span className="text-[10px] font-semibold text-[#7C3AED] bg-[#F3EEFF] px-1.5 py-0.5 rounded border border-[#D8C7FF]">
                          {ev.program.name}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#57534E] block mt-0.5">
                      {ev.event_code} &bull; {ev.event_date}
                    </span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-semibold text-[#1C1917] block">
                      {ev._count.participants} Participants
                    </span>
                    <span className="text-[10px] text-[#2E7D32] flex items-center gap-1 justify-end">
                      <CheckCircle2 className="h-3 w-3" />
                      {ev.templates.length > 0 ? "Template Ready" : "Default Template"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Trail Activity */}
        <div className="rounded-xl border border-[#E5E3D8] bg-white shadow-2xs">
          <div className="p-5 border-b border-[#E5E3D8] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1C1917]">Administrative Audit Trail</h2>
              <p className="text-[11px] text-[#8C8880]">Cryptographic trace of admin operations</p>
            </div>
            <Link
              href="/admin/audit-logs"
              className="text-xs font-semibold text-[#C62828] hover:underline flex items-center gap-1"
            >
              Full Trail <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-[#E5E3D8]">
            {recentAuditLogs.length === 0 ? (
              <p className="p-6 text-xs text-[#8C8880] italic text-center">No admin actions logged yet.</p>
            ) : (
              recentAuditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between text-xs hover:bg-[#FBFBF9] transition">
                  <div className="flex items-center gap-2.5">
                    <History className="h-4 w-4 text-[#8D6E63] shrink-0" />
                    <div>
                      <span className="font-semibold text-[#1C1917] block">
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-[#57534E] block">
                        {log.admin_email || "System"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8C8880]">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
