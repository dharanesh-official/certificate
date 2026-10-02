"use client";

import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  FileCheck,
  ShieldCheck,
  Download,
  Printer,
  ExternalLink,
  AlertCircle,
  Loader2,
  Building,
  CheckCircle2,
  Award,
  RotateCcw,
  Search,
  User,
  Layers,
} from "lucide-react";
import Link from "next/link";

interface EventItem {
  id: string;
  name: string;
  event_code: string;
  event_date: string;
  organizer: string;
  department?: string | null;
  program?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface ParticipantData {
  id: string;
  roll_number: string;
  name: string;
  department?: string | null;
  institution?: string | null;
}

interface CertificateResult {
  certificateId: string;
  status: string;
  issuedAt: string;
  downloadUrl: string;
  verifyUrl: string;
  participant: ParticipantData;
  event: EventItem;
}

export default function GenerateCertificatePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<ParticipantData[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Verification state (Step 3)
  const [verifiedData, setVerifiedData] = useState<{
    participant: ParticipantData;
    event: EventItem;
  } | null>(null);

  // Generated state (Step 4)
  const [certificateResult, setCertificateResult] = useState<CertificateResult | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/events?public=true");
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          setEvents(data.events);
          if (data.events.length > 0) {
            setSelectedEventId(data.events[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setIsLoadingEvents(false);
      }
    }
    loadEvents();
  }, []);

  // Fetch real-time suggestions restricted strictly to the selected event
  useEffect(() => {
    if (!selectedEventId || !searchQuery.trim() || verifiedData) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoadingSuggestions(true);
        const res = await fetch(
          `/api/participants/suggest?eventId=${selectedEventId}&q=${encodeURIComponent(
            searchQuery.trim()
          )}`
        );
        const data = await res.json();
        if (data.participants && Array.isArray(data.participants)) {
          setSuggestions(data.participants);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedEventId, verifiedData]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Event selection change resets participant search
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setVerifiedData(null);
    setCertificateResult(null);
    setErrorMessage(null);
  };

  // Select participant from suggestion
  const handleSelectSuggestion = (participant: ParticipantData) => {
    setSearchQuery(participant.roll_number);
    setShowSuggestions(false);
    const selectedEv = events.find((e) => e.id === selectedEventId);
    if (selectedEv) {
      setVerifiedData({
        participant,
        event: selectedEv,
      });
      setErrorMessage(null);
    }
  };

  // Lookup participant
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setVerifiedData(null);
    setCertificateResult(null);
    setShowSuggestions(false);

    if (!selectedEventId) {
      setErrorMessage("Please select an event.");
      return;
    }
    if (!searchQuery.trim()) {
      setErrorMessage("Please enter your Name or Roll Number.");
      return;
    }

    setIsValidating(true);
    try {
      const res = await fetch("/api/participants/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          query: searchQuery.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(
          data.error ||
            "Participant not found in the selected event. Please make sure you selected the right event and entered the correct name or roll number."
        );
      } else {
        setVerifiedData({
          participant: data.participant,
          event: data.event,
        });
      }
    } catch {
      setErrorMessage("A network error occurred while validating. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  // Generate Certificate dynamically on the fly (Zero DB Storage)
  const handleGenerate = async () => {
    if (!verifiedData) return;
    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: verifiedData.event.id,
          participantId: verifiedData.participant.id,
          rollNumber: verifiedData.participant.roll_number,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(
          data.error || "We couldn't generate your certificate right now. Please try again."
        );
      } else {
        setCertificateResult(data);
      }
    } catch {
      setErrorMessage("Certificate generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setVerifiedData(null);
    setCertificateResult(null);
    setErrorMessage(null);
    setSearchQuery("");
    setSuggestions([]);
  };

  const handlePrint = (downloadUrl: string) => {
    const printWindow = window.open(downloadUrl, "_blank");
    if (printWindow) {
      printWindow.focus();
    }
  };

  const currentSelectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F0]">
      <Navbar />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D5D2C4] bg-white px-3 py-1 text-xs font-semibold text-[#8D6E63] shadow-xs mb-3">
              <FileCheck className="h-3.5 w-3.5 text-[#C62828]" />
              Official Participant Registry
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1C1917]">
              Generate Your Certificate
            </h1>
            <p className="mt-2 text-sm text-[#57534E]">
              Select your event, search your registered Name or Roll Number, and download your authentic on-demand certificate.
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="mb-8 grid grid-cols-3 gap-2 text-center text-xs font-medium text-[#57534E]">
            <div
              className={`p-2.5 rounded-lg border ${
                !verifiedData && !certificateResult
                  ? "border-[#C62828] bg-white text-[#C62828] font-bold"
                  : "border-[#E5E3D8] bg-[#F2F1E4]"
              }`}
            >
              1. Event & Participant
            </div>
            <div
              className={`p-2.5 rounded-lg border ${
                verifiedData && !certificateResult
                  ? "border-[#FF8F00] bg-white text-[#FF8F00] font-bold"
                  : "border-[#E5E3D8] bg-[#F2F1E4]"
              }`}
            >
              2. Verify Details
            </div>
            <div
              className={`p-2.5 rounded-lg border ${
                certificateResult
                  ? "border-[#2E7D32] bg-white text-[#2E7D32] font-bold"
                  : "border-[#E5E3D8] bg-[#F2F1E4]"
              }`}
            >
              3. Download Certificate
            </div>
          </div>

          {/* ERROR ALERT */}
          {errorMessage && (
            <div className="mb-6 rounded-lg border border-[#FFCDD2] bg-[#FFEBEE] p-4 text-xs text-[#C62828] flex items-start gap-3 shadow-xs">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Validation Notice</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* STEP 1: INPUT FORM */}
          {!verifiedData && !certificateResult && (
            <div className="rounded-xl border border-[#E5E3D8] bg-white p-6 sm:p-8 shadow-xs">
              <form onSubmit={handleLookup} className="space-y-6">
                {/* Event Select */}
                <div>
                  <label
                    htmlFor="event-select"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1C1917] mb-2"
                  >
                    Step 01 &mdash; Select Event
                  </label>
                  {isLoadingEvents ? (
                    <div className="flex items-center gap-2 text-xs text-[#57534E] py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#C62828]" />
                      Loading active events...
                    </div>
                  ) : events.length === 0 ? (
                    <p className="text-xs text-[#8C8880] italic">
                      No active events available currently. Please check back later.
                    </p>
                  ) : (
                    <select
                      id="event-select"
                      value={selectedEventId}
                      onChange={(e) => handleEventChange(e.target.value)}
                      className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] px-3.5 py-2.5 text-sm text-[#1C1917] focus:border-[#C62828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C62828]"
                      required
                    >
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.program ? `[${ev.program.name}] ` : ""}{ev.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {currentSelectedEvent && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#57534E]">
                      {currentSelectedEvent.program && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#F3EEFF] border border-[#D8C7FF] px-2 py-0.5 font-bold text-[#673AB7]">
                          <Layers className="h-3 w-3" />
                          Fest: {currentSelectedEvent.program.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-[#8D6E63]" />
                        {currentSelectedEvent.organizer}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name / Roll Number Input with Live Suggestions */}
                <div className="relative" ref={suggestionsRef}>
                  <label
                    htmlFor="participant-query"
                    className="block text-xs font-bold uppercase tracking-wider text-[#1C1917] mb-2"
                  >
                    Step 02 &mdash; Enter Name or Roll Number
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#8C8880]" />
                    <input
                      id="participant-query"
                      type="text"
                      autoComplete="off"
                      placeholder={
                        currentSelectedEvent
                          ? `Start typing name or roll number in ${currentSelectedEvent.name}...`
                          : "Type your registered Name or Roll Number..."
                      }
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] pl-10 pr-10 py-2.5 text-sm text-[#1C1917] placeholder:text-[#8C8880] focus:border-[#C62828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C62828]"
                      required
                    />
                    {isLoadingSuggestions && (
                      <div className="absolute right-3.5 top-3">
                        <Loader2 className="h-4 w-4 animate-spin text-[#C62828]" />
                      </div>
                    )}
                  </div>

                  {/* Suggestions Dropdown (Restricted strictly to the selected event) */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-[#D5D2C4] bg-white shadow-lg overflow-hidden divide-y divide-[#E5E3D8] max-h-60 overflow-y-auto">
                      <div className="bg-[#FAF9F5] px-3.5 py-1.5 text-[10px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center justify-between">
                        <span>Participants in {currentSelectedEvent?.name}</span>
                        <span>{suggestions.length} match(es)</span>
                      </div>
                      {suggestions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(p)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-[#F2F1E4] transition flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFEBEE] text-[#C62828] text-xs font-bold shrink-0">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <span className="font-bold text-[#1C1917] block">
                                {p.name}
                              </span>
                              <span className="text-[11px] text-[#57534E] block">
                                {p.department || "Participant"}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-[#7F5800] bg-[#FFF9C4] px-2 py-0.5 rounded border border-[#FBC02D] shrink-0">
                            {p.roll_number}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#57534E]">
                    <span>
                      Suggestions are restricted strictly to{" "}
                      <strong>{currentSelectedEvent?.name || "the selected event"}</strong>.
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isValidating || isLoadingEvents}
                  className="w-full rounded-lg bg-[#C62828] px-4 py-3 text-sm font-semibold text-white shadow-xs hover:bg-[#B71C1C] disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#FBC02D]" />
                      Searching event roster...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-[#FBC02D]" />
                      Verify Participant & Generate
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: VERIFY PARTICIPANT DETAILS */}
          {verifiedData && !certificateResult && (
            <div className="rounded-xl border border-[#D5D2C4] bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-[#E5E3D8] pb-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF8F00]">
                    Step 02 of 03
                  </span>
                  <h2 className="text-xl font-bold text-[#1C1917] mt-0.5">
                    Official Participant Verified
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] px-3 py-1 text-xs font-semibold text-[#2E7D32] border border-[#C8E6C9]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Event Roster Match
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-[#F8F7F0] p-4 text-xs border border-[#E5E3D8]">
                <div>
                  <span className="text-[#8C8880] block">Participant Name</span>
                  <span className="text-base font-bold text-[#1C1917] block font-serif">
                    {verifiedData.participant.name}
                  </span>
                </div>
                <div>
                  <span className="text-[#8C8880] block">Roll Number / ID</span>
                  <span className="text-sm font-bold font-mono text-[#1C1917] block">
                    {verifiedData.participant.roll_number}
                  </span>
                </div>
                <div>
                  <span className="text-[#8C8880] block">Department / Branch</span>
                  <span className="text-xs font-medium text-[#44403C] block">
                    {verifiedData.participant.department || "General Participant"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8C8880] block">Event & Program</span>
                  <span className="text-xs font-medium text-[#44403C] block">
                    {verifiedData.event.program ? `${verifiedData.event.program.name} - ` : ""}
                    {verifiedData.event.name} ({verifiedData.event.event_date})
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 rounded-lg bg-[#C62828] px-5 py-3 text-sm font-semibold text-white shadow-xs hover:bg-[#B71C1C] disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#FBC02D]" />
                      Generating Dynamic Certificate...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4 text-[#FBC02D]" />
                      Download Certificate (PDF)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-3 text-xs font-medium text-[#57534E] hover:bg-[#F2F1E4] transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Search Another
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: GENERATED CERTIFICATE DISPLAY */}
          {certificateResult && (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="rounded-xl border border-[#C8E6C9] bg-[#E8F5E9] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2E7D32] text-white">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1B5E20]">
                      Certificate Generated Successfully
                    </h2>
                    <p className="text-xs text-[#2E7D32]">
                      Identifier:{" "}
                      <span className="font-mono font-bold text-[#1C1917]">
                        {certificateResult.certificateId}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={certificateResult.downloadUrl}
                    download={`Certificate-${certificateResult.certificateId}.pdf`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#C62828] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C] transition"
                  >
                    <Download className="h-3.5 w-3.5 text-[#FBC02D]" />
                    Download PDF
                  </a>
                  <button
                    onClick={() => handlePrint(certificateResult.downloadUrl)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2C4] bg-white px-3.5 py-2 text-xs font-medium text-[#1C1917] hover:bg-[#F2F1E4] transition cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </button>
                  <Link
                    href={`/verify/${certificateResult.certificateId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2C4] bg-white px-3.5 py-2 text-xs font-medium text-[#1C1917] hover:bg-[#F2F1E4] transition"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-[#2E7D32]" />
                    Verify
                    <ExternalLink className="h-3 w-3 text-[#8C8880]" />
                  </Link>
                </div>
              </div>

              {/* Certificate Summary Card */}
              <div className="rounded-xl border border-[#E5E3D8] bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3 text-xs">
                  <span className="font-bold text-[#1C1917]">
                    Event Track: {certificateResult.event.name}
                  </span>
                  <span className="text-[#8C8880]">
                    {certificateResult.event.event_date}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-[#8C8880] uppercase tracking-wider block">
                      Awarded To
                    </span>
                    <span className="font-bold text-[#1C1917] text-sm font-serif">
                      {certificateResult.participant.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8C8880] uppercase tracking-wider block">
                      Roll Number
                    </span>
                    <span className="font-mono font-bold text-[#1C1917] text-sm">
                      {certificateResult.participant.roll_number}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-[#FAF9F5] p-3 text-[11px] text-[#57534E] border border-[#E5E3D8] flex items-center justify-between">
                  <span>
                    Generated on-demand strictly from your event roster and certificate template.
                  </span>
                  <button
                    onClick={handleReset}
                    className="font-bold text-[#C62828] hover:underline cursor-pointer"
                  >
                    Generate Another
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
