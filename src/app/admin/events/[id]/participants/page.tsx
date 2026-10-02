"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Upload,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  X,
  FileSpreadsheet,
  Award,
} from "lucide-react";

interface ParticipantItem {
  id: string;
  roll_number: string;
  name: string;
  email?: string | null;
  department?: string | null;
  institution?: string | null;
  eligible: boolean;
  certificates?: {
    id: string;
    certificate_id: string;
    status: string;
    issued_at: string;
  }[];
}

interface EventData {
  id: string;
  name: string;
  event_code: string;
  event_date: string;
  organizer: string;
  program?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export default function EventParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);

  const [event, setEvent] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Single Add Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addRoll, setAddRoll] = useState("");
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addDept, setAddDept] = useState("M.Sc Software Systems");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // CSV Import Modal
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<any | null>(null);
  const [csvValidating, setCsvValidating] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Download the official CSV template
  const downloadTemplate = () => {
    // Only roll_number and name are mandatory; email and department are optional
    const lines = [
      "# INSTRUCTIONS: Only roll_number and name are required. email and department are optional.",
      "roll_number,name,email,department",
      "24ISR001,Student Name,,",
      "24ISR002,Another Student,,",
    ];
    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "participants_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle file selection and read CSV text
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Please upload a .csv file.");
      return;
    }
    setCsvFileName(file.name);
    setCsvError(null);
    setCsvPreview(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = (ev.target?.result as string) ?? "";
      const sanitized = raw
        .normalize("NFKC")
        .replace(/[\uFFFD\u200B-\u200D\uFEFF]/g, "")
        .replace(/^[•·\-\*▪▫\.\s]+/gm, "");
      setCsvText(sanitized);
    };
    reader.readAsText(file);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [evRes, partRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/participants?search=${encodeURIComponent(search)}`),
      ]);

      const evData = await evRes.json();
      const partData = await partRes.json();

      if (evData.event) setEvent(evData.event);
      if (partData.participants) setParticipants(partData.participants);
    } catch (e) {
      console.error("Failed to load participants:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roll_number: addRoll,
          name: addName,
          email: addEmail,
          department: addDept,
          eligible: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to add participant");
      } else {
        setIsAddModalOpen(false);
        setAddRoll("");
        setAddName("");
        setAddEmail("");
        loadData();
      }
    } catch {
      setAddError("A network error occurred.");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handlePreviewCsv = async () => {
    if (!csvText.trim()) return;
    setCsvValidating(true);
    setCsvError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/participants/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent: csvText,
          dryRun: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCsvError(data.error || "Failed to validate CSV");
      } else {
        setCsvPreview(data);
      }
    } catch {
      setCsvError("A network error occurred while validating CSV.");
    } finally {
      setCsvValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    setCsvImporting(true);
    setCsvError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/participants/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent: csvText,
          dryRun: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCsvError(data.error || "Import failed");
      } else {
        setIsCsvModalOpen(false);
        setCsvText("");
        setCsvPreview(null);
        loadData();
      }
    } catch {
      setCsvError("A network error occurred during import.");
    } finally {
      setCsvImporting(false);
    }
  };

  const handleExportCsv = () => {
    if (participants.length === 0) return;
    const headers = ["roll_number", "name", "email", "department", "eligible"];
    const rows = participants.map((p) => [
      p.roll_number,
      `"${p.name.replace(/"/g, '""')}"`,
      p.email || "",
      `"${(p.department || "").replace(/"/g, '""')}"`,
      p.eligible ? "true" : "false",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Participants-${event?.event_code || "Event"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back button & Event header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#57534E]">
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1.5 hover:text-[#1C1917] transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Events List
          </Link>
          {event?.program && (
            <>
              <span className="text-[#A8A29E]">/</span>
              <Link
                href={`/admin/programs/${event.program.id}`}
                className="inline-flex items-center gap-1 text-[#7C3AED] hover:underline"
              >
                Fest: {event.program.name}
              </Link>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">
                {event ? `${event.name} — Participants Roster` : "Participants Roster"}
              </h1>
              {event?.program && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#F3EEFF] border border-[#D8C7FF] px-2 py-0.5 text-xs font-bold text-[#673AB7]">
                  {event.program.name}
                </span>
              )}
            </div>
            <p className="text-xs text-[#57534E] mt-1">
              {event?.event_code} &bull; {event?.event_date} &bull; {event?.organizer}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/certificate-manager?eventId=${eventId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2C4] bg-[#FAF9F5] px-3 py-2 text-xs font-semibold text-[#C62828] hover:bg-[#F2F1E4] transition"
              title="Design or upload certificate template for this event"
            >
              <Award className="h-3.5 w-3.5 text-[#C62828]" />
              Event Certificate Template
            </Link>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2C4] bg-white px-3 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] transition"
            >
              <Plus className="h-3.5 w-3.5 text-[#C62828]" />
              Add Participant
            </button>
            <button
              onClick={() => {
                setCsvPreview(null);
                setCsvError(null);
                setIsCsvModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C62828] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#B71C1C] transition"
            >
              <Upload className="h-3.5 w-3.5 text-[#FBC02D]" />
              Bulk CSV Import
            </button>
            <button
              onClick={handleExportCsv}
              disabled={participants.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2C4] bg-white px-3 py-2 text-xs font-medium text-[#57534E] hover:bg-[#F2F1E4] disabled:opacity-50 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#8C8880]" />
            <input
              type="text"
              placeholder="Search by Roll No, Name, Email, Dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] pl-10 pr-4 py-2 text-xs text-[#1C1917] focus:border-[#C62828] focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#1C1917] px-4 py-2 text-xs font-semibold text-white hover:bg-[#292524]"
          >
            Search
          </button>
        </form>
      </div>

      {/* Participants Table */}
      <div className="rounded-xl border border-[#E5E3D8] bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#57534E] flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#C62828]" />
            Loading participants roster...
          </div>
        ) : participants.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#8C8880] space-y-2">
            <Users className="h-8 w-8 mx-auto text-[#D5D2C4]" />
            <p className="font-semibold text-[#1C1917]">No participants yet</p>
            <p>Import participants via CSV or add manually to begin certificate generation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] border-b border-[#E5E3D8] text-[#8C8880] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Roll Number</th>
                  <th className="px-5 py-3.5">Participant Name</th>
                  <th className="px-5 py-3.5">Department / Institution</th>
                  <th className="px-5 py-3.5">Eligibility</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Certificate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3D8]">
                {participants.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FBFBF9] transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-[#1C1917]">
                      {p.roll_number}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-[#1C1917]">
                      {p.name}
                      {p.email && (
                        <span className="block text-[11px] text-[#8C8880]">
                          {p.email}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#57534E]">
                      {p.department || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          p.eligible
                            ? "bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]"
                            : "bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]"
                        }`}
                      >
                        {p.eligible ? "Eligible" : "Ineligible"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      {p.eligible ? (
                        <a
                          href={`/api/certificates/download?eventId=${eventId}&participantId=${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded bg-[#C62828] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#B71C1C] transition shadow-2xs"
                          title="Generate & Download Certificate"
                        >
                          <Download className="h-3 w-3" /> Download PDF
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#8C8880] italic">
                          Ineligible
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD PARTICIPANT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3">
              <h2 className="text-base font-bold text-[#1C1917]">
                Add Event Participant
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#8C8880] hover:text-[#1C1917]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addError && (
              <div className="rounded-lg border border-[#FFCDD2] bg-[#FFEBEE] p-3 text-xs text-[#C62828]">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddParticipant} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#1C1917] mb-1">
                  Roll Number / Participant ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 24ISR011"
                  value={addRoll}
                  onChange={(e) => setAddRoll(e.target.value.toUpperCase())}
                  required
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 font-mono uppercase text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">
                  Full Official Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dharanesh Kumar"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="dharanesh@example.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">
                  Department / Branch
                </label>
                <input
                  type="text"
                  placeholder="e.g. M.Sc Software Systems"
                  value={addDept}
                  onChange={(e) => setAddDept(e.target.value)}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B71C1C] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {addSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Register Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV BULK IMPORT MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#2E7D32]" />
                <h2 className="text-base font-bold text-[#1C1917]">
                  Bulk Import Participants via CSV
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvText("");
                  setCsvFileName(null);
                  setCsvPreview(null);
                  setCsvError(null);
                }}
                className="text-[#8C8880] hover:text-[#1C1917]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {csvError && (
              <div className="rounded-lg border border-[#FFCDD2] bg-[#FFEBEE] p-3 text-xs text-[#C62828] shrink-0">
                {csvError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-5 text-xs">

              {/* STEP 1 — Download template */}
              <div className="rounded-xl border border-[#C8E6C9] bg-[#F1F8E9] p-4 flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2E7D32] text-white text-[11px] font-bold">1</div>
                <div className="flex-1">
                  <p className="font-bold text-[#1B5E20] mb-1">Download the official template</p>
                  <div className="text-[11px] text-[#388E3C] mb-3 space-y-1">
                    <p>Fill in your participants using this template.</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#C8E6C9] px-2 py-0.5 font-semibold text-[#1B5E20]">
                        ✱ roll_number &mdash; Required
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#C8E6C9] px-2 py-0.5 font-semibold text-[#1B5E20]">
                        ✱ name &mdash; Required
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-white border border-[#A5D6A7] px-2 py-0.5 text-[#388E3C]">
                        email &mdash; Optional
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-white border border-[#A5D6A7] px-2 py-0.5 text-[#388E3C]">
                        department &mdash; Optional
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#2E7D32] bg-white px-4 py-2 text-xs font-semibold text-[#2E7D32] hover:bg-[#E8F5E9] transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download CSV Template
                  </button>
                </div>
              </div>

              {/* STEP 2 — Upload filled file */}
              <div className="rounded-xl border border-[#D5D2C4] bg-[#FAFAF5] p-4 flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C62828] text-white text-[11px] font-bold">2</div>
                <div className="flex-1">
                  <p className="font-bold text-[#1C1917] mb-0.5">Upload your completed CSV file</p>
                  <p className="text-[11px] text-[#57534E] mb-3">
                    Only upload files that follow the downloaded template format.
                  </p>

                  <label
                    htmlFor="csv-file-upload"
                    className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      csvFileName
                        ? "border-[#2E7D32] bg-[#E8F5E9]"
                        : "border-[#D5D2C4] bg-white hover:bg-[#F5F4EE]"
                    } p-6`}
                  >
                    {csvFileName ? (
                      <>
                        <CheckCircle2 className="h-8 w-8 text-[#2E7D32] mb-2" />
                        <span className="font-semibold text-[#1C1917] text-xs">{csvFileName}</span>
                        <span className="text-[10px] text-[#57534E] mt-0.5">
                          {csvText.split("\n").filter(Boolean).length - 1} data row(s) detected &mdash; click to change
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-[#8C8880] mb-2" />
                        <span className="font-semibold text-[#1C1917] text-xs">Click to upload CSV file</span>
                        <span className="text-[10px] text-[#8C8880] mt-0.5">.csv files only</span>
                      </>
                    )}
                    <input
                      id="csv-file-upload"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
              </div>

              {/* PREVIEW RESULTS */}
              {csvPreview && (
                <div className="rounded-lg border border-[#D5D2C4] bg-[#F8F7F0] p-4 space-y-3">
                  <h3 className="font-bold text-[#1C1917] text-xs">
                    Validation Summary:
                  </h3>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded bg-white border border-[#E5E3D8]">
                      <span className="text-[#8C8880] block text-[10px]">Total Rows</span>
                      <span className="font-bold text-sm">{csvPreview.summary.totalRows}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#C8E6C9] text-[#2E7D32]">
                      <span className="block text-[10px]">Valid</span>
                      <span className="font-bold text-sm">{csvPreview.summary.validCount}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#FFCDD2] text-[#C62828]">
                      <span className="block text-[10px]">Invalid</span>
                      <span className="font-bold text-sm">{csvPreview.summary.invalidCount}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#FFE082] text-[#FF8F00]">
                      <span className="block text-[10px]">Duplicates</span>
                      <span className="font-bold text-sm">{csvPreview.summary.duplicateCount}</span>
                    </div>
                  </div>

                  {/* Warning on duplicates/invalids */}
                  {csvPreview.duplicateRows.length > 0 && (
                    <div className="text-[11px] text-[#7F5800] bg-[#FFFDE7] p-2 rounded border border-[#FFF9C4]">
                      <strong>Duplicate Records Detected:</strong>
                      <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                        {csvPreview.duplicateRows.map((d: any, idx: number) => (
                          <li key={idx}>
                            Row {d.row}: {d.roll_number} &mdash; {d.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {csvPreview.previewValid.length > 0 && (
                    <div className="overflow-x-auto max-h-36">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-[#EBEBD0] text-[#57534E]">
                          <tr>
                            <th className="p-1.5">Roll No</th>
                            <th className="p-1.5">Name</th>
                            <th className="p-1.5">Department</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E3D8]">
                          {csvPreview.previewValid.map((r: any, idx: number) => (
                            <tr key={idx} className="bg-white">
                              <td className="p-1.5 font-mono font-bold">{r.roll_number}</td>
                              <td className="p-1.5">{r.name}</td>
                              <td className="p-1.5 text-[#57534E]">{r.department || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E5E3D8] shrink-0">
              <button
                type="button"
                onClick={handlePreviewCsv}
                disabled={csvValidating || !csvText.trim()}
                className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] disabled:opacity-50 flex items-center gap-1.5"
              >
                {csvValidating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Validate & Preview Rows
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="rounded-lg border border-[#D5D2C4] bg-white px-3 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={csvImporting || !csvPreview || csvPreview.summary.validCount === 0}
                  className="rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B71C1C] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {csvImporting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm & Import Valid Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
