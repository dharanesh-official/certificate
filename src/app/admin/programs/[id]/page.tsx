"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  FileBadge,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";

interface NestedEvent {
  id: string;
  name: string;
  event_code: string;
  event_date: string;
  venue?: string | null;
  status: string;
  _count: {
    participants: number;
  };
  templates: {
    id: string;
    version: number;
    template_reference: string;
  }[];
}

interface ProgramDetails {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  organizer: string;
  department?: string | null;
  status: string;
  events: NestedEvent[];
}

export default function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [program, setProgram] = useState<ProgramDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Deletion States
  const [isDeleteProgramModalOpen, setIsDeleteProgramModalOpen] = useState(false);
  const [deleteChildEvents, setDeleteChildEvents] = useState(true);
  const [isDeletingProgram, setIsDeletingProgram] = useState(false);

  const [eventToDelete, setEventToDelete] = useState<{
    id: string;
    name: string;
    code: string;
    participantCount: number;
  } | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  const [eventForm, setEventForm] = useState({
    name: "",
    event_code: "",
    description: "",
    event_date: "",
    start_time: "10:00 AM",
    end_time: "01:00 PM",
    venue: "",
    organizer: "",
    department: "",
    status: "ACTIVE" as const,
  });

  const fetchProgram = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/programs/${id}`);
      const data = await res.json();
      if (data.program) {
        setProgram(data.program);
        setEventForm((prev) => ({
          ...prev,
          event_code: `${data.program.code.slice(0, 3)}-EVENT-${Date.now().toString().slice(-4)}`,
          event_date: data.program.start_date || "15 October 2026",
          venue: data.program.venue || "Campus Auditorium",
          organizer: data.program.organizer,
          department: data.program.department || "",
        }));
      } else {
        setNotification({ type: "error", text: "Program not found." });
      }
    } catch {
      setNotification({ type: "error", text: "Failed to load program details." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgram();
  }, [id]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program) return;

    try {
      setSubmittingEvent(true);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          program_id: program.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: "error", text: data.error || "Failed to create event" });
      } else {
        setNotification({
          type: "success",
          text: `Event "${data.event.name}" created under ${program.name}!`,
        });
        setIsAddEventOpen(false);
        fetchProgram();
      }
    } catch {
      setNotification({ type: "error", text: "Network error creating event." });
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleDeleteProgram = async () => {
    if (!program) return;
    setIsDeletingProgram(true);
    try {
      const res = await fetch(
        `/api/programs/${program.id}?deleteEvents=${deleteChildEvents}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        router.push("/admin/programs");
      } else {
        const data = await res.json();
        setNotification({
          type: "error",
          text: data.error || "Failed to delete program",
        });
        setIsDeleteProgramModalOpen(false);
      }
    } catch {
      setNotification({
        type: "error",
        text: "Network error while deleting program.",
      });
      setIsDeleteProgramModalOpen(false);
    } finally {
      setIsDeletingProgram(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    setIsDeletingEvent(true);
    try {
      const res = await fetch(`/api/events/${eventToDelete.id}?force=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotification({
          type: "success",
          text: `Event "${eventToDelete.name}" deleted successfully.`,
        });
        setEventToDelete(null);
        fetchProgram();
      } else {
        const data = await res.json();
        setNotification({
          type: "error",
          text: data.error || "Failed to delete event",
        });
      }
    } catch {
      setNotification({
        type: "error",
        text: "Network error while deleting event.",
      });
    } finally {
      setIsDeletingEvent(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[#E5E3D8] bg-white p-12 text-center text-xs text-[#57534E] flex items-center justify-center gap-2 max-w-7xl mx-auto">
        <Loader2 className="h-4 w-4 animate-spin text-[#C62828]" />
        Loading program overview and event tracks...
      </div>
    );
  }

  if (!program) {
    return (
      <div className="rounded-xl border border-[#E5E3D8] bg-white p-12 text-center text-xs text-[#8C8880] space-y-3 max-w-7xl mx-auto">
        <p className="font-bold text-[#1C1917]">Program not found</p>
        <Link
          href="/admin/programs"
          className="inline-flex items-center gap-1.5 text-[#C62828] font-bold hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Programs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E3D8] shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/programs"
            className="p-1.5 rounded-lg border border-[#D5D2C4] hover:bg-[#F2F1E4] text-[#57534E]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="h-6 w-6 rounded bg-[#C62828] text-white flex items-center justify-center text-xs">
                🏛️
              </span>
              <h1 className="text-lg font-bold text-[#1C1917]">{program.name}</h1>
              <span className="rounded-full bg-[#FFF9C4] px-2 py-0.5 font-mono text-[10px] font-bold text-[#7F5800] border border-[#FBC02D]">
                {program.code}
              </span>
              <span className="rounded-full bg-[#E8F5E9] px-2 py-0.5 text-[10px] font-bold text-[#2E7D32] border border-[#C8E6C9]">
                {program.status}
              </span>
            </div>
            <p className="text-xs text-[#57534E] mt-0.5">
              Program Hierarchy &bull; {program.events.length} Events Configured
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddEventOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#C62828] bg-white px-3.5 py-2 text-xs font-bold text-[#C62828] hover:bg-[#FFEBEE] transition"
          >
            <Plus className="h-4 w-4 text-[#C62828]" />
            Add Event Track
          </button>
          <Link
            href={`/admin/certificate-manager?programId=${program.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#C62828] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C] transition"
          >
            <FileBadge className="h-4 w-4 text-[#FBC02D]" />
            Open Certificate Studio
          </Link>
          <button
            onClick={() => setIsDeleteProgramModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFCDD2] bg-white px-3 py-2 text-xs font-bold text-[#C62828] hover:bg-[#FFEBEE] transition"
            title="Delete this program"
          >
            <Trash2 className="h-4 w-4 text-[#C62828]" />
            Delete Program
          </button>
        </div>
      </div>

      {/* Program Details Card */}
      <div className="rounded-xl border border-[#E5E3D8] bg-white p-5 shadow-2xs space-y-3">
        {program.description && (
          <p className="text-xs text-[#57534E]">{program.description}</p>
        )}

        <div className="flex items-center gap-6 text-xs text-[#8C8880] flex-wrap pt-2 border-t border-[#E5E3D8]">
          {program.start_date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#C62828]" />
              <strong>Dates:</strong> {program.start_date} {program.end_date ? `to ${program.end_date}` : ""}
            </span>
          )}
          {program.venue && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#FF8F00]" />
              <strong>Location:</strong> {program.venue}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-[#57534E]" />
            <strong>Department:</strong> {program.department || "General"}
          </span>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`rounded-lg p-3 text-xs flex items-center justify-between gap-2 ${
            notification.type === "success"
              ? "bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]"
              : "bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]"
          }`}
        >
          <span>{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-[11px] font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Events List Under This Program */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#1C1917] flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#C62828]"></span>
            Events Under {program.name} ({program.events.length})
          </h2>
          <span className="text-[11px] text-[#8C8880]">
            Structure: Program &rarr; Events &rarr; Participants &rarr; Certificate Template
          </span>
        </div>

        {program.events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D5D2C4] bg-white p-12 text-center text-xs text-[#8C8880] space-y-2">
            <p className="font-bold text-[#1C1917]">No events added yet</p>
            <p>Add events like Paper Presentation, Project Presentation, Quiz, etc. to this program.</p>
            <button
              onClick={() => setIsAddEventOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#C62828] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C]"
            >
              <Plus className="h-4 w-4 text-[#FBC02D]" />
              Add First Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {program.events.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border-2 border-[#E5E3D8] bg-white p-5 shadow-2xs hover:border-[#C62828] transition space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎪</span>
                      <h3 className="text-sm font-bold text-[#1C1917]">{event.name}</h3>
                      <span className="font-mono text-[10px] font-bold text-[#57534E] bg-[#FBFBF9] border border-[#E5E3D8] px-2 py-0.5 rounded">
                        {event.event_code}
                      </span>
                    </div>
                    <span className="text-xs text-[#57534E] block mt-1">
                      {event.event_date} {event.venue ? `• ${event.venue}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-[10px] font-bold text-[#2E7D32] border border-[#C8E6C9]">
                      Template Ready
                    </span>
                    <button
                      onClick={() =>
                        setEventToDelete({
                          id: event.id,
                          name: event.name,
                          code: event.event_code,
                          participantCount: event._count.participants,
                        })
                      }
                      className="p-1 rounded text-[#8C8880] hover:text-[#C62828] hover:bg-[#FFEBEE] transition"
                      title="Delete event track"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Event Statistics */}
                <div className="grid grid-cols-2 gap-2 bg-[#F8F7F0] p-3 rounded-lg border border-[#E5E3D8] text-xs">
                  <div>
                    <span className="text-[10px] text-[#8C8880] block">Rostered Participants:</span>
                    <span className="font-bold text-[#1C1917] text-sm">
                      {event._count.participants} Students
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8C8880] block">Template Status:</span>
                    <span className="font-bold text-[#2E7D32] text-sm flex items-center gap-1">
                      {event.templates.length > 0 ? "Configured" : "Default"}
                    </span>
                  </div>
                </div>

                {/* Action Links */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E5E3D8] gap-2">
                  <Link
                    href={`/admin/events/${event.id}/participants`}
                    className="flex-1 text-center py-2 px-3 rounded-lg bg-white border border-[#D5D2C4] hover:bg-[#F2F1E4] text-xs font-bold text-[#1C1917] transition"
                  >
                    👥 Participants ({event._count.participants})
                  </Link>
                  <Link
                    href={`/admin/certificate-manager?eventId=${event.id}`}
                    className="flex-1 text-center py-2 px-3 rounded-lg bg-[#C62828] hover:bg-[#B71C1C] text-xs font-bold text-white transition shadow-2xs"
                  >
                    📜 Design & Issue
                  </Link>
                  <button
                    onClick={() =>
                      setEventToDelete({
                        id: event.id,
                        name: event.name,
                        code: event.event_code,
                        participantCount: event._count.participants,
                      })
                    }
                    className="p-2 rounded-lg border border-[#FFCDD2] text-[#C62828] hover:bg-[#FFEBEE] transition"
                    title="Delete Event Track"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD EVENT MODAL */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">🎪</span>
                <h3 className="text-base font-bold text-[#1C1917]">
                  Add Event to {program.name}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEventOpen(false)}
                className="text-[#8C8880] hover:text-[#1C1917]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paper Presentation, Technical Quiz"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                  Event Code (Unique) *
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.event_code}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, event_code: e.target.value.toUpperCase() })
                  }
                  className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs font-mono text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                    Event Date *
                  </label>
                  <input
                    type="text"
                    required
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                    className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                    Venue / Hall
                  </label>
                  <input
                    type="text"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                  Track Description
                </label>
                <textarea
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEvent}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#C62828] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C] disabled:opacity-50"
                >
                  {submittingEvent ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#FBC02D]" />
                  ) : (
                    <Plus className="h-4 w-4 text-[#FBC02D]" />
                  )}
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PROGRAM CONFIRMATION MODAL */}
      {isDeleteProgramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1917]">Delete Program</h3>
                <p className="text-xs text-[#57534E]">Manage deletion for {program.name}.</p>
              </div>
            </div>

            <div className="rounded-lg bg-[#FAF9F5] border border-[#E5E3D8] p-3.5 text-xs text-[#57534E] space-y-1.5">
              <p><span className="font-bold text-[#1C1917]">Program:</span> {program.name} ({program.code})</p>
              <p><span className="font-bold text-[#1C1917]">Child Events:</span> {program.events.length}</p>
              <p><span className="font-bold text-[#1C1917]">Organizer:</span> {program.organizer}</p>
            </div>

            <div className="p-3 rounded-lg border border-[#E5E3D8] bg-[#FBFBF9] space-y-2 text-xs">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteChildEvents}
                  onChange={(e) => setDeleteChildEvents(e.target.checked)}
                  className="mt-0.5 rounded border-[#D5D2C4] text-[#C62828] focus:ring-[#C62828]"
                />
                <div>
                  <span className="font-bold text-[#1C1917] block">
                    Also delete all {program.events.length} child events
                  </span>
                  <span className="text-[11px] text-[#8C8880] block">
                    {deleteChildEvents
                      ? "Permanently deletes all events (Paper Presentation, Quiz, etc.) and their certificates."
                      : "Unlinks child events so they remain accessible as standalone events."}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E3D8]">
              <button
                type="button"
                onClick={() => setIsDeleteProgramModalOpen(false)}
                className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingProgram}
                onClick={handleDeleteProgram}
                className="rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B71C1C] disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingProgram && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Permanently Delete Program
              </button>
            </div>
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
                <p className="text-xs text-[#57534E]">Permanently remove this event from {program.name}.</p>
              </div>
            </div>

            <div className="rounded-lg bg-[#FAF9F5] border border-[#E5E3D8] p-3.5 text-xs text-[#57534E] space-y-1">
              <p><span className="font-bold text-[#1C1917]">Event:</span> {eventToDelete.name}</p>
              <p><span className="font-bold text-[#1C1917]">Event Code:</span> {eventToDelete.code}</p>
              <p><span className="font-bold text-[#1C1917]">Participants:</span> {eventToDelete.participantCount}</p>
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
                disabled={isDeletingEvent}
                onClick={handleDeleteEvent}
                className="rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B71C1C] disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingEvent && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Permanently Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
