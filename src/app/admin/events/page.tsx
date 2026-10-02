"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Plus,
  Users,
  Award,
  LayoutTemplate,
  FileBadge,
  Loader2,
  X,
  Search,
  Layers,
  Trash2,
  CheckCircle2,
} from "lucide-react";

interface EventWithCounts {
  id: string;
  name: string;
  event_code: string;
  description?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  organizer: string;
  department?: string | null;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  program_id?: string | null;
  program?: {
    id: string;
    name: string;
    code: string;
  } | null;
  templates?: { id: string }[];
  _count: {
    participants: number;
  };
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [programs, setPrograms] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Deletion state
  const [eventToDelete, setEventToDelete] = useState<EventWithCounts | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formProgramId, setFormProgramId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("15 October 2026");
  const [formOrganizer, setFormOrganizer] = useState("Kongu Engineering College (Autonomous)");
  const [formDepartment, setFormDepartment] = useState("School of Computer Sciences");
  const [formStatus] = useState<"ACTIVE" | "DRAFT">("ACTIVE");

  const fetchEvents = async () => {
    try {
      const [resEvents, resPrograms] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/programs")
      ]);
      const dataEvents = await resEvents.json();
      const dataPrograms = await resPrograms.json();

      if (dataEvents.events) {
        setEvents(dataEvents.events);
      }
      if (dataPrograms.programs) {
        setPrograms(dataPrograms.programs);
      }
    } catch (err) {
      console.error("Failed to fetch events or programs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          event_code: formCode.trim().toUpperCase(),
          program_id: formProgramId || undefined,
          description: formDescription,
          event_date: formDate,
          organizer: formOrganizer,
          department: formDepartment,
          status: formStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to create event");
      } else {
        setIsModalOpen(false);
        // reset form
        setFormName("");
        setFormCode("");
        setFormProgramId("");
        setFormDescription("");
        fetchEvents();
      }
    } catch {
      setErrorMsg("A network error occurred while creating the event.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "CLOSED" : "ACTIVE";
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchEvents();
      }
    } catch (e) {
      console.error("Status update failed:", e);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${eventToDelete.id}?force=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEventToDelete(null);
        fetchEvents();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete event");
      }
    } catch {
      alert("A network error occurred while deleting the event.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.event_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.organizer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ev.program?.name && ev.program.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesProgram =
      programFilter === "ALL" ||
      (programFilter === "STANDALONE" && !ev.program_id) ||
      ev.program_id === programFilter;

    return matchesSearch && matchesProgram;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">
            Event Registries
          </h1>
          <p className="text-xs text-[#57534E]">
            Configure institutional symposiums, attach certificate templates, and manage participant rosters.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#B71C1C] transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 text-[#FBC02D]" />
          Create New Event
        </button>
      </div>

      {/* Search & Program Filter Bar */}
      <div className="rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#8C8880]" />
          <input
            type="text"
            placeholder="Search events by name, code, fest or organizer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] pl-10 pr-4 py-2 text-xs text-[#1C1917] focus:border-[#C62828] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 sm:w-72">
          <Layers className="h-4 w-4 text-[#7C3AED] shrink-0" />
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] px-3 py-2 text-xs font-medium text-[#1C1917] focus:border-[#C62828] focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Programs & Fests ({events.length})</option>
            <option value="STANDALONE">Standalone Events Only</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                Fest: {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Table (Section 36 UX specifications) */}
      <div className="rounded-xl border border-[#E5E3D8] bg-white shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#57534E] flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#C62828]" />
            Loading event registries...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#8C8880] space-y-2">
            <CalendarDays className="h-8 w-8 mx-auto text-[#D5D2C4]" />
            <p className="font-semibold text-[#1C1917]">No events found</p>
            <p>Create your first event or switch the program filter to begin issuing certificates.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] border-b border-[#E5E3D8] text-[#8C8880] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Event & Program</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Participants</th>
                  <th className="px-5 py-3.5">Template Status</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3D8]">
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#FBFBF9] transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[#1C1917]">
                          {ev.name}
                        </span>
                        {ev.program && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#F3EEFF] border border-[#D8C7FF] px-2 py-0.5 text-[10px] font-bold text-[#673AB7]">
                            <Layers className="h-3 w-3" />
                            {ev.program.name}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-[#C62828] block">
                        {ev.event_code}
                      </span>
                      <span className="text-[11px] text-[#8C8880] block truncate max-w-xs">
                        {ev.organizer}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#57534E] whitespace-nowrap">
                      {ev.event_date}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/events/${ev.id}/participants`}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#1C1917] hover:text-[#C62828]"
                      >
                        <Users className="h-3.5 w-3.5 text-[#8D6E63]" />
                        {ev._count.participants} rostered
                      </Link>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#2E7D32]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {ev.templates && ev.templates.length > 0 ? "Configured" : "Default"}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          ev.status === "ACTIVE"
                            ? "bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]"
                            : ev.status === "DRAFT"
                            ? "bg-[#FFF9C4] text-[#7F5800] border-[#FBC02D]"
                            : "bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap space-x-1.5">
                      <Link
                        href={`/admin/certificate-manager?eventId=${ev.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-[#C62828] text-white px-2.5 py-1 text-[11px] font-semibold hover:bg-[#B71C1C] transition shadow-2xs"
                        title="Open in Certificate Manager"
                      >
                        <FileBadge className="h-3 w-3 text-[#FBC02D]" />
                        Cert Manager
                      </Link>

                      <Link
                        href={`/admin/events/${ev.id}/participants`}
                        className="inline-flex items-center gap-1 rounded-md border border-[#D5D2C4] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1C1917] hover:bg-[#F2F1E4] transition"
                        title="Manage Participants & CSV Import"
                      >
                        <Users className="h-3 w-3 text-[#FF8F00]" />
                        Roster
                      </Link>

                      <Link
                        href={`/admin/events/${ev.id}/template`}
                        className="inline-flex items-center gap-1 rounded-md border border-[#D5D2C4] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1C1917] hover:bg-[#F2F1E4] transition"
                        title="Visual Certificate Template Editor"
                      >
                        <LayoutTemplate className="h-3 w-3 text-[#C62828]" />
                        Template
                      </Link>

                      <button
                        onClick={() => handleToggleStatus(ev.id, ev.status)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#D5D2C4] bg-white px-2.5 py-1 text-[11px] font-medium text-[#57534E] hover:bg-[#F2F1E4] transition"
                        title={ev.status === "ACTIVE" ? "Close event" : "Activate event"}
                      >
                        {ev.status === "ACTIVE" ? "Close" : "Activate"}
                      </button>

                      <button
                        onClick={() => setEventToDelete(ev)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#FFCDD2] bg-white px-2 py-1 text-[11px] font-medium text-[#C62828] hover:bg-[#FFEBEE] transition"
                        title="Delete this event"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3">
              <h2 className="text-base font-bold text-[#1C1917]">
                Create New Event Registry
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8C8880] hover:text-[#1C1917]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-[#FFCDD2] bg-[#FFEBEE] p-3 text-xs text-[#C62828]">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#1C1917] mb-1">
                  Main Program / Fest (Hierarchy: Program &rarr; Event)
                </label>
                <select
                  value={formProgramId}
                  onChange={(e) => setFormProgramId(e.target.value)}
                  className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                >
                  <option value="">Standalone Event (No Umbrella Program)</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#8C8880] mt-1">
                  Select a main program (e.g. Quantum Fest) to group this event under it.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paper Presentation or Web Systems Symposium"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">
                    Event Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NWSS-2026"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    required
                    className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-xs font-mono uppercase text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1C1917] mb-1">
                    Event Date *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 02 October 2026"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">
                  Organizer Institution *
                </label>
                <input
                  type="text"
                  value={formOrganizer}
                  onChange={(e) => setFormOrganizer(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">
                  Department / Organization
                </label>
                <input
                  type="text"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional brief description..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B71C1C] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Event & Initialize Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE EVENT CONFIRMATION MODAL */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1917]">Delete Event</h3>
                <p className="text-xs text-[#57534E]">This action will permanently delete this event.</p>
              </div>
            </div>

            <div className="rounded-lg bg-[#FAF9F5] border border-[#E5E3D8] p-3.5 text-xs text-[#57534E] space-y-1.5">
              <p><span className="font-bold text-[#1C1917]">Event Name:</span> {eventToDelete.name}</p>
              <p><span className="font-bold text-[#1C1917]">Event Code:</span> {eventToDelete.event_code}</p>
              {eventToDelete.program && (
                <p><span className="font-bold text-[#1C1917]">Program / Fest:</span> {eventToDelete.program.name}</p>
              )}
              <p><span className="font-bold text-[#1C1917]">Rostered Participants:</span> {eventToDelete._count.participants}</p>
            </div>

            <p className="text-xs text-[#C62828] font-medium leading-relaxed">
              &bull; Deleting this event will permanently remove its participant roster and custom template configuration.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E3D8]">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteEvent}
                className="rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B71C1C] disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Permanently Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
