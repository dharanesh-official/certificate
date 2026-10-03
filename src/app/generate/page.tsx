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
  ArrowRight,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface ProgramItem {
  id: string;
  name: string;
  code: string;
}

interface EventItem {
  id: string;
  name: string;
  event_code: string;
  event_date: string;
  organizer: string;
  department?: string | null;
  status: string;
  program?: ProgramItem | null;
}

interface ParticipantData {
  id: string;
  roll_number: string;
  name: string;
  department?: string | null;
  institution?: string | null;
  eligible?: boolean;
}

interface SearchResultItem {
  participant: ParticipantData;
  event: EventItem;
  certificateAvailable: boolean;
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

interface SearchMetadata {
  query: string;
  total: number;
  hasMultipleParticipantsWithSameName: boolean;
  distinctRollNumbers: string[];
}

export default function GenerateCertificatePage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Search Results
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchMetadata, setSearchMetadata] = useState<SearchMetadata | null>(null);
  const [searchError, setSearchError] = useState<{
    type: "NOT_FOUND" | "NO_CERTIFICATES" | "ERROR";
    message: string;
  } | null>(null);

  // Live Auto-suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Selected event & participant for certificate generation
  const [selectedMatch, setSelectedMatch] = useState<SearchResultItem | null>(null);
  const [certificateResult, setCertificateResult] = useState<CertificateResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Live suggestions across events as the user types
  useEffect(() => {
    if (!searchQuery.trim() || selectedMatch || searchResults.length > 0) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoadingSuggestions(true);
        const res = await fetch(
          `/api/participants/suggest?q=${encodeURIComponent(searchQuery.trim())}`
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
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedMatch, searchResults.length]);

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

  // 1. Search across all events by Name or Roll Number
  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToSearch = (customQuery !== undefined ? customQuery : searchQuery).trim();

    if (!queryToSearch) {
      setSearchError({
        type: "ERROR",
        message: "Please enter your Name or Roll Number to search.",
      });
      return;
    }

    setSearchError(null);
    setSelectedMatch(null);
    setCertificateResult(null);
    setGenerationError(null);
    setShowSuggestions(false);
    setIsSearching(true);

    try {
      const res = await fetch("/api/participants/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryToSearch }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.status === "NOT_FOUND" || res.status === 404) {
          setSearchError({
            type: "NOT_FOUND",
            message:
              data.error ||
              `No participant record found for "${queryToSearch}". Please verify your Name or Roll Number spelling and try again.`,
          });
          setSearchResults([]);
          setSearchMetadata(null);
        } else if (data.status === "NO_CERTIFICATES" || res.status === 403) {
          setSearchError({
            type: "NO_CERTIFICATES",
            message:
              data.error ||
              `A participant record was found for "${queryToSearch}", but no certificates are currently available (record may be ineligible or event is not active).`,
          });
          setSearchResults([]);
          setSearchMetadata(null);
        } else {
          setSearchError({
            type: "ERROR",
            message: data.error || "A network error occurred while searching. Please try again.",
          });
          setSearchResults([]);
          setSearchMetadata(null);
        }
      } else {
        const results: SearchResultItem[] = data.results || [];
        setSearchResults(results);
        setSearchMetadata({
          query: data.query || queryToSearch,
          total: data.total || results.length,
          hasMultipleParticipantsWithSameName: !!data.hasMultipleParticipantsWithSameName,
          distinctRollNumbers: data.distinctRollNumbers || [],
        });
      }
    } catch {
      setSearchError({
        type: "ERROR",
        message: "An error occurred while connecting to the server. Please check your connection.",
      });
      setSearchResults([]);
      setSearchMetadata(null);
    } finally {
      setIsSearching(false);
    }
  };

  // 2. User selects an event from the available events list
  const handleSelectEvent = async (item: SearchResultItem) => {
    setSelectedMatch(item);
    setGenerationError(null);
    setCertificateResult(null);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: item.event.id,
          participantId: item.participant.id,
          rollNumber: item.participant.roll_number,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenerationError(
          data.error || "We couldn't generate your certificate right now. Please try again."
        );
      } else {
        setCertificateResult(data);
      }
    } catch {
      setGenerationError("Certificate generation failed due to a network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Navigation handlers
  const handleBackToEvents = () => {
    setSelectedMatch(null);
    setCertificateResult(null);
    setGenerationError(null);
  };

  const handleResetSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchMetadata(null);
    setSearchError(null);
    setSelectedMatch(null);
    setCertificateResult(null);
    setGenerationError(null);
    setSuggestions([]);
  };

  const handlePrint = (downloadUrl: string) => {
    const printWindow = window.open(downloadUrl, "_blank");
    if (printWindow) {
      printWindow.focus();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F0]">
      <Navbar />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D5D2C4] bg-white px-3.5 py-1 text-xs font-semibold text-[#8D6E63] shadow-xs mb-3">
              <Sparkles className="h-3.5 w-3.5 text-[#C62828]" />
              Instant Certificate Issuance
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1C1917]">
              Find & Download Your Certificate
            </h1>
            <p className="mt-2 text-sm text-[#57534E] leading-relaxed">
              Enter your Name or Roll Number. We will automatically search across all events and show you where your certificates are ready.
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="mb-8 grid grid-cols-3 gap-2 text-center text-xs font-medium text-[#57534E]">
            <div
              className={`p-2.5 rounded-lg border transition ${
                !selectedMatch && searchResults.length === 0
                  ? "border-[#C62828] bg-white text-[#C62828] font-bold shadow-2xs"
                  : "border-[#E5E3D8] bg-[#F2F1E4]"
              }`}
            >
              1. Enter Name or Roll No
            </div>
            <div
              className={`p-2.5 rounded-lg border transition ${
                !selectedMatch && searchResults.length > 0
                  ? "border-[#FF8F00] bg-white text-[#FF8F00] font-bold shadow-2xs"
                  : "border-[#E5E3D8] bg-[#F2F1E4]"
              }`}
            >
              2. Select Available Event {searchResults.length > 0 ? `(${searchResults.length})` : ""}
            </div>
            <div
              className={`p-2.5 rounded-lg border transition ${
                selectedMatch
                  ? "border-[#2E7D32] bg-white text-[#2E7D32] font-bold shadow-2xs"
                  : "border-[#E5E3D8] bg-[#F2F1E4]"
              }`}
            >
              3. View & Download PDF
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 1: SEARCH INPUT (When not viewing a selected certificate) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {!selectedMatch && (
            <div className="space-y-6">
              {/* Search Card */}
              <div className="rounded-xl border border-[#D5D2C4] bg-white p-6 sm:p-8 shadow-xs">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="relative" ref={suggestionsRef}>
                    <label
                      htmlFor="universal-search-input"
                      className="block text-xs font-bold uppercase tracking-wider text-[#1C1917] mb-2"
                    >
                      Enter Your Name or Roll Number
                    </label>

                    <div className="relative flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#8C8880]" />
                        <input
                          id="universal-search-input"
                          type="text"
                          autoComplete="off"
                          placeholder="e.g. John Doe or 24ISR001..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => {
                            if (suggestions.length > 0) setShowSuggestions(true);
                          }}
                          className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] pl-10 pr-10 py-3 text-sm text-[#1C1917] placeholder:text-[#8C8880] focus:border-[#C62828] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C62828]"
                          required
                        />
                        {isLoadingSuggestions && (
                          <div className="absolute right-3.5 top-3.5">
                            <Loader2 className="h-4 w-4 animate-spin text-[#C62828]" />
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isSearching || !searchQuery.trim()}
                        className="rounded-lg bg-[#C62828] px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-[#B71C1C] disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-[#FBC02D]" />
                            Searching across all events...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 text-[#FBC02D]" />
                            Search Certificates
                          </>
                        )}
                      </button>
                    </div>

                    {/* Auto-suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-30 mt-1 w-full rounded-xl border border-[#D5D2C4] bg-white shadow-xl overflow-hidden divide-y divide-[#E5E3D8] max-h-64 overflow-y-auto">
                        <div className="bg-[#FAF9F5] px-3.5 py-1.5 text-[10px] font-bold text-[#8C8880] uppercase tracking-wider flex items-center justify-between">
                          <span>Matching Participants Across Events</span>
                          <span>{suggestions.length} match(es)</span>
                        </div>
                        {suggestions.map((p) => (
                          <button
                            key={`${p.id}-${p.roll_number}`}
                            type="button"
                            onClick={() => {
                              setSearchQuery(p.roll_number);
                              setShowSuggestions(false);
                              handleSearch(undefined, p.roll_number);
                            }}
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
                                  {p.event?.name ? `${p.event.name}` : p.department || "Participant"}
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

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#57534E]">
                      <span>
                        Tip: You can search with either your <strong>official Name</strong> or <strong>Roll Number</strong>.
                      </span>
                      {searchResults.length > 0 && (
                        <button
                          type="button"
                          onClick={handleResetSearch}
                          className="text-[#C62828] hover:underline font-semibold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* ERROR / NOTICE STATES */}
              {/* ───────────────────────────────────────────────────────────── */}
              {searchError && (
                <div
                  className={`rounded-xl border p-5 text-xs shadow-xs space-y-2 animate-in fade-in ${
                    searchError.type === "NOT_FOUND"
                      ? "border-[#FFCDD2] bg-[#FFEBEE] text-[#C62828]"
                      : searchError.type === "NO_CERTIFICATES"
                      ? "border-[#FFE082] bg-[#FFFDE7] text-[#7F5800]"
                      : "border-[#FFCDD2] bg-[#FFEBEE] text-[#C62828]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {searchError.type === "NO_CERTIFICATES" ? (
                      <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-[#FF8F00]" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-[#C62828]" />
                    )}
                    <div>
                      <h3 className="font-bold text-sm">
                        {searchError.type === "NOT_FOUND"
                          ? "No Participant Found"
                          : searchError.type === "NO_CERTIFICATES"
                          ? "No Certificates Available"
                          : "Search Error"}
                      </h3>
                      <p className="mt-1 leading-relaxed text-xs">{searchError.message}</p>
                      {searchError.type === "NOT_FOUND" && (
                        <div className="mt-2 text-[11px] space-y-1">
                          <p>&bull; Ensure the name or roll number is spelled exactly as registered.</p>
                          <p>&bull; If searching by name returned no match, try using your official Roll Number.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* STEP 2: AVAILABLE EVENTS LIST */}
              {/* ───────────────────────────────────────────────────────────── */}
              {searchResults.length > 0 && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Results Header Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#D5D2C4] shadow-xs">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#2E7D32]">
                        Certificates Available
                      </span>
                      <h2 className="text-lg font-bold text-[#1C1917] mt-0.5">
                        Found {searchResults.length} Event{searchResults.length > 1 ? "s" : ""} for &quot;
                        <span className="text-[#C62828]">{searchMetadata?.query || searchQuery}</span>&quot;
                      </h2>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5E9] px-3 py-1 text-xs font-bold text-[#2E7D32] border border-[#C8E6C9] self-start sm:self-auto">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Select Event to Download
                    </span>
                  </div>

                  {/* Clarification if multiple distinct people have the same name */}
                  {searchMetadata?.hasMultipleParticipantsWithSameName && (
                    <div className="rounded-xl border border-[#D8C7FF] bg-[#F8F5FF] p-4 text-xs text-[#5E35B1] flex items-start gap-2.5">
                      <User className="h-4 w-4 mt-0.5 shrink-0 text-[#7C3AED]" />
                      <div>
                        <strong className="block font-bold">Multiple Participants with this Name Found:</strong>
                        <span>
                          We found records for Roll Numbers:{" "}
                          <span className="font-mono font-semibold">
                            {searchMetadata.distinctRollNumbers.join(", ")}
                          </span>
                          . Please select the event associated with your specific Roll Number and Department below.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* List of Event Cards */}
                  <div className="space-y-3">
                    {searchResults.map((item) => (
                      <div
                        key={`${item.event.id}-${item.participant.id}`}
                        onClick={() => handleSelectEvent(item)}
                        className="group rounded-xl border border-[#E5E3D8] bg-white p-5 shadow-xs hover:border-[#C62828] hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.event.program && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#F3EEFF] border border-[#D8C7FF] px-2 py-0.5 text-[10px] font-bold text-[#673AB7]">
                                <Layers className="h-3 w-3" />
                                Fest: {item.event.program.name}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-[10px] font-bold text-[#2E7D32] border border-[#C8E6C9]">
                              <CheckCircle2 className="h-3 w-3" /> Certificate Available
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-[#1C1917] group-hover:text-[#C62828] transition">
                            {item.event.name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-[#57534E]">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-[#C62828]" />
                              {item.event.event_date}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Building className="h-3.5 w-3.5 text-[#8D6E63]" />
                              {item.event.organizer}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-[#F2F1E4] flex flex-wrap items-center gap-3 text-xs">
                            <span className="font-semibold text-[#1C1917]">
                              Participant: {item.participant.name}
                            </span>
                            <span className="font-mono text-xs font-bold text-[#7F5800] bg-[#FFF9C4] px-2 py-0.5 rounded border border-[#FBC02D]">
                              {item.participant.roll_number}
                            </span>
                            {item.participant.department && (
                              <span className="text-[#8C8880] text-[11px]">
                                {item.participant.department}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center md:self-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectEvent(item);
                            }}
                            className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#C62828] px-4 py-2.5 text-xs font-bold text-white shadow-xs group-hover:bg-[#B71C1C] transition cursor-pointer"
                          >
                            <Award className="h-4 w-4 text-[#FBC02D]" />
                            <span>Select & View Certificate</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informational Cards when idle */}
              {searchResults.length === 0 && !searchError && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div className="rounded-xl border border-[#E5E3D8] bg-white p-5 shadow-2xs space-y-2">
                    <div className="h-8 w-8 rounded-lg bg-[#FFEBEE] text-[#C62828] flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <h3 className="font-bold text-sm text-[#1C1917]">Universal Search</h3>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      No need to guess or select an event first. Simply type your Name or Roll Number.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#E5E3D8] bg-white p-5 shadow-2xs space-y-2">
                    <div className="h-8 w-8 rounded-lg bg-[#FFF9C4] text-[#7F5800] flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <h3 className="font-bold text-sm text-[#1C1917]">All Available Events</h3>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      We check every active event roster and present all events where your certificate is ready.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#E5E3D8] bg-white p-5 shadow-2xs space-y-2">
                    <div className="h-8 w-8 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <h3 className="font-bold text-sm text-[#1C1917]">Instant High-Res PDF</h3>
                    <p className="text-xs text-[#57534E] leading-relaxed">
                      Pick your event, view your certificate, and download authentic high-res credentials in seconds.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* STEP 3: SELECTED EVENT & CERTIFICATE DISPLAY */}
          {/* ───────────────────────────────────────────────────────────── */}
          {selectedMatch && (
            <div className="space-y-6 animate-in fade-in">
              {/* Back to Events Bar */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToEvents}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2C4] bg-white px-3.5 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-[#C62828]" />
                  <span>
                    {searchResults.length > 1
                      ? `Back to Events List (${searchResults.length})`
                      : "Back to Search"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#57534E] hover:text-[#C62828] transition cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Start New Search
                </button>
              </div>

              {generationError && (
                <div className="rounded-xl border border-[#FFCDD2] bg-[#FFEBEE] p-4 text-xs text-[#C62828] flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold">Generation Error</h4>
                    <p className="mt-0.5">{generationError}</p>
                  </div>
                </div>
              )}

              {/* Certificate Presentation Card */}
              <div className="rounded-xl border border-[#D5D2C4] bg-white p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-[#E5E3D8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2E7D32]">
                      Official Verified Credential
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] mt-0.5">
                      Certificate Ready for Download
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] px-3 py-1 text-xs font-semibold text-[#2E7D32] border border-[#C8E6C9] self-start sm:self-auto">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Roster Match
                  </span>
                </div>

                {/* Participant & Event Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-[#F8F7F0] p-5 text-xs border border-[#E5E3D8]">
                  <div className="space-y-1">
                    <span className="text-[#8C8880] block text-[11px] uppercase tracking-wider font-semibold">
                      Participant Name
                    </span>
                    <span className="text-lg font-bold text-[#1C1917] block font-serif">
                      {selectedMatch.participant.name}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[#8C8880] block text-[11px] uppercase tracking-wider font-semibold">
                      Roll Number / ID
                    </span>
                    <span className="text-sm font-bold font-mono text-[#1C1917] block">
                      {selectedMatch.participant.roll_number}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[#8C8880] block text-[11px] uppercase tracking-wider font-semibold">
                      Department / Institution
                    </span>
                    <span className="text-xs font-medium text-[#44403C] block">
                      {selectedMatch.participant.department || "General Participant"}
                      {selectedMatch.participant.institution ? ` • ${selectedMatch.participant.institution}` : ""}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[#8C8880] block text-[11px] uppercase tracking-wider font-semibold">
                      Event & Fest
                    </span>
                    <span className="text-xs font-medium text-[#44403C] block">
                      {selectedMatch.event.program ? `[${selectedMatch.event.program.name}] ` : ""}
                      {selectedMatch.event.name}
                    </span>
                    <span className="text-[11px] text-[#8C8880] block">
                      Date: {selectedMatch.event.event_date} &bull; Organizer: {selectedMatch.event.organizer}
                    </span>
                  </div>

                  {certificateResult && (
                    <div className="sm:col-span-2 pt-3 border-t border-[#E5E3D8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[#8C8880] text-[10px] uppercase tracking-wider block">
                          Unique Certificate Identifier
                        </span>
                        <span className="font-mono text-xs font-bold text-[#1C1917]">
                          {certificateResult.certificateId}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded font-semibold self-start sm:self-auto border border-[#C8E6C9]">
                        Status: Authentic & Valid
                      </span>
                    </div>
                  )}
                </div>

                {/* Primary Actions: Download & Print */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <a
                    href={`/api/certificates/download?eventId=${selectedMatch.event.id}&participantId=${selectedMatch.participant.id}`}
                    download
                    className="flex-1 rounded-lg bg-[#C62828] px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#B71C1C] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-[#FBC02D]" />
                    <span>Download Certificate (PDF)</span>
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      handlePrint(
                        `/api/certificates/download?eventId=${selectedMatch.event.id}&participantId=${selectedMatch.participant.id}`
                      )
                    }
                    className="rounded-lg border border-[#D5D2C4] bg-white px-5 py-3.5 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-[#57534E]" />
                    <span>Open in Browser / Print</span>
                  </button>

                  {certificateResult && (
                    <Link
                      href={`/verify/${certificateResult.certificateId}`}
                      target="_blank"
                      className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-3.5 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] transition flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="h-4 w-4 text-[#2E7D32]" />
                      <span>Verify</span>
                      <ExternalLink className="h-3 w-3 text-[#8C8880]" />
                    </Link>
                  )}
                </div>

                {/* Extra guidance if multiple events exist */}
                {searchResults.length > 1 && (
                  <div className="rounded-lg bg-[#F8F5FF] border border-[#D8C7FF] p-3 text-xs text-[#5E35B1] flex items-center justify-between">
                    <span>
                      You have certificates in <strong>{searchResults.length - 1} other event(s)</strong>.
                    </span>
                    <button
                      type="button"
                      onClick={handleBackToEvents}
                      className="font-bold text-[#7C3AED] hover:underline cursor-pointer"
                    >
                      View Other Events &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
