import { prisma } from "@/lib/database/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  CheckCircle2,
  XCircle,
  Calendar,
  ArrowLeft,
  Building,
} from "lucide-react";
import Link from "next/link";

interface VerifyPageProps {
  params: Promise<{ certificateId: string }>;
}

export default async function DirectVerifyPage({ params }: VerifyPageProps) {
  const { certificateId } = await params;
  const cleanId = certificateId.trim().toUpperCase();

  // Try to find matching participant by roll number
  const parts = cleanId.split("-");
  let participant = null;

  if (parts.length >= 2) {
    const rollCandidate = parts[parts.length - 1];
    participant = await prisma.participant.findFirst({
      where: { roll_number: rollCandidate },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            event_code: true,
            event_date: true,
            organizer: true,
            department: true,
            program: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });
  }

  const isValid = participant !== null && participant.eligible;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F0]">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/verify"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Verify another Certificate ID
            </Link>
          </div>

          {/* 1. VALID CERTIFICATE */}
          {isValid && participant && (
            <div className="rounded-xl border border-[#A5D6A7] bg-white p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1C1917]">
                      Authentic Certificate Verified
                    </h2>
                    <p className="text-xs text-[#57534E]">
                      This certificate is authentic and matches the verified institutional roster.
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-[#E8F5E9] px-3 py-1 font-mono text-xs font-bold text-[#2E7D32] border border-[#A5D6A7]">
                  OFFICIALLY VALID
                </span>
              </div>

              {/* Certificate Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E5E3D8] space-y-1">
                  <span className="text-[#8C8880] text-[10px] uppercase font-bold tracking-wider block">
                    Certificate ID
                  </span>
                  <span className="font-mono font-bold text-sm text-[#1C1917]">
                    {cleanId}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E5E3D8] space-y-1">
                  <span className="text-[#8C8880] text-[10px] uppercase font-bold tracking-wider block">
                    Participant Name
                  </span>
                  <span className="font-bold text-sm text-[#1C1917]">
                    {participant.name}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E5E3D8] space-y-1">
                  <span className="text-[#8C8880] text-[10px] uppercase font-bold tracking-wider block">
                    Roll Number
                  </span>
                  <span className="font-mono font-bold text-sm text-[#57534E]">
                    {participant.roll_number}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E5E3D8] space-y-1">
                  <span className="text-[#8C8880] text-[10px] uppercase font-bold tracking-wider block">
                    Event Track
                  </span>
                  <span className="font-bold text-sm text-[#C62828]">
                    {participant.event.name}
                  </span>
                  {participant.event.program && (
                    <span className="text-[11px] text-[#7C3AED] block">
                      Under {participant.event.program.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Event Metadata */}
              <div className="border-t border-[#E5E3D8] pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#57534E]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#8C8880]" />
                  <span>Event Date: {participant.event.event_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-[#8C8880]" />
                  <span>Organizer: {participant.event.organizer}</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/api/certificates/download?eventId=${participant.event.id}&participantId=${participant.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#C62828] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C] transition"
                >
                  Download Verified PDF Certificate
                </Link>
              </div>
            </div>
          )}

          {/* 2. INVALID / NOT FOUND */}
          {!isValid && (
            <div className="rounded-xl border border-[#FFCDD2] bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1C1917]">
                    Certificate Not Found
                  </h2>
                  <p className="text-xs text-[#57534E]">
                    The identifier &quot;{cleanId}&quot; could not be matched with any participant record in the system.
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-[#FFEBEE] p-4 text-xs text-[#C62828] space-y-1">
                <p className="font-bold">Possible Reasons:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>The certificate ID was typed incorrectly.</li>
                  <li>The participant was not enrolled in this event.</li>
                  <li>The certificate has not been authenticated by the institution.</li>
                </ul>
              </div>

              <div className="pt-2">
                <Link
                  href="/verify"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] transition"
                >
                  Try Again
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
