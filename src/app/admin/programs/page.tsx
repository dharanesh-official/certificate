"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  Search,
  Calendar,
  MapPin,
  Building2,
  Users,
  Award,
  FileBadge,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
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

interface ProgramItem {
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
  created_at: string;
  events: NestedEvent[];
  _count: {
    events: number;
  };
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Program Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submittingProgram, setSubmittingProgram] = useState(false);
  const [programForm, setProgramForm] = useState({
    name: "",
    code: "",
    description: "",
    start_date: "",
    end_date: "",
    venue: "",
    organizer: "Kongu Engineering College (Autonomous)",
    department: "School of Computer Sciences",
    status: "ACTIVE" as const,
  });

  // Create Event under Program Modal State
  const [targetProgramForEvent, setTargetProgramForEvent] = useState<ProgramItem | null>(null);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: "",
    event_code: "",
    description: "",
    event_date: "",
    start_time: "09:30 AM",
    end_time: "01:00 PM",
    venue: "",
    organizer: "",
    department: "",
    status: "ACTIVE" as const,
  });

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Deletion states
  const [programToDelete, setProgramToDelete] = useState<ProgramItem | null>(null);
  const [deleteChildEvents, setDeleteChildEvents] = useState(true);
  const [isDeletingProgram, setIsDeletingProgram] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ id: string; name: string; code: string; programName: string } | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  const handleDeleteProgram = async () => {
    if (!programToDelete) return;
    setIsDeletingProgram(true);
    try {
      const res = await fetch(`/api/programs/${programToDelete.id}?deleteEvents=${deleteChildEvents}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: "error", text: data.error || "Failed to delete program." });
      } else {
        setNotification({ type: "success", text: data.message || "Program deleted successfully." });
        setProgramToDelete(null);
        fetchPrograms();
      }
    } catch {
      setNotification({ type: "error", text: "Network error deleting program." });
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
      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: "error", text: data.error || "Failed to delete event." });
      } else {
        setNotification({ type: "success", text: `Event "${eventToDelete.name}" deleted successfully.` });
        setEventToDelete(null);
        fetchPrograms();
      }
    } catch {
      setNotification({ type: "error", text: "Network error deleting event." });
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/programs");
      const data = await res.json();
      if (data.programs && Array.isArray(data.programs)) {
        setPrograms(data.programs);
      }
    } catch (err) {
      console.error("Failed to load programs:", err);
      setNotification({ type: "error", text: "Failed to load programs." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programForm.name || !programForm.code) {
      setNotification({ type: "error", text: "Program Name and Program Code are required." });
      return;
    }

    try {
      setSubmittingProgram(true);
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(programForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: "error", text: data.error || "Failed to create program" });
      } else {
        setNotification({
          type: "success",
          text: `Program "${data.program.name}" created successfully! You can now add events to it.`,
        });
        setIsCreateModalOpen(false);
        setProgramForm({
          name: "",
          code: "",
          description: "",
          start_date: "",
          end_date: "",
          venue: "",
          organizer: "Kongu Engineering College (Autonomous)",
          department: "School of Computer Sciences",
          status: "ACTIVE",
        });
        fetchPrograms();
      }
    } catch {
      setNotification({ type: "error", text: "Network error creating program." });
    } finally {
      setSubmittingProgram(false);
    }
  };

  const handleOpenAddEventModal = (program: ProgramItem) => {
    const codeSuffix = (program.events.length + 1).toString().padStart(2, "0");
    setTargetProgramForEvent(program);
    setEventForm({
      name: "",
      event_code: `${program.code.slice(0, 3)}-EV-${codeSuffix}`,
      description: "",
      event_date: program.start_date || "15 October 2026",
      start_time: "10:00 AM",
      end_time: "01:00 PM",
      venue: program.venue || "Campus Auditorium",
      organizer: program.organizer,
      department: program.department || "",
      status: "ACTIVE",
    });
  };

  const handleCreateEventUnderProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProgramForEvent) return;

    try {
      setSubmittingEvent(true);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          program_id: targetProgramForEvent.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: "error", text: data.error || "Failed to create event" });
      } else {
        setNotification({
          type: "success",
          text: `Event "${data.event.name}" created under ${targetProgramForEvent.name}! Ready for participants and template setup.`,
        });
        setTargetProgramForEvent(null);
        fetchPrograms();
      }
    } catch {
      setNotification({ type: "error", text: "Network error creating event." });
    } finally {
      setSubmittingEvent(false);
    }
  };

  const filteredPrograms = programs.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.department && p.department.toLowerCase().includes(search.toLowerCase())) ||
      p.events.some((ev) => ev.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalNestedEvents = programs.reduce((acc, p) => acc + p.events.length, 0);
  const totalRosteredParticipants = programs.reduce(
    (acc, p) => acc + p.events.reduce((eAcc, ev) => eAcc + ev._count.participants, 0),
    0
  );
  const totalTemplatesConfigured = programs.reduce(
    (acc, p) => acc + p.events.filter((ev) => ev.templates.length > 0).length,
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E3D8] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C62828] text-white">
              <Layers className="h-4 w-4 text-[#FBC02D]" />
            </span>
            <h1 className="text-xl font-bold text-[#1C1917]">
              Programs & Fests Management Hub
            </h1>
          </div>
          <p className="text-xs text-[#57534E] mt-1">
            Hierarchical Governance: <strong>Program</strong> (e.g. Quantum Fest) &rarr;{" "}
            <strong>Events</strong> (e.g. Paper Presentation, Quiz) &rarr;{" "}
            <strong>Participants</strong> &rarr; <strong>Certificate Templates</strong>
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#C62828] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C] transition cursor-pointer"
        >
          <Plus className="h-4 w-4 text-[#FBC02D]" />
          Create Main Program / Fest
        </button>
      </div>

      {/* Hierarchy Flow Visual Explainer Card */}
      <div className="rounded-xl border border-[#D5D2C4] bg-[#FFF9C4]/40 p-4 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#7F5800] font-bold">
            <Sparkles className="h-4 w-4 text-[#FF8F00]" />
            <span>Architecture Logic (Program &rarr; Events &rarr; Participants &rarr; Template):</span>
          </div>
          <span className="text-[11px] text-[#57534E]">
            Each event is managed independently with its own distinct participants and template.
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded-lg border border-[#E5E3D8] flex items-center gap-2 shadow-2xs">
            <span className="h-6 w-6 rounded-md bg-[#FFEBEE] text-[#C62828] flex items-center justify-center font-bold text-[11px] shrink-0">
              1
            </span>
            <div>
              <span className="font-bold text-[#1C1917] block">Main Program</span>
              <span className="text-[10px] text-[#8C8880]">e.g. Quantum Fest 2026</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-[#E5E3D8] flex items-center gap-2 shadow-2xs">
            <span className="h-6 w-6 rounded-md bg-[#FFF9C4] text-[#7F5800] flex items-center justify-center font-bold text-[11px] shrink-0">
              2
            </span>
            <div>
              <span className="font-bold text-[#1C1917] block">Multiple Events</span>
              <span className="text-[10px] text-[#8C8880]">Paper Presentation, Quiz, etc.</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-[#E5E3D8] flex items-center gap-2 shadow-2xs">
            <span className="h-6 w-6 rounded-md bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-bold text-[11px] shrink-0">
              3
            </span>
            <div>
              <span className="font-bold text-[#1C1917] block">Event Participants</span>
              <span className="text-[10px] text-[#8C8880]">Rostered per individual event</span>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-[#E5E3D8] flex items-center gap-2 shadow-2xs">
            <span className="h-6 w-6 rounded-md bg-[#EDE7F6] text-[#6A1B9A] flex items-center justify-center font-bold text-[11px] shrink-0">
              4
            </span>
            <div>
              <span className="font-bold text-[#1C1917] block">Separate Template</span>
              <span className="text-[10px] text-[#8C8880]">Customized per event</span>
            </div>
          </div>
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
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[11px] font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8880]">
            <span className="text-xs font-semibold">Active Programs</span>
            <Layers className="h-4 w-4 text-[#C62828]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1C1917]">{programs.length}</div>
          <p className="text-[10px] text-[#57534E] mt-0.5">Main institutional fests</p>
        </div>

        <div className="rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8880]">
            <span className="text-xs font-semibold">Total Nested Events</span>
            <Calendar className="h-4 w-4 text-[#FF8F00]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1C1917]">{totalNestedEvents}</div>
          <p className="text-[10px] text-[#57534E] mt-0.5">Competitive & academic tracks</p>
        </div>

        <div className="rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8880]">
            <span className="text-xs font-semibold">Enrolled Participants</span>
            <Users className="h-4 w-4 text-[#2E7D32]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1C1917]">{totalRosteredParticipants}</div>
          <p className="text-[10px] text-[#57534E] mt-0.5">Across all events</p>
        </div>

        <div className="rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#8C8880]">
            <span className="text-xs font-semibold">Templates Ready</span>
            <FileBadge className="h-4 w-4 text-[#FBC02D]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1C1917]">{totalTemplatesConfigured}</div>
          <p className="text-[10px] text-[#57534E] mt-0.5">Custom event designs</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E5E3D8] shadow-2xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C8880]" />
          <input
            type="text"
            placeholder="Search programs, events (e.g. Quantum Fest, Quiz)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] pl-9 pr-3.5 py-1.5 text-xs text-[#1C1917] focus:border-[#C62828] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] px-3 py-1.5 text-xs font-semibold text-[#1C1917] focus:border-[#C62828] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Programs</option>
            <option value="COMPLETED">Completed</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Programs List */}
      {loading ? (
        <div className="rounded-xl border border-[#E5E3D8] bg-white p-12 text-center text-xs text-[#57534E] flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#C62828]" />
          Loading programs and nested event hierarchy...
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="rounded-xl border border-[#E5E3D8] bg-white p-12 text-center text-xs text-[#8C8880] space-y-3">
          <Layers className="h-10 w-10 mx-auto text-[#D5D2C4]" />
          <p className="font-bold text-[#1C1917] text-sm">No programs found</p>
          <p className="max-w-md mx-auto">
            Create your first main program (such as Quantum Fest), and then add events (like Paper
            Presentation, Project Presentation, Quiz) beneath it.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#C62828] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C]"
          >
            <Plus className="h-4 w-4 text-[#FBC02D]" />
            Create First Program
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPrograms.map((program) => (
            <div
              key={program.id}
              className="rounded-xl border-2 border-[#E5E3D8] bg-white shadow-xs overflow-hidden hover:border-[#D5D2C4] transition"
            >
              {/* Program Header */}
              <div className="bg-[#FAF9F5] border-b border-[#E5E3D8] p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="h-7 w-7 rounded-lg bg-[#C62828] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                        🏛️
                      </span>
                      <h2 className="text-base font-bold text-[#1C1917]">{program.name}</h2>
                      <span className="rounded-full bg-[#FFF9C4] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#7F5800] border border-[#FBC02D]">
                        {program.code}
                      </span>
                      <span className="rounded-full bg-[#E8F5E9] px-2 py-0.5 text-[10px] font-bold text-[#2E7D32] border border-[#C8E6C9]">
                        {program.status}
                      </span>
                    </div>

                    {program.description && (
                      <p className="text-xs text-[#57534E] mt-1.5 max-w-3xl">
                        {program.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-[#8C8880] mt-3 flex-wrap">
                      {program.start_date && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#C62828]" />
                          {program.start_date} {program.end_date ? `to ${program.end_date}` : ""}
                        </span>
                      )}
                      {program.venue && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#FF8F00]" />
                          {program.venue}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-[#57534E]" />
                        {program.organizer} {program.department ? `• ${program.department}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Program Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => handleOpenAddEventModal(program)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#C62828] bg-white px-3 py-1.5 text-xs font-bold text-[#C62828] hover:bg-[#FFEBEE] transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#C62828]" />
                      Add Event to {program.name.split(" ")[0]}
                    </button>
                    <Link
                      href={`/admin/certificate-manager?programId=${program.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#C62828] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C] transition"
                    >
                      <FileBadge className="h-3.5 w-3.5 text-[#FBC02D]" />
                      Certificate Studio
                    </Link>
                    <button
                      onClick={() => setProgramToDelete(program)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFCDD2] bg-white px-3 py-1.5 text-xs font-bold text-[#C62828] hover:bg-[#FFEBEE] transition cursor-pointer"
                      title="Delete this program"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Nested Events Under This Program */}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#C62828]"></span>
                    Events Under {program.name} ({program.events.length})
                  </span>
                  <span className="text-[11px] text-[#8C8880]">
                    Each event maintains its own independent participants and certificate template
                  </span>
                </div>

                {program.events.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#D5D2C4] bg-[#FAF9F5] p-6 text-center text-xs text-[#8C8880]">
                    No events added to this program yet. Click &ldquo;Add Event&rdquo; to add tracks
                    like Paper Presentation, Project Presentation, Quiz, etc.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {program.events.map((event) => {
                      const hasActiveTemplate = event.templates.length > 0;
                      return (
                        <div
                          key={event.id}
                          className="rounded-lg border border-[#E5E3D8] bg-[#FBFBF9] p-3.5 hover:border-[#C62828] hover:bg-white transition space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold text-[#1C1917]">{event.name}</h3>
                                <span className="font-mono text-[9px] font-semibold text-[#8C8880] bg-white border border-[#E5E3D8] px-1.5 py-0.5 rounded">
                                  {event.event_code}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#57534E] block mt-0.5">
                                {event.event_date} {event.venue ? `• ${event.venue}` : ""}
                              </span>
                            </div>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold border shrink-0 ${
                                hasActiveTemplate
                                    ? "bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]"
                                  : "bg-[#FFF9C4] text-[#7F5800] border-[#FBC02D]"
                              }`}
                            >
                              {hasActiveTemplate ? "Template Ready" : "Template Default"}
                            </span>
                          </div>

                          {/* Event Summary Stats & Direct Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#E5E3D8] text-xs">
                            <div className="flex items-center gap-3 text-[11px] text-[#57534E]">
                              <span className="flex items-center gap-1 font-medium">
                                <Users className="h-3 w-3 text-[#2E7D32]" />
                                <strong>{event._count.participants}</strong> Participants
                              </span>
                              <span className="flex items-center gap-1 font-medium text-[#2E7D32]">
                                <CheckCircle2 className="h-3 w-3" />
                                {event.templates.length > 0 ? "Template Ready" : "Default"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/admin/events/${event.id}/participants`}
                                className="px-2 py-1 rounded bg-white border border-[#D5D2C4] hover:bg-[#F2F1E4] text-[10px] font-bold text-[#1C1917] transition"
                              >
                                👥 Participants
                              </Link>
                              <Link
                                href={`/admin/certificate-manager?eventId=${event.id}`}
                                className="px-2 py-1 rounded bg-[#C62828] hover:bg-[#B71C1C] text-[10px] font-bold text-white transition shadow-2xs"
                              >
                                📜 Template & Issue
                              </Link>
                              <button
                                onClick={() =>
                                  setEventToDelete({
                                    id: event.id,
                                    name: event.name,
                                    code: event.event_code,
                                    programName: program.name,
                                  })
                                }
                                className="p-1 rounded bg-white border border-[#FFCDD2] hover:bg-[#FFEBEE] text-[#C62828] transition"
                                title={`Delete event ${event.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PROGRAM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#C62828]" />
                <h3 className="text-base font-bold text-[#1C1917]">Create Main Program / Fest</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#8C8880] hover:text-[#1C1917]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                  Program / Fest Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quantum Fest 2026"
                  value={programForm.name}
                  onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                  Program Code (Unique) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QUANTUM-2026"
                  value={programForm.code}
                  onChange={(e) =>
                    setProgramForm({ ...programForm, code: e.target.value.toUpperCase() })
                  }
                  className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs font-mono text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                    Start Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 15 October 2026"
                    value={programForm.start_date}
                    onChange={(e) => setProgramForm({ ...programForm, start_date: e.target.value })}
                    className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                    End Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 16 October 2026"
                    value={programForm.end_date}
                    onChange={(e) => setProgramForm({ ...programForm, end_date: e.target.value })}
                    className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                    Venue / Campus Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Convention Center"
                    value={programForm.venue}
                    onChange={(e) => setProgramForm({ ...programForm, venue: e.target.value })}
                    className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                    Hosting Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. School of Computer Sciences"
                    value={programForm.department}
                    onChange={(e) => setProgramForm({ ...programForm, department: e.target.value })}
                    className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                  Organizer / Institution *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kongu Engineering College (Autonomous)"
                  value={programForm.organizer}
                  onChange={(e) => setProgramForm({ ...programForm, organizer: e.target.value })}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                  Description / Theme
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. National Level Inter-Collegiate Technical Symposium featuring multiple competitive tracks."
                  value={programForm.description}
                  onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProgram}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#C62828] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C] disabled:opacity-50"
                >
                  {submittingProgram ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#FBC02D]" />
                  ) : (
                    <Plus className="h-4 w-4 text-[#FBC02D]" />
                  )}
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD EVENT UNDER PROGRAM MODAL */}
      {targetProgramForEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">🎪</span>
                  <h3 className="text-base font-bold text-[#1C1917]">
                    Add Event to {targetProgramForEvent.name}
                  </h3>
                </div>
                <p className="text-xs text-[#57534E] mt-0.5">
                  e.g. Paper Presentation, Project Presentation, Quiz, Poster Presentation
                </p>
              </div>
              <button
                onClick={() => setTargetProgramForEvent(null)}
                className="text-[#8C8880] hover:text-[#1C1917]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEventUnderProgram} className="space-y-3.5 text-xs">
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
                    placeholder="e.g. 15 October 2026"
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
                    placeholder="e.g. Seminar Hall A, Lab 2"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                  Event Description / Track Guidelines
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Presentation of research papers on AI and cybersecurity."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
                <button
                  type="button"
                  onClick={() => setTargetProgramForEvent(null)}
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
      {programToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1917]">Delete Program</h3>
                <p className="text-xs text-[#57534E]">Manage deletion for this umbrella fest.</p>
              </div>
            </div>

            <div className="rounded-lg bg-[#FAF9F5] border border-[#E5E3D8] p-3.5 text-xs text-[#57534E] space-y-1.5">
              <p><span className="font-bold text-[#1C1917]">Program:</span> {programToDelete.name} ({programToDelete.code})</p>
              <p><span className="font-bold text-[#1C1917]">Child Events:</span> {programToDelete.events.length}</p>
              <p><span className="font-bold text-[#1C1917]">Organizer:</span> {programToDelete.organizer}</p>
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
                    Also delete all {programToDelete.events.length} child events
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
                onClick={() => setProgramToDelete(null)}
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
                <p className="text-xs text-[#57534E]">Permanently remove this event from {eventToDelete.programName}.</p>
              </div>
            </div>

            <div className="rounded-lg bg-[#FAF9F5] border border-[#E5E3D8] p-3.5 text-xs text-[#57534E] space-y-1">
              <p><span className="font-bold text-[#1C1917]">Event:</span> {eventToDelete.name}</p>
              <p><span className="font-bold text-[#1C1917]">Event Code:</span> {eventToDelete.code}</p>
              <p><span className="font-bold text-[#1C1917]">Parent Program:</span> {eventToDelete.programName}</p>
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
