"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileBadge,
  CalendarDays,
  Upload,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Award,
  Type,
  QrCode,
  Download,
  Plus,
  Search,
  FileSpreadsheet,
  X,
  ExternalLink,
  Shield,
  Eye,
  Sliders,
  Move,
  Trash2,
  Sparkles,
  Layers,
} from "lucide-react";
import { CertificateField, TemplateConfiguration } from "@/lib/certificate/templateTypes";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/certificate/defaultTemplate";

interface EventItem {
  id: string;
  name: string;
  event_code: string;
  event_date: string;
  organizer: string;
  department?: string | null;
  status: string;
  program_id?: string | null;
  program?: {
    id: string;
    name: string;
    code: string;
  } | null;
  _count?: {
    participants: number;
    certificates: number;
  };
}

interface ParticipantItem {
  id: string;
  roll_number: string;
  name: string;
  email?: string | null;
  department?: string | null;
  eligible: boolean;
  certificates: {
    id: string;
    certificate_id: string;
    status: string;
  }[];
}

export default function CertificateManagerPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-xs text-[#57534E] flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-[#C62828]" />
        Loading Certificate Manager...
      </div>
    }>
      <CertificateManagerContent />
    </Suspense>
  );
}

function CertificateManagerContent() {
  const searchParams = useSearchParams();
  const queryEventId = searchParams.get("eventId");
  const queryProgramId = searchParams.get("programId");

  // Programs state
  const [programs, setPrograms] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(queryProgramId || "ALL");

  // Events list & selected event
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(queryEventId || "");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"placement" | "roster" | "test">("placement");

  // Template state
  const [templateVersion, setTemplateVersion] = useState(1);
  const [config, setConfig] = useState<TemplateConfiguration>(DEFAULT_TEMPLATE_CONFIG);
  const [bgReference, setBgReference] = useState<string>("default-ornate-gold");
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>("PARTICIPANT_NAME");
  const [sampleName, setSampleName] = useState<string>("Dharanesh Kumar");

  // Status notifications
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Participants roster state
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");

  // Add Participant modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoll, setNewRoll] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDept, setNewDept] = useState("M.Sc Software Systems");
  const [addingParticipant, setAddingParticipant] = useState(false);

  // Delete participant state
  const [participantToDelete, setParticipantToDelete] = useState<ParticipantItem | null>(null);
  const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null);

  // Multiple Delete participant state
  const [selectedRosterIds, setSelectedRosterIds] = useState<string[]>([]);
  const [isBulkDeleteRosterModalOpen, setIsBulkDeleteRosterModalOpen] = useState(false);
  const [isBulkDeletingRoster, setIsBulkDeletingRoster] = useState(false);

  // CSV Import modal
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<{
    summary: { totalRows: number; validCount: number; invalidCount: number; duplicateCount: number };
    previewValid: { roll_number: string; name: string; department?: string }[];
    duplicateRows: { row: number; roll_number: string; reason: string }[];
  } | null>(null);
  const [csvValidating, setCsvValidating] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

  // Download the official CSV template (only roll_number + name mandatory)
  const downloadTemplate = () => {
    const lines = [
      "# INSTRUCTIONS: Only roll_number and name are required. email and department are optional.",
      "roll_number,name,email,department",
      "24ISR001,Student Name,,",
      "24ISR002,Another Student,,",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "participants_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Read uploaded CSV file into csvText with automatic corrupt character sanitization
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a .csv file.");
      return;
    }
    setCsvFileName(file.name);
    setCsvPreview(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = (ev.target?.result as string) ?? "";
      // Strip any corrupt replacement characters or control chars
      const sanitized = raw
        .normalize("NFKC")
        .replace(/[\uFFFD\u200B-\u200D\uFEFF]/g, "")
        .replace(/^[•·\-\*▪▫\.\s]+/gm, "");
      setCsvText(sanitized);
    };
    reader.readAsText(file);
  };

  // Canvas zoom & Drag-and-Drop state
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggedFieldRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startFieldX: number;
    startFieldY: number;
    hasMoved: boolean;
  } | null>(null);

  // 1. Fetch Events and Programs
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingEvents(true);
        const [evRes, progRes] = await Promise.all([
          fetch("/api/events"),
          fetch("/api/programs"),
        ]);
        const evData = await evRes.json();
        const progData = await progRes.json();

        if (progData.programs && Array.isArray(progData.programs)) {
          setPrograms(progData.programs);
        }

        if (evData.events && Array.isArray(evData.events)) {
          setEvents(evData.events);

          let initialEvent: EventItem | undefined;
          if (queryEventId) {
            initialEvent = evData.events.find((e: EventItem) => e.id === queryEventId);
            if (initialEvent && initialEvent.program_id) {
              setSelectedProgramId(initialEvent.program_id);
            }
          } else if (queryProgramId) {
            initialEvent = evData.events.find((e: EventItem) => e.program_id === queryProgramId);
            setSelectedProgramId(queryProgramId);
          }

          if (!initialEvent && evData.events.length > 0) {
            initialEvent = evData.events[0];
          }

          if (initialEvent) {
            setSelectedEventId(initialEvent.id);
            setSelectedEvent(initialEvent);
          }
        }
      } catch (err) {
        console.error("Failed to load events/programs:", err);
      } finally {
        setLoadingEvents(false);
      }
    }
    loadData();
  }, [queryEventId, queryProgramId]);

  // 2. When selectedEventId changes, load Template and Participants
  useEffect(() => {
    if (!selectedEventId) return;

    const current = events.find((e) => e.id === selectedEventId);
    if (current) setSelectedEvent(current);

    async function loadEventData() {
      try {
        // Fetch Template
        const tmplRes = await fetch(`/api/events/${selectedEventId}/template`);
        const tmplData = await tmplRes.json();
        if (tmplData.template) {
          setTemplateVersion(tmplData.template.version);
          if (tmplData.template.configuration) {
            setConfig(tmplData.template.configuration);
          }
          if (tmplData.template.templateReference) {
            setBgReference(tmplData.template.templateReference);
          }
        }

        // Fetch Participants
        setLoadingParticipants(true);
        const partRes = await fetch(`/api/events/${selectedEventId}/participants`);
        const partData = await partRes.json();
        if (partData.participants) {
          setParticipants(partData.participants);
        }
      } catch (err) {
        console.error("Failed to load event data:", err);
      } finally {
        setLoadingParticipants(false);
      }
    }

    loadEventData();
  }, [selectedEventId, events]);

  // Helper for field updating
  const participantNameField =
    config.fields.find((f) => f.key === "PARTICIPANT_NAME") ||
    config.fields.find((f) => f.id === "field-participant-name") ||
    config.fields[0];

  const activeField =
    config.fields.find((f) => f.key === selectedFieldKey || f.id === selectedFieldKey) ||
    participantNameField ||
    config.fields[0];

  const updateFieldProperty = (keyOrId: string, updates: Partial<CertificateField>) => {
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === keyOrId || f.id === keyOrId ? { ...f, ...updates } : f)),
    }));
  };

  // Delete any field / floating element from certificate
  const handleDeleteField = (identifier: string) => {
    const target = config.fields.find((f) => f.id === identifier || f.key === identifier);
    if (!target) return;

    if (target.key === "PARTICIPANT_NAME" && config.fields.filter((f) => f.key === "PARTICIPANT_NAME").length <= 1) {
      if (!confirm("Are you sure you want to remove the Participant Name field? Certificates usually require a participant name.")) {
        return;
      }
    }

    const updated = config.fields.filter((f) => f.id !== identifier && f.key !== identifier);
    setConfig((prev) => ({
      ...prev,
      fields: updated,
    }));

    const nextField = updated.find((f) => f.key === "PARTICIPANT_NAME") || updated[0];
    if (nextField) {
      setSelectedFieldKey(nextField.key || nextField.id);
    } else {
      setSelectedFieldKey("");
    }

    setFeedback({
      type: "success",
      msg: `Deleted "${target.label || target.key}" from certificate.`,
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Quick action: Clear pre-printed boilerplate (Title, Subtitle, Description, Organizers)
  const handleClearPreprintedFields = () => {
    const keysToRemove = new Set([
      "TITLE",
      "SUBTITLE",
      "DESCRIPTION",
      "ORGANIZER",
      "CUSTOM_TEXT_1",
      "CUSTOM_TEXT_2",
    ]);

    const remaining = config.fields.filter((f) => !keysToRemove.has(f.key));
    if (remaining.length === config.fields.length) {
      setFeedback({
        type: "success",
        msg: "Pre-printed text fields were already removed.",
      });
      setTimeout(() => setFeedback(null), 2500);
      return;
    }

    setConfig((prev) => ({
      ...prev,
      fields: remaining,
    }));

    const nextField = remaining.find((f) => f.key === "PARTICIPANT_NAME") || remaining[0];
    if (nextField) {
      setSelectedFieldKey(nextField.key || nextField.id);
    }

    setFeedback({
      type: "success",
      msg: "Cleared pre-printed boilerplate (Title, Subtitle, Description, Organizers). Only dynamic fields remain!",
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Add a new field or restore a preset field
  const handleAddField = (type: "text" | "custom_text" | "qr", presetKey?: string) => {
    const timestamp = Date.now();
    let newField: CertificateField;

    if (presetKey === "TITLE") {
      newField = {
        id: `field-title-${timestamp}`,
        key: "TITLE",
        label: "Certificate Title",
        type: "text",
        defaultText: "CERTIFICATE OF PARTICIPATION",
        x: 50,
        y: 22,
        width: 80,
        height: 8,
        fontSize: 26,
        fontFamily: "Times-Bold",
        fontWeight: "bold",
        textAlign: "center",
        color: "#C62828",
        letterSpacing: 3,
      };
    } else if (presetKey === "DESCRIPTION") {
      newField = {
        id: `field-desc-${timestamp}`,
        key: "DESCRIPTION",
        label: "Event Body Text",
        type: "text",
        defaultText: "for successful participation in {{EVENT_NAME}} organized on {{EVENT_DATE}}",
        x: 50,
        y: 57,
        width: 76,
        height: 7,
        fontSize: 13,
        fontFamily: "Times-Roman",
        fontWeight: "normal",
        textAlign: "center",
        color: "#292524",
      };
    } else if (presetKey === "SUBTITLE") {
      newField = {
        id: `field-subtitle-${timestamp}`,
        key: "SUBTITLE",
        label: "Subtitle",
        type: "text",
        defaultText: "THIS IS PROUDLY PRESENTED TO",
        x: 50,
        y: 31,
        width: 60,
        height: 4,
        fontSize: 11,
        fontFamily: "Helvetica",
        fontWeight: "normal",
        textAlign: "center",
        color: "#57534E",
        letterSpacing: 2,
      };
    } else if (presetKey === "ORGANIZER") {
      newField = {
        id: `field-org-${timestamp}`,
        key: "ORGANIZER",
        label: "Organizer / Header",
        type: "text",
        defaultText: "KONGU ENGINEERING COLLEGE (AUTONOMOUS)",
        x: 50,
        y: 14,
        width: 80,
        height: 6,
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        fontWeight: "bold",
        textAlign: "center",
        color: "#8D6E63",
        letterSpacing: 2,
      };
    } else if (type === "qr") {
      newField = {
        id: `field-qr-${timestamp}`,
        key: "QR_CODE",
        label: "Verification QR Code",
        type: "qr",
        x: 12,
        y: 77,
        width: 14,
        height: 14,
        fontSize: 10,
        textAlign: "center",
        color: "#1C1917",
        qrSize: 75,
        qrMargin: 1,
      };
    } else if (presetKey === "CUSTOM_SIGNATORY") {
      newField = {
        id: `field-sign-${timestamp}`,
        key: `CUSTOM_SIGN_${timestamp.toString(36).toUpperCase()}`,
        label: "Signatory Placeholder",
        type: "custom_text",
        defaultText: "Dr. Faculty Name\nConvenor / Coordinator",
        x: 50,
        y: 84,
        width: 30,
        height: 7,
        fontSize: 10,
        fontFamily: "Helvetica",
        fontWeight: "normal",
        textAlign: "center",
        color: "#44403C",
      };
    } else {
      newField = {
        id: `field-custom-${timestamp}`,
        key: `CUSTOM_${timestamp.toString(36).toUpperCase()}`,
        label: "Custom Text Field",
        type: "custom_text",
        defaultText: "New Custom Text Field",
        x: 50,
        y: 50,
        width: 40,
        height: 6,
        fontSize: 14,
        fontFamily: "Helvetica",
        fontWeight: "normal",
        textAlign: "center",
        color: "#1C1917",
      };
    }

    setConfig((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldKey(newField.key || newField.id);
    setFeedback({
      type: "success",
      msg: `Added "${newField.label}" to certificate. Click on the canvas or use sliders to position it.`,
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Keyboard shortcut listener: Delete or Backspace removes active field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || (activeEl as HTMLElement)?.isContentEditable) {
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedFieldKey) {
        if (activeField) {
          e.preventDefault();
          handleDeleteField(activeField.id || activeField.key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFieldKey, activeField, config.fields]);

  // Drag-and-Drop Handler for Canvas Elements (Only moves while clicking and dragging continuously)
  const handleFieldMouseDown = (e: React.MouseEvent, fieldKeyOrId: string) => {
    if (e.button !== 0) return; // Only respond to primary left mouse button
    e.stopPropagation();
    e.preventDefault();
    setSelectedFieldKey(fieldKeyOrId);

    const targetField = config.fields.find((f) => f.key === fieldKeyOrId || f.id === fieldKeyOrId);
    if (!targetField) return;

    draggedFieldRef.current = fieldKeyOrId;
    setDraggedFieldId(fieldKeyOrId);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startFieldX: targetField.x,
      startFieldY: targetField.y,
      hasMoved: false,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Must have active dragged field, start reference, and canvas ref
      if (!draggedFieldRef.current || !dragStartRef.current || !canvasRef.current) return;

      // Verify left mouse button is continuously held down (buttons & 1)
      if ((e.buttons & 1) !== 1) {
        draggedFieldRef.current = null;
        dragStartRef.current = null;
        setDraggedFieldId(null);
        setIsDragging(false);
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      // Threshold: only start moving if mouse moved at least 3px while clicking
      if (!dragStartRef.current.hasMoved && Math.hypot(deltaX, deltaY) < 3) {
        return;
      }

      dragStartRef.current.hasMoved = true;
      setIsDragging(true);

      const deltaPctX = (deltaX / rect.width) * 100;
      const deltaPctY = (deltaY / rect.height) * 100;

      const clampedX = Math.round(Math.max(1, Math.min(99, dragStartRef.current.startFieldX + deltaPctX)));
      const clampedY = Math.round(Math.max(1, Math.min(99, dragStartRef.current.startFieldY + deltaPctY)));

      const targetId = draggedFieldRef.current;
      setConfig((prev) => ({
        ...prev,
        fields: prev.fields.map((f) =>
          f.key === targetId || f.id === targetId ? { ...f, x: clampedX, y: clampedY } : f
        ),
      }));
    };

    const handleMouseUp = () => {
      if (draggedFieldRef.current) {
        const targetId = draggedFieldRef.current;
        const didMove = dragStartRef.current?.hasMoved;
        draggedFieldRef.current = null;
        dragStartRef.current = null;
        setDraggedFieldId(null);
        setTimeout(() => setIsDragging(false), 50);

        if (didMove) {
          const movedField = config.fields.find((f) => f.key === targetId || f.id === targetId);
          if (movedField) {
            setFeedback({
              type: "success",
              msg: `Placed ${movedField.label} at X: ${movedField.x}%, Y: ${movedField.y}%`,
            });
            setTimeout(() => setFeedback(null), 2000);
          }
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [config.fields]);

  // Clear all overlays for a completely blank canvas
  const handleClearAllFields = () => {
    if (config.fields.length === 0) return;
    if (!confirm("Clear all text and QR overlays? This leaves your template completely blank so you can add and drag only the fields you want.")) {
      return;
    }
    setConfig((prev) => ({
      ...prev,
      fields: [],
    }));
    setSelectedFieldKey("");
    setFeedback({
      type: "success",
      msg: "All overlays cleared! Template is completely blank. Use '+ Add Field' or presets to place elements.",
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Canvas Click Handler: clicking on the canvas background does NOT move fields
  const handleCanvasClick = () => {
    // Intentionally no-op: fields only move when clicked and dragged continuously
  };

  // Save Template Configuration
  const handleSaveTemplate = async () => {
    if (!selectedEventId) return;
    setSavingTemplate(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/events/${selectedEventId}/template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configuration: config,
          templateReference: bgReference,
          width: 842,
          height: 595,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", msg: data.error || "Save failed" });
      } else {
        setTemplateVersion(data.template.version);
        setFeedback({
          type: "success",
          msg: `Template saved successfully! All participant certificates will render with this exact name and field placement (Active v${data.template.version}).`,
        });
      }
    } catch {
      setFeedback({ type: "error", msg: "A network error occurred while saving template." });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Upload Custom Background Image (Automatically strips boilerplate text overlays!)
  const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEventId) return;

    setUploadingBg(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/events/${selectedEventId}/template/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", msg: data.error || "Upload failed" });
      } else {
        setBgReference(data.templateReference);

        // When custom template is uploaded, strip out all boilerplate overlays
        // so that only the custom template graphic is shown, exactly as requested:
        // "if i upload a custom certificate template mean the text overlays present in the default templates should not appear there only the certificate template should be shown if the user add a filed mean only should be shown and is able to postion it and the user should be to manuly position the qr and the certificate id also"
        const boilerplateKeys = new Set([
          "TITLE",
          "SUBTITLE",
          "DESCRIPTION",
          "ORGANIZER",
          "CUSTOM_TEXT_1",
          "CUSTOM_TEXT_2",
        ]);

        const cleaned = config.fields.filter((f) => !boilerplateKeys.has(f.key));

        // Ensure PARTICIPANT_NAME, QR_CODE, and CERTIFICATE_ID are present and draggable
        const hasName = cleaned.some((f) => f.key === "PARTICIPANT_NAME");
        const hasQr = cleaned.some((f) => f.key === "QR_CODE");
        const hasCertId = cleaned.some((f) => f.key === "CERTIFICATE_ID");

        const updated = [...cleaned];
        if (!hasName) {
          updated.unshift({
            id: `field-name-${Date.now()}`,
            key: "PARTICIPANT_NAME",
            label: "Participant Name",
            type: "text",
            defaultText: "{{PARTICIPANT_NAME}}",
            x: 50,
            y: 45,
            width: 80,
            height: 10,
            fontSize: 28,
            fontFamily: "Times-Bold",
            fontWeight: "bold",
            textAlign: "center",
            color: "#1C1917",
          });
        }
        if (!hasQr) {
          updated.push({
            id: `field-qr-${Date.now()}`,
            key: "QR_CODE",
            label: "Verification QR Code",
            type: "qr",
            x: 12,
            y: 82,
            width: 14,
            height: 14,
            fontSize: 10,
            textAlign: "center",
            color: "#1C1917",
            qrSize: 75,
          });
        }
        if (!hasCertId) {
          updated.push({
            id: `field-cert-id-${Date.now()}`,
            key: "CERTIFICATE_ID",
            label: "Certificate ID",
            type: "text",
            defaultText: "ID: {{CERTIFICATE_ID}}",
            x: 88,
            y: 88,
            width: 30,
            height: 5,
            fontSize: 10,
            fontFamily: "Courier",
            fontWeight: "bold",
            textAlign: "right",
            color: "#57534E",
          });
        }

        setConfig((prev) => ({
          ...prev,
          fields: updated,
        }));
        setSelectedFieldKey("PARTICIPANT_NAME");

        setFeedback({
          type: "success",
          msg: "Custom template uploaded! Default text overlays removed. You can now drag Participant Name, QR Code, and Certificate ID anywhere on your template.",
        });
      }
    } catch {
      setFeedback({ type: "error", msg: "Network error during upload." });
    } finally {
      setUploadingBg(false);
    }
  };

  // Add Participant
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setAddingParticipant(true);

    if (!/^[A-Za-z\s]+$/.test(newName.trim())) {
      setFeedback({
        type: "error",
        msg: "The Name field should accept only alphabetic characters (A–Z). Numbers, special characters, and other non-alphabetic characters are not allowed.",
      });
      setAddingParticipant(false);
      return;
    }

    try {
      const res = await fetch(`/api/events/${selectedEventId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roll_number: newRoll,
          name: newName.trim(),
          email: newEmail,
          department: newDept,
          eligible: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewRoll("");
        setNewName("");
        setNewEmail("");
        // Refresh roster
        const partRes = await fetch(`/api/events/${selectedEventId}/participants`);
        const partData = await partRes.json();
        if (partData.participants) setParticipants(partData.participants);
        setFeedback({ type: "success", msg: `Participant ${newName} registered.` });
      } else {
        setFeedback({ type: "error", msg: data.error || "Failed to add participant" });
      }
    } catch {
      setFeedback({ type: "error", msg: "Network error adding participant." });
    } finally {
      setAddingParticipant(false);
    }
  };

  // Delete Participant
  const handleDeleteParticipant = async (participantId: string) => {
    setDeletingParticipantId(participantId);
    try {
      const res = await fetch(`/api/participants/${participantId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setParticipantToDelete(null);
        if (selectedEventId) {
          const partRes = await fetch(`/api/events/${selectedEventId}/participants`);
          const partData = await partRes.json();
          if (partData.participants) setParticipants(partData.participants);
        }
        setFeedback({ type: "success", msg: "Participant removed successfully." });
      } else {
        setFeedback({ type: "error", msg: data.error || "Failed to delete participant." });
      }
    } catch {
      setFeedback({ type: "error", msg: "Network error deleting participant." });
    } finally {
      setDeletingParticipantId(null);
    }
  };

  const toggleSelectAllRoster = () => {
    if (selectedRosterIds.length === filteredParticipants.length && filteredParticipants.length > 0) {
      setSelectedRosterIds([]);
    } else {
      setSelectedRosterIds(filteredParticipants.map((p) => p.id));
    }
  };

  const toggleSelectRosterParticipant = (id: string) => {
    setSelectedRosterIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteRoster = async () => {
    if (selectedRosterIds.length === 0) return;
    setIsBulkDeletingRoster(true);
    try {
      const res = await fetch("/api/participants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: selectedRosterIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedRosterIds([]);
        setIsBulkDeleteRosterModalOpen(false);
        if (selectedEventId) {
          const partRes = await fetch(`/api/events/${selectedEventId}/participants`);
          const partData = await partRes.json();
          if (partData.participants) setParticipants(partData.participants);
        }
        setFeedback({ type: "success", msg: `Successfully deleted ${selectedRosterIds.length} participant(s).` });
      } else {
        setFeedback({ type: "error", msg: data.error || "Failed to delete participants." });
      }
    } catch {
      setFeedback({ type: "error", msg: "Network error deleting participants." });
    } finally {
      setIsBulkDeletingRoster(false);
    }
  };

  // CSV Preview & Import
  const handleValidateCsv = async () => {
    if (!csvText.trim() || !selectedEventId) return;
    setCsvValidating(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/participants/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvText, dryRun: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setCsvPreview(data);
      } else {
        setFeedback({ type: "error", msg: data.error || "CSV validation error" });
      }
    } catch {
      setFeedback({ type: "error", msg: "Failed to validate CSV." });
    } finally {
      setCsvValidating(false);
    }
  };

  const handleConfirmCsvImport = async () => {
    if (!selectedEventId) return;
    setCsvImporting(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/participants/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvText, dryRun: false }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsCsvModalOpen(false);
        setCsvText("");
        setCsvPreview(null);
        // Refresh roster
        const partRes = await fetch(`/api/events/${selectedEventId}/participants`);
        const partData = await partRes.json();
        if (partData.participants) setParticipants(partData.participants);
        setFeedback({
          type: "success",
          msg: `Successfully imported ${data.importedCount} participants!`,
        });
      } else {
        setFeedback({ type: "error", msg: data.error || "Import failed" });
      }
    } catch {
      setFeedback({ type: "error", msg: "Error executing CSV import." });
    } finally {
      setCsvImporting(false);
    }
  };

  const visibleEvents =
    selectedProgramId === "ALL"
      ? events
      : events.filter((ev) => ev.program_id === selectedProgramId);

  const searchTrimmed = rosterSearch.trim().toLowerCase();
  const filteredParticipants = participants.filter((p) => {
    if (!searchTrimmed) return true;
    return (
      (p.name && p.name.toLowerCase().includes(searchTrimmed)) ||
      (p.roll_number && p.roll_number.toLowerCase().includes(searchTrimmed)) ||
      (p.department && p.department.toLowerCase().includes(searchTrimmed)) ||
      (p.email && p.email.toLowerCase().includes(searchTrimmed))
    );
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">
              Certificate Manager
            </h1>
            <span className="rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-xs font-bold text-[#2E7D32] border border-[#C8E6C9]">
              In-Memory Stream Engine
            </span>
          </div>
          <p className="text-xs text-[#57534E] mt-0.5">
            Structure: <strong>Program</strong> (Fest) &rarr; <strong>Event Track</strong> &rarr; <strong>Participants</strong> &rarr; <strong>Template</strong>
          </p>
        </div>

        {/* Global Program & Event Selectors */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Program Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#57534E] whitespace-nowrap flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-[#C62828]" />
              Program:
            </label>
            <select
              value={selectedProgramId}
              onChange={(e) => {
                const newProgId = e.target.value;
                setSelectedProgramId(newProgId);
                const matching =
                  newProgId === "ALL" ? events : events.filter((ev) => ev.program_id === newProgId);
                if (matching.length > 0 && !matching.some((ev) => ev.id === selectedEventId)) {
                  setSelectedEventId(matching[0].id);
                }
              }}
              className="rounded-lg border border-[#D5D2C4] bg-white px-2.5 py-1.5 text-xs font-bold text-[#1C1917] shadow-2xs focus:border-[#C62828] focus:outline-none"
            >
              <option value="ALL">All Programs (Fests)</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Event Selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#57534E] whitespace-nowrap">
              Event Track:
            </label>
            {loadingEvents ? (
              <div className="flex items-center gap-2 text-xs text-[#57534E]">
                <Loader2 className="h-4 w-4 animate-spin text-[#C62828]" />
                Loading...
              </div>
            ) : visibleEvents.length === 0 ? (
              <span className="text-xs text-[#8C8880] italic">No events in this program</span>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="rounded-lg border border-[#D5D2C4] bg-white px-3 py-1.5 text-xs font-bold text-[#1C1917] shadow-2xs focus:border-[#C62828] focus:outline-none"
              >
                {visibleEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.event_code})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Selected Event Context Card */}
      {selectedEvent && (
        <div className="rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C62828] text-white shadow-xs">
              <CalendarDays className="h-6 w-6 text-[#FBC02D]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedEvent.program && (
                  <span className="rounded-full bg-[#E3F2FD] px-2.5 py-0.5 text-[10px] font-bold text-[#1565C0] border border-[#BBDEFB] flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Program: {selectedEvent.program.name}
                  </span>
                )}
                <span className="text-base font-bold text-[#1C1917]">
                  {selectedEvent.name}
                </span>
                <span className="font-mono text-xs font-bold text-[#C62828] bg-[#FFEBEE] px-2 py-0.5 rounded border border-[#FFCDD2]">
                  {selectedEvent.event_code}
                </span>
                <span className="rounded-full bg-[#FFF9C4] px-2 py-0.5 text-[10px] font-bold text-[#7F5800] border border-[#FBC02D]">
                  v{templateVersion} Template Active
                </span>
              </div>
              <p className="text-xs text-[#57534E] mt-0.5">
                {selectedEvent.organizer} &bull; {selectedEvent.event_date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-[#8C8880] block text-[10px] uppercase font-bold">Roster</span>
              <span className="font-bold text-[#1C1917]">{participants.length} registered</span>
            </div>
            <div className="h-8 w-px bg-[#E5E3D8]"></div>
            <div className="text-right">
              <span className="text-[#8C8880] block text-[10px] uppercase font-bold">Issuance</span>
              <span className="font-bold text-[#2E7D32]">On-Demand Ready</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-[#E5E3D8] gap-2">
        <button
          onClick={() => setActiveTab("placement")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "placement"
              ? "border-[#C62828] text-[#C62828] bg-white rounded-t-lg"
              : "border-transparent text-[#57534E] hover:text-[#1C1917] hover:bg-[#F2F1E4]"
          }`}
        >
          <Sliders className="h-4 w-4" />
          1. Template & Participant Name Placement
        </button>

        <button
          onClick={() => setActiveTab("roster")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "roster"
              ? "border-[#C62828] text-[#C62828] bg-white rounded-t-lg"
              : "border-transparent text-[#57534E] hover:text-[#1C1917] hover:bg-[#F2F1E4]"
          }`}
        >
          <Users className="h-4 w-4" />
          2. Event Participant Roster ({participants.length})
        </button>

        <button
          onClick={() => setActiveTab("test")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "test"
              ? "border-[#C62828] text-[#C62828] bg-white rounded-t-lg"
              : "border-transparent text-[#57534E] hover:text-[#1C1917] hover:bg-[#F2F1E4]"
          }`}
        >
          <Eye className="h-4 w-4" />
          3. Test In-Memory Generation & Verification
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`rounded-lg p-3 text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]"
              : "bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* TAB 1: TEMPLATE & PARTICIPANT NAME PLACEMENT STUDIO */}
      {activeTab === "placement" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Controls & Name Placement Panel */}
          <div className="lg:col-span-4 space-y-4">
            {/* Background Template Assignment Card */}
            <div className="rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                  Certificate Background Template
                </span>
                <span className="text-[10px] text-[#8C8880]">
                  {bgReference.startsWith("data:") ? "Custom Image" : "Ornate Institutional"}
                </span>
              </div>

              <p className="text-[11px] text-[#57534E] leading-relaxed">
                Upload your official event background (PNG / JPEG) or utilize our institutional gold ornate layout.
              </p>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleUploadBackground}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingBg}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1C1917] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#292524] disabled:opacity-50 transition"
                >
                  {uploadingBg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-[#FBC02D]" />}
                  Upload Custom Background
                </button>

                {bgReference.startsWith("data:") && (
                  <button
                    type="button"
                    onClick={() => {
                      setBgReference("default-ornate-gold");
                      setFeedback({ type: "success", msg: "Restored official ornate cream & gold layout." });
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#D5D2C4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4]"
                  >
                    Use Default Layout
                  </button>
                )}
              </div>

              {/* Quick Clean Action for Uploaded Backgrounds */}
              <div className="pt-2 border-t border-[#E5E3D8] space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearPreprintedFields}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#FBC02D] bg-[#FFF9C4]/70 px-2.5 py-1.5 text-xs font-bold text-[#7F5800] hover:bg-[#FFF9C4] transition shadow-2xs cursor-pointer"
                    title="Removes title, subtitle, and body text if your uploaded background already has them pre-printed"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#FF8F00]" />
                    Clear Boilerplate Text
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllFields}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFCDD2] bg-[#FFEBEE] px-2.5 py-1.5 text-xs font-bold text-[#C62828] hover:bg-[#FFCDD2] transition shadow-2xs cursor-pointer"
                    title="Removes all overlays for a 100% clean template background"
                  >
                    <Trash2 className="h-3 w-3 text-[#C62828]" />
                    Clear All (Blank Canvas)
                  </button>
                </div>
                <span className="text-[10px] text-[#8C8880] block">
                  Custom backgrounds only show the elements you drag or add.
                </span>
              </div>
            </div>

            {/* QUICK ELEMENT SELECTOR (One-click switch between Name, QR, and Cert ID) */}
            <div className="rounded-xl border border-[#E5E3D8] bg-white p-3 shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8880] block">
                Quick Element Selector & Positioning:
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedFieldKey("PARTICIPANT_NAME")}
                  className={`py-1.5 px-2 rounded-lg font-bold transition text-center border cursor-pointer ${
                    activeField?.key === "PARTICIPANT_NAME"
                      ? "bg-[#C62828] text-white border-[#C62828] shadow-xs"
                      : "bg-[#FBFBF9] border-[#E5E3D8] text-[#1C1917] hover:border-[#D5D2C4]"
                  }`}
                >
                  👤 Name
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFieldKey("QR_CODE")}
                  className={`py-1.5 px-2 rounded-lg font-bold transition text-center border cursor-pointer ${
                    activeField?.key === "QR_CODE"
                      ? "bg-[#C62828] text-white border-[#C62828] shadow-xs"
                      : "bg-[#FBFBF9] border-[#E5E3D8] text-[#1C1917] hover:border-[#D5D2C4]"
                  }`}
                >
                  📱 QR Code
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFieldKey("CERTIFICATE_ID")}
                  className={`py-1.5 px-2 rounded-lg font-bold transition text-center border cursor-pointer ${
                    activeField?.key === "CERTIFICATE_ID"
                      ? "bg-[#C62828] text-white border-[#C62828] shadow-xs"
                      : "bg-[#FBFBF9] border-[#E5E3D8] text-[#1C1917] hover:border-[#D5D2C4]"
                  }`}
                >
                  🏷️ Cert ID
                </button>
              </div>
            </div>

            {/* DYNAMIC FIELD & PARTICIPANT NAME PLACEMENT CARD */}
            {activeField ? (
              <div className="rounded-xl border-2 border-[#C62828] bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#FFCDD2] pb-2.5">
                  <div className="flex items-center gap-2">
                    {activeField.type === "qr" ? (
                      <QrCode className="h-4 w-4 text-[#C62828]" />
                    ) : (
                      <Type className="h-4 w-4 text-[#C62828]" />
                    )}
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#C62828]">
                      {activeField.key === "PARTICIPANT_NAME"
                        ? "Participant Name Placement"
                        : `Edit: ${activeField.label || activeField.key}`}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeField.key !== "PARTICIPANT_NAME" && (
                      <button
                        type="button"
                        onClick={() => setSelectedFieldKey("PARTICIPANT_NAME")}
                        className="text-[10px] font-bold text-[#C62828] hover:underline cursor-pointer"
                      >
                        Focus Name
                      </button>
                    )}
                    <span className="rounded-full bg-[#FFEBEE] px-2 py-0.5 text-[10px] font-bold text-[#C62828] border border-[#FFCDD2]">
                      {activeField.x}%, {activeField.y}%
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-[#F5F5DC]/70 p-2.5 text-xs text-[#57534E] border border-[#D5D2C4]/80 flex items-start gap-2">
                  <Move className="h-4 w-4 text-[#C62828] shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-tight">
                    <strong>Drag to Place:</strong> Click and drag <strong>{activeField.label}</strong> directly on the canvas, or fine-tune with the inputs below.
                  </span>
                </div>

                {/* Sample name input if participant name is selected */}
                {activeField.key === "PARTICIPANT_NAME" ? (
                  <div>
                    <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                      Preview Name (Simulate different name lengths)
                    </label>
                    <input
                      type="text"
                      value={sampleName}
                      onChange={(e) => setSampleName(e.target.value)}
                      placeholder="e.g. Dharanesh Kumar"
                      className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] px-3 py-1.5 text-xs font-serif font-bold text-[#1C1917] focus:border-[#C62828] focus:outline-none"
                    />
                  </div>
                ) : activeField.type !== "qr" ? (
                  <div>
                    <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                      Field Text Content / Template Tag
                    </label>
                    <input
                      type="text"
                      value={activeField.defaultText || ""}
                      onChange={(e) =>
                        updateFieldProperty(activeField.key || activeField.id, {
                          defaultText: e.target.value,
                        })
                      }
                      placeholder="Enter text content..."
                      className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] px-3 py-1.5 text-xs text-[#1C1917] focus:border-[#C62828] focus:outline-none"
                    />
                  </div>
                ) : null}

                {/* Position Sliders & Precise Numeric Inputs */}
                <div className="space-y-3 bg-[#F8F7F0] p-3 rounded-lg border border-[#E5E3D8]">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#1C1917] mb-1">
                      <span>Horizontal Position (X)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={activeField.x}
                          onChange={(e) =>
                            updateFieldProperty(activeField.key || activeField.id, {
                              x: Math.max(0, Math.min(100, Number(e.target.value))),
                            })
                          }
                          className="w-14 rounded border border-[#D5D2C4] bg-white px-1.5 py-0.5 text-right font-mono text-xs font-bold text-[#C62828] focus:outline-none"
                        />
                        <span className="font-mono text-xs text-[#8C8880]">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={activeField.x}
                      onChange={(e) =>
                        updateFieldProperty(activeField.key || activeField.id, {
                          x: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#C62828] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-[#1C1917] mb-1">
                      <span>Vertical Position (Y)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={activeField.y}
                          onChange={(e) =>
                            updateFieldProperty(activeField.key || activeField.id, {
                              y: Math.max(0, Math.min(100, Number(e.target.value))),
                            })
                          }
                          className="w-14 rounded border border-[#D5D2C4] bg-white px-1.5 py-0.5 text-right font-mono text-xs font-bold text-[#C62828] focus:outline-none"
                        />
                        <span className="font-mono text-xs text-[#8C8880]">%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={activeField.y}
                      onChange={(e) =>
                        updateFieldProperty(activeField.key || activeField.id, {
                          y: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#C62828] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Typography & Styling Controls (for Text) */}
                {activeField.type !== "qr" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                          Font Family
                        </label>
                        <select
                          value={activeField.fontFamily || "Times-Bold"}
                          onChange={(e) =>
                            updateFieldProperty(activeField.key || activeField.id, {
                              fontFamily: e.target.value as any,
                            })
                          }
                          className="w-full rounded-lg border border-[#D5D2C4] p-1.5 text-xs text-[#1C1917] focus:outline-none"
                        >
                          <option value="Times-Bold">Times Roman (Bold Serif)</option>
                          <option value="Times-Roman">Times Roman (Regular)</option>
                          <option value="Helvetica-Bold">Helvetica (Bold Sans)</option>
                          <option value="Helvetica">Helvetica (Regular)</option>
                          <option value="Courier">Courier (Monospace)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                          Font Size ({activeField.fontSize || 20}pt)
                        </label>
                        <input
                          type="number"
                          min={8}
                          max={60}
                          value={activeField.fontSize || 20}
                          onChange={(e) =>
                            updateFieldProperty(activeField.key || activeField.id, {
                              fontSize: Number(e.target.value),
                            })
                          }
                          className="w-full rounded-lg border border-[#D5D2C4] p-1.5 text-xs text-[#1C1917] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                          Text Alignment
                        </label>
                        <select
                          value={activeField.textAlign || "center"}
                          onChange={(e) =>
                            updateFieldProperty(activeField.key || activeField.id, {
                              textAlign: e.target.value as any,
                            })
                          }
                          className="w-full rounded-lg border border-[#D5D2C4] p-1.5 text-xs text-[#1C1917] focus:outline-none"
                        >
                          <option value="center">Centered</option>
                          <option value="left">Left Aligned</option>
                          <option value="right">Right Aligned</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                          Color
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={activeField.color || "#1C1917"}
                            onChange={(e) =>
                              updateFieldProperty(activeField.key || activeField.id, {
                                color: e.target.value,
                              })
                            }
                            className="h-7 w-8 rounded border border-[#D5D2C4] cursor-pointer"
                          />
                          <div className="flex gap-1">
                            {["#1C1917", "#C62828", "#8D6E63", "#FF8F00", "#1E3A8A"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() =>
                                  updateFieldProperty(activeField.key || activeField.id, {
                                    color: c,
                                  })
                                }
                                style={{ backgroundColor: c }}
                                className="h-5 w-5 rounded-full border border-black/10 hover:scale-110 transition"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex justify-between text-xs font-bold text-[#1C1917] mb-1">
                      <span>QR Code Size</span>
                      <span className="font-mono text-[#C62828]">{activeField.qrSize || 75}px</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={140}
                      value={activeField.qrSize || 75}
                      onChange={(e) =>
                        updateFieldProperty(activeField.key || activeField.id, {
                          qrSize: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#C62828]"
                    />
                  </div>
                )}

                {/* DELETE BUTTON FOR ACTIVE FIELD */}
                <div className="pt-2 border-t border-[#E5E3D8]">
                  <button
                    type="button"
                    onClick={() => handleDeleteField(activeField.id || activeField.key)}
                    className="w-full rounded-lg border border-[#FFCDD2] bg-[#FFEBEE] py-2 text-xs font-bold text-[#C62828] hover:bg-[#FFCDD2] transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[#C62828]" />
                    Delete &ldquo;{activeField.label || activeField.key}&rdquo; from Certificate
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#E5E3D8] bg-white p-5 text-center text-xs text-[#57534E]">
                No field selected. Click on an element or add one below.
              </div>
            )}

            {/* ALL ACTIVE ELEMENTS ON CERTIFICATE & ADD FIELD CARD */}
            <div className="rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                  Active Elements ({config.fields.length})
                </span>
                <span className="text-[10px] text-[#8C8880]">Click to edit / ✕ to delete</span>
              </div>

              {/* Elements List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {config.fields.map((f) => {
                  const isSelected =
                    selectedFieldKey === f.key || selectedFieldKey === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFieldKey(f.key || f.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition border ${
                        isSelected
                          ? "bg-[#EBEBD0] border-[#C62828] font-bold text-[#1C1917]"
                          : "bg-[#FBFBF9] border-[#E5E3D8] text-[#57534E] hover:border-[#D5D2C4]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {f.type === "qr" ? (
                          <QrCode className="h-3.5 w-3.5 text-[#FF8F00] shrink-0" />
                        ) : (
                          <Type className="h-3.5 w-3.5 text-[#8D6E63] shrink-0" />
                        )}
                        <span className="truncate">{f.label || f.key}</span>
                        <span className="text-[10px] text-[#8C8880] font-mono shrink-0">
                          ({f.x}%, {f.y}%)
                        </span>
                      </div>

                      <button
                        type="button"
                        title={`Delete ${f.label || f.key}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteField(f.id || f.key);
                        }}
                        className="p-1 rounded text-[#8C8880] hover:text-[#C62828] hover:bg-[#FFEBEE] transition shrink-0 ml-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Field Actions */}
              <div className="pt-2 border-t border-[#E5E3D8] space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8880] block">
                  Add Extra Elements:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleAddField("custom_text")}
                    className="py-1.5 px-2 text-[11px] font-semibold text-[#1C1917] bg-[#FAF9F5] border border-[#D5D2C4] rounded-lg hover:bg-[#F2F1E4] transition flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3 text-[#C62828]" />
                    Custom Text
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddField("custom_text", "CUSTOM_SIGNATORY")}
                    className="py-1.5 px-2 text-[11px] font-semibold text-[#1C1917] bg-[#FAF9F5] border border-[#D5D2C4] rounded-lg hover:bg-[#F2F1E4] transition flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3 text-[#C62828]" />
                    Signatory
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddField("qr")}
                    className="py-1.5 px-2 text-[11px] font-semibold text-[#1C1917] bg-[#FAF9F5] border border-[#D5D2C4] rounded-lg hover:bg-[#F2F1E4] transition flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3 text-[#C62828]" />
                    QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddField("text", "TITLE")}
                    className="py-1.5 px-2 text-[11px] font-semibold text-[#1C1917] bg-[#FAF9F5] border border-[#D5D2C4] rounded-lg hover:bg-[#F2F1E4] transition flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3 text-[#C62828]" />
                    Title
                  </button>
                </div>
              </div>
            </div>

            {/* Save Template Button */}
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              className="w-full rounded-xl bg-[#C62828] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C] disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin text-[#FBC02D]" /> : <Save className="h-4 w-4 text-[#FBC02D]" />}
              Save Template & Field Coordinates
            </button>
          </div>

          {/* RIGHT COLUMN: Interactive Certificate Visual Canvas */}
          <div className="lg:col-span-8 rounded-xl border border-[#E5E3D8] bg-[#EBEBD0]/40 p-4 shadow-2xs flex flex-col items-center justify-center min-h-[620px] overflow-hidden">
            {/* Top Canvas Controls */}
            <div className="w-full flex items-center justify-between mb-3 px-2 text-xs text-[#57534E] flex-wrap gap-2">
              <span className="font-bold text-[#1C1917] flex items-center gap-1.5">
                <FileBadge className="h-4 w-4 text-[#C62828]" />
                Interactive Certificate Canvas &bull; Click any text to select, drag/click to place
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearPreprintedFields}
                  className="inline-flex items-center gap-1 rounded border border-[#FBC02D] bg-[#FFF9C4] px-2 py-0.5 text-[11px] font-bold text-[#7F5800] hover:bg-[#FFF59D] transition"
                  title="Remove default title, subtitle, and body text if pre-printed in background"
                >
                  <Sparkles className="h-3 w-3 text-[#FF8F00]" />
                  Clear Pre-printed Fields
                </button>

                <div className="flex items-center rounded border border-[#D5D2C4] bg-white">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(Math.max(70, zoomLevel - 10))}
                    className="px-2 py-0.5 hover:bg-[#F2F1E4] font-mono text-xs"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-bold px-1.5">{zoomLevel}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(Math.min(125, zoomLevel + 10))}
                    className="px-2 py-0.5 hover:bg-[#F2F1E4] font-mono text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* The Visual Certificate Canvas (A4 landscape ratio 842 : 595 => 720 x 509 px) */}
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
              className="transition-transform duration-200"
            >
              <div
                ref={canvasRef}
                onClick={handleCanvasClick}
                className={`relative w-[720px] h-[509px] rounded-lg select-none shadow-xl overflow-hidden border-4 border-[#C62828] ${
                  isDragging ? "cursor-grabbing select-none" : "cursor-default"
                }`}
                style={{
                  backgroundColor: bgReference.startsWith("data:") ? "#FFFFFF" : config.backgroundColor || "#F5F5DC",
                  backgroundImage: bgReference.startsWith("data:") ? `url(${bgReference})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Default institutional ornate accents */}
                {!bgReference.startsWith("data:") && (
                  <>
                    <div className="absolute inset-2 border-2 border-[#C62828] pointer-events-none"></div>
                    <div className="absolute inset-3 border border-[#FBC02D] pointer-events-none"></div>
                    <div className="absolute top-3 left-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>
                    <div className="absolute top-3 right-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>
                    <div className="absolute bottom-3 left-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>
                    <div className="absolute bottom-3 right-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>

                    {/* Gold Medallion Seal */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FBC02D] border-2 border-[#FF8F00] shadow-sm">
                        <Award className="h-6 w-6 text-[#C62828]" />
                      </div>
                      <span className="text-[8px] font-bold text-[#8D6E63] mt-0.5 tracking-wider">
                        {config.sealText || "OFFICIAL SEAL"}
                      </span>
                    </div>
                  </>
                )}

                {/* Render All Dynamic Fields with Drag-and-Drop + Delete Controls */}
                {config.fields.map((field) => {
                  const isParticipantName = field.key === "PARTICIPANT_NAME";
                  const isSelected = selectedFieldKey === field.key || selectedFieldKey === field.id;
                  const isCurrentlyBeingDragged = isDragging && draggedFieldId === (field.key || field.id);

                  if (field.type === "qr") {
                    return (
                      <div
                        key={field.id}
                        onMouseDown={(e) => handleFieldMouseDown(e, field.key || field.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFieldKey(field.key || field.id);
                        }}
                        style={{
                          left: `${field.x}%`,
                          top: `${field.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`group absolute p-1 rounded transition-all bg-white cursor-grab active:cursor-grabbing select-none ${
                          isCurrentlyBeingDragged
                            ? "ring-4 ring-[#C62828] scale-105 shadow-2xl z-50 cursor-grabbing"
                            : isSelected
                            ? "ring-2 ring-[#C62828] shadow-md z-30"
                            : "border border-[#E5E3D8] hover:ring-1 hover:ring-[#C62828]/60 z-10"
                        }`}
                      >
                        {/* Live Coordinates Pill while dragging */}
                        {isCurrentlyBeingDragged && (
                          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#C62828] text-white text-[9px] font-mono px-2 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-50">
                            📍 X: {field.x}% &bull; Y: {field.y}%
                          </div>
                        )}

                        {/* Selected Floating Action Pill */}
                        {isSelected && !isCurrentlyBeingDragged && (
                          <div
                            className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40 bg-[#1C1917] text-white text-[10px] font-sans px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="font-semibold">{field.label || "QR Code"}</span>
                            <span className="text-[#8C8880]">({field.x}%, {field.y}%)</span>
                            <button
                              type="button"
                              title="Delete QR code from certificate"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteField(field.id || field.key);
                              }}
                              className="ml-1 flex items-center gap-0.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer transition"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}

                        <QrCode className="h-10 w-10 text-[#1C1917]" />
                        <span className="block text-[7px] text-center font-mono text-[#57534E]">
                          Scan QR
                        </span>
                      </div>
                    );
                  }

                  let textValue = field.defaultText || "";
                  if (isParticipantName) textValue = sampleName || "Dharanesh Kumar";
                  else if (field.key === "ROLL_NUMBER") textValue = "Roll No: 24ISR011";
                  else if (field.key === "EVENT_NAME") textValue = selectedEvent?.name || "Tech Symposium 2026";
                  else if (field.key === "CERTIFICATE_ID") textValue = "CERT-2026-X7K9P4M2";

                  return (
                    <div
                      key={field.id}
                      onMouseDown={(e) => handleFieldMouseDown(e, field.key || field.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFieldKey(field.key || field.id);
                      }}
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        transform:
                          field.textAlign === "center"
                            ? "translateX(-50%)"
                            : field.textAlign === "right"
                            ? "translateX(-100%)"
                            : "none",
                        color: field.color || "#1C1917",
                        fontSize: `${Math.max(9, (field.fontSize || 14) * 0.75)}px`,
                        fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
                        fontFamily: field.fontFamily?.includes("Times")
                          ? "serif"
                          : field.fontFamily?.includes("Courier")
                          ? "monospace"
                          : "sans-serif",
                        letterSpacing: field.letterSpacing ? `${field.letterSpacing}px` : undefined,
                      }}
                      className={`group absolute px-2 py-0.5 rounded transition-all cursor-grab active:cursor-grabbing select-none bg-transparent ${
                        isCurrentlyBeingDragged
                          ? "ring-2 ring-dashed ring-[#C62828] scale-105 z-50 cursor-grabbing bg-transparent"
                          : isParticipantName
                          ? isSelected
                            ? "ring-2 ring-[#C62828] font-serif z-30 bg-transparent"
                            : "hover:ring-1 hover:ring-[#C62828]/60 font-serif z-10 bg-transparent"
                          : isSelected
                          ? "ring-2 ring-[#C62828] z-30 bg-transparent"
                          : "hover:ring-1 hover:ring-[#57534E]/40 z-10 bg-transparent"
                      }`}
                    >
                      {/* Live Coordinates Pill while dragging */}
                      {isCurrentlyBeingDragged && (
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#C62828] text-white text-[9px] font-mono px-2 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-50">
                          📍 X: {field.x}% &bull; Y: {field.y}%
                        </div>
                      )}

                      {/* Floating Action Pill on Selected Field */}
                      {isSelected && !isCurrentlyBeingDragged && (
                        <div
                          className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40 bg-[#1C1917] text-white text-[10px] font-sans px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="font-semibold text-white">
                            {field.label || (isParticipantName ? "Participant Name" : field.key)}
                          </span>
                          <span className="text-[#8C8880]">({field.x}%, {field.y}%)</span>
                          <button
                            type="button"
                            title="Delete this field from certificate"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteField(field.id || field.key);
                            }}
                            className="ml-1 flex items-center gap-0.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer transition shadow-xs"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}

                      <span className="whitespace-pre-line leading-tight">
                        {textValue}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARTICIPANT ROSTER MANAGEMENT */}
      {activeTab === "roster" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E3D8] shadow-2xs">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#8C8880]" />
              <input
                type="text"
                placeholder="Search participants by name, roll no, department..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] pl-10 pr-4 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2C4] bg-white px-3 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] transition"
              >
                <Plus className="h-3.5 w-3.5 text-[#C62828]" />
                Add Single Participant
              </button>

              <button
                type="button"
                onClick={() => {
                  setCsvPreview(null);
                  setIsCsvModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#C62828] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#B71C1C] transition"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#FBC02D]" />
                Bulk CSV Import
              </button>
            </div>
          </div>

          {/* Bulk Action Bar when roster items selected */}
          {selectedRosterIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFEBEE] border border-[#FFCDD2] p-3.5 rounded-xl shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C62828] text-white text-xs font-bold">
                  {selectedRosterIds.length}
                </span>
                <span className="text-xs font-bold text-[#C62828]">
                  {selectedRosterIds.length === 1 ? "1 participant selected" : `${selectedRosterIds.length} participants selected`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRosterIds([])}
                  className="rounded-lg border border-[#D5D2C4] bg-white px-3 py-1.5 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4] transition cursor-pointer"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteRosterModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#C62828] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#B71C1C] transition shadow-xs cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected ({selectedRosterIds.length})
                </button>
              </div>
            </div>
          )}

          {/* Roster Table */}
          <div className="rounded-xl border border-[#E5E3D8] bg-white shadow-2xs overflow-hidden">
            {loadingParticipants ? (
              <div className="p-12 text-center text-xs text-[#57534E] flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#C62828]" />
                Loading participant roster...
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#8C8880] space-y-2">
                <Users className="h-8 w-8 mx-auto text-[#D5D2C4]" />
                <p className="font-semibold text-[#1C1917]">No participants rostered for this event</p>
                <p>Add participants manually or import via CSV to enable certificate issuance.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F5] border-b border-[#E5E3D8] text-[#8C8880] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredParticipants.length > 0 && selectedRosterIds.length === filteredParticipants.length}
                          onChange={toggleSelectAllRoster}
                          className="rounded border-[#D5D2C4] text-[#C62828] focus:ring-[#C62828] cursor-pointer h-4 w-4"
                          title={selectedRosterIds.length === filteredParticipants.length ? "Deselect all" : "Select all"}
                        />
                      </th>
                      <th className="px-5 py-3.5">Roll Number</th>
                      <th className="px-5 py-3.5">Participant Official Name</th>
                      <th className="px-5 py-3.5">Department</th>
                      <th className="px-5 py-3.5">Eligibility</th>
                      <th className="px-5 py-3.5">Certificate</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E3D8]">
                    {filteredParticipants.map((p) => {
                      const isSelected = selectedRosterIds.includes(p.id);
                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-[#FBFBF9] transition ${
                            isSelected ? "bg-[#FFEBEE]/40" : ""
                          }`}
                        >
                          <td className="px-4 py-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRosterParticipant(p.id)}
                              className="rounded border-[#D5D2C4] text-[#C62828] focus:ring-[#C62828] cursor-pointer h-4 w-4"
                            />
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-[#1C1917]">
                            {p.roll_number}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-[#1C1917]">
                            {p.name}
                            {p.email && <span className="block text-[11px] text-[#8C8880]">{p.email}</span>}
                          </td>
                          <td className="px-5 py-3.5 text-[#57534E]">
                            {p.department || "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-block rounded-full bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 text-[10px] font-bold border border-[#C8E6C9]">
                              Eligible
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-[11px] text-[#2E7D32] italic font-medium">
                              On-Demand Ready
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setParticipantToDelete(p)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#FFCDD2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#C62828] hover:bg-[#FFEBEE] transition shadow-2xs cursor-pointer"
                              title="Delete Participant"
                            >
                              <Trash2 className="h-3 w-3 text-[#C62828]" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TEST GENERATION & STORAGE POLICIES */}
      {activeTab === "test" && (
        <div className="space-y-6">
          {/* Storage Policy Callout */}
          <div className="rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-[#E5E3D8] pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1917]">
                  Storage Optimization: In-Memory On-Demand PDF Pipeline
                </h3>
                <p className="text-xs text-[#57534E]">
                  Strict compliance with your zero permanent file storage mandate.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#57534E]">
              <div className="p-3.5 rounded-lg bg-[#F8F7F0] border border-[#E5E3D8]">
                <span className="font-bold text-[#1C1917] block mb-1">Zero Disk Files</span>
                Generated certificates are never stored as static PDFs on server disks. Everything is rendered dynamically in volatile memory upon participant request.
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8F7F0] border border-[#E5E3D8]">
                <span className="font-bold text-[#1C1917] block mb-1">Issued ID Tracking</span>
                Only the unique Certificate ID (e.g. <code>TECH20-2026-XXXXXXXX</code>), participant relationship, and cryptographic SHA-256 token are retained in the database for verification.
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8F7F0] border border-[#E5E3D8]">
                <span className="font-bold text-[#1C1917] block mb-1">Instant Revocation</span>
                If an issued ID is revoked by the administrator, the public verification page immediately displays the revoked warning without modifying any static files.
              </div>
            </div>
          </div>

          {/* Live In-Memory Test Action */}
          <div className="rounded-xl border border-[#E5E3D8] bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#1C1917]">
              Test In-Memory Certificate Generation
            </h3>
            <p className="text-xs text-[#57534E]">
              Simulate participant download for <span className="font-semibold text-[#1C1917]">{sampleName}</span>. This streams the PDF directly from memory without saving any files to disk.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!selectedEventId || participants.length === 0) {
                    setFeedback({ type: "error", msg: "Please ensure at least one participant is registered to test generation." });
                    return;
                  }
                  const testParticipant = participants[0];
                  try {
                    const genRes = await fetch("/api/certificates/generate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        eventId: selectedEventId,
                        rollNumber: testParticipant.roll_number,
                      }),
                    });
                    const genData = await genRes.json();
                    if (genRes.ok) {
                      window.open(genData.downloadUrl, "_blank");
                    } else {
                      setFeedback({ type: "error", msg: genData.error || "Generation error" });
                    }
                  } catch {
                    setFeedback({ type: "error", msg: "Generation failed" });
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C62828] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C] transition"
              >
                <Download className="h-4 w-4 text-[#FBC02D]" />
                Test Stream High-Res PDF (In-Memory)
              </button>

              <Link
                href={`/verify`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2C4] bg-white px-4 py-2.5 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] transition"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#2E7D32]" />
                Open Public Verification Portal
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ADD PARTICIPANT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3">
              <h2 className="text-base font-bold text-[#1C1917]">Register Event Participant</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#8C8880] hover:text-[#1C1917]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddParticipant} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Roll Number / ID *</label>
                <input
                  type="text"
                  placeholder="e.g. 24ISR011"
                  value={newRoll}
                  onChange={(e) => setNewRoll(e.target.value.toUpperCase())}
                  required
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 font-mono uppercase text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Official Name (To appear on certificate) *</label>
                <input
                  type="text"
                  placeholder="e.g. Dharanesh Kumar"
                  value={newName}
                  onChange={(e) => {
                    const filtered = e.target.value.replace(/[^A-Za-z\s]/g, "");
                    setNewName(filtered);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Backspace" ||
                      e.key === "Delete" ||
                      e.key === "Tab" ||
                      e.key === "ArrowLeft" ||
                      e.key === "ArrowRight" ||
                      e.key === "Home" ||
                      e.key === "End" ||
                      e.key === " "
                    ) {
                      return;
                    }
                    if (!/^[A-Za-z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                    }
                  }}
                  pattern="^[A-Za-z\s]+$"
                  title="Only alphabetic characters (A–Z) and spaces are allowed"
                  required
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
                <p className="text-[10px] text-[#8C8880] mt-1">
                  Accepts only alphabetic characters (A–Z) and spaces.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Email</label>
                <input
                  type="email"
                  placeholder="dharanesh@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] mb-1">Department</label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2.5 text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingParticipant}
                  className="rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B71C1C] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {addingParticipant && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Register Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#2E7D32]" />
                <h2 className="text-base font-bold text-[#1C1917]">Bulk CSV Participant Import</h2>
              </div>
              <button onClick={() => { setIsCsvModalOpen(false); setCsvText(""); setCsvFileName(null); setCsvPreview(null); }} className="text-[#8C8880] hover:text-[#1C1917]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 text-xs">

              {/* STEP 1 — Download template */}
              <div className="rounded-xl border border-[#C8E6C9] bg-[#F1F8E9] p-4 flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2E7D32] text-white text-[11px] font-bold">1</div>
                <div className="flex-1">
                  <p className="font-bold text-[#1B5E20] mb-1">Download the official template</p>
                  <div className="text-[11px] text-[#388E3C] mb-3 space-y-1">
                    <p>Fill in your participants. Only two fields are required:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#C8E6C9] px-2 py-0.5 font-semibold text-[#1B5E20]">✱ roll_number — Required</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#C8E6C9] px-2 py-0.5 font-semibold text-[#1B5E20]">✱ name — Required</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-white border border-[#A5D6A7] px-2 py-0.5 text-[#388E3C]">email — Optional</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-white border border-[#A5D6A7] px-2 py-0.5 text-[#388E3C]">department — Optional</span>
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
                  <p className="font-bold text-[#1C1917] mb-1">Upload your completed CSV file</p>
                  <p className="text-[11px] text-[#57534E] mb-3">Only upload files following the downloaded template format.</p>
                  <label
                    htmlFor="cert-csv-upload"
                    className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      csvFileName ? "border-[#2E7D32] bg-[#E8F5E9]" : "border-[#D5D2C4] bg-white hover:bg-[#F5F4EE]"
                    } p-6`}
                  >
                    {csvFileName ? (
                      <>
                        <CheckCircle2 className="h-8 w-8 text-[#2E7D32] mb-2" />
                        <span className="font-semibold text-[#1C1917] text-xs">{csvFileName}</span>
                        <span className="text-[10px] text-[#57534E] mt-0.5">
                          {csvText.split("\n").filter((l) => l && !l.startsWith("#")).length - 1} data row(s) detected &mdash; click to change
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-[#8C8880] mb-2" />
                        <span className="font-semibold text-[#1C1917] text-xs">Click to upload CSV file</span>
                        <span className="text-[10px] text-[#8C8880] mt-0.5">.csv files only</span>
                      </>
                    )}
                    <input id="cert-csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
                  </label>
                </div>
              </div>

              {csvPreview && (
                <div className="rounded-lg border border-[#D5D2C4] bg-[#F8F7F0] p-4 space-y-2">
                  <span className="font-bold text-[#1C1917] block">Validation Summary:</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded bg-white border border-[#E5E3D8]">
                      <span className="text-[#8C8880] block text-[10px]">Total Rows</span>
                      <span className="font-bold text-sm">{csvPreview.summary.totalRows}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#C8E6C9] text-[#2E7D32]">
                      <span className="block text-[10px]">Valid</span>
                      <span className="font-bold text-sm">{csvPreview.summary.validCount}</span>
                    </div>
                    <div className="p-2 rounded bg-white border border-[#FFE082] text-[#FF8F00]">
                      <span className="block text-[10px]">Duplicates</span>
                      <span className="font-bold text-sm">{csvPreview.summary.duplicateCount}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E5E3D8] shrink-0">
              <button
                type="button"
                onClick={handleValidateCsv}
                disabled={csvValidating || !csvText.trim()}
                className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] disabled:opacity-50 flex items-center gap-1.5"
              >
                {csvValidating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Validate CSV Rows
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="rounded-lg border border-[#D5D2C4] bg-white px-3 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCsvImport}
                  disabled={csvImporting || !csvPreview || csvPreview.summary.validCount === 0}
                  className="rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B71C1C] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {csvImporting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm & Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PARTICIPANT CONFIRMATION MODAL */}
      {participantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3">
              <div className="flex items-center gap-2 text-[#C62828]">
                <Trash2 className="h-5 w-5" />
                <h2 className="text-base font-bold text-[#1C1917]">
                  Delete Participant
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setParticipantToDelete(null)}
                className="text-[#8C8880] hover:text-[#1C1917]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#57534E]">
              <p>
                Are you sure you want to remove{" "}
                <strong className="text-[#1C1917]">{participantToDelete.name}</strong> (Roll No:{" "}
                <span className="font-mono font-bold text-[#1C1917]">{participantToDelete.roll_number}</span>) from the participant roster?
              </p>
              <p className="text-[11px] text-[#C62828] bg-[#FFEBEE] p-2 rounded border border-[#FFCDD2]">
                This will permanently delete the participant record from this event roster.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
              <button
                type="button"
                onClick={() => setParticipantToDelete(null)}
                disabled={deletingParticipantId !== null}
                className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteParticipant(participantToDelete.id)}
                disabled={deletingParticipantId !== null}
                className="rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B71C1C] disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingParticipantId ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Participant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE PARTICIPANTS CONFIRMATION MODAL */}
      {isBulkDeleteRosterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3">
              <div className="flex items-center gap-2 text-[#C62828]">
                <Trash2 className="h-5 w-5" />
                <h2 className="text-base font-bold text-[#1C1917]">
                  Delete Multiple Participants
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkDeleteRosterModalOpen(false)}
                className="text-[#8C8880] hover:text-[#1C1917]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#57534E]">
              <p>
                Are you sure you want to delete{" "}
                <strong className="text-[#C62828] font-bold text-sm">
                  {selectedRosterIds.length}
                </strong>{" "}
                selected participant(s) from this event roster?
              </p>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-[#E5E3D8] bg-[#FBFBF9] p-3 space-y-1.5 divide-y divide-[#E5E3D8]">
                {filteredParticipants
                  .filter((p) => selectedRosterIds.includes(p.id))
                  .map((p) => (
                    <div
                      key={p.id}
                      className="pt-1.5 first:pt-0 flex items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-[#1C1917] truncate">
                        {p.name}
                      </span>
                      <span className="font-mono text-[#7F5800] bg-[#FFF9C4] px-1.5 py-0.5 rounded text-[11px] border border-[#FBC02D] shrink-0">
                        {p.roll_number}
                      </span>
                    </div>
                  ))}
              </div>

              <p className="text-[11px] text-[#C62828] bg-[#FFEBEE] p-2.5 rounded-lg border border-[#FFCDD2]">
                <strong>Warning:</strong> This action cannot be undone. All selected participant records will be permanently removed from this event.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E3D8]">
              <button
                type="button"
                onClick={() => setIsBulkDeleteRosterModalOpen(false)}
                disabled={isBulkDeletingRoster}
                className="rounded-lg border border-[#D5D2C4] bg-white px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F2F1E4] disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteRoster}
                disabled={isBulkDeletingRoster}
                className="rounded-lg bg-[#C62828] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B71C1C] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isBulkDeletingRoster ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting {selectedRosterIds.length} Participants...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Confirm & Delete ({selectedRosterIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
