"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Eye,
  Upload,
  Plus,
  Trash2,
  Type,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  Award,
  X,
  Sparkles,
} from "lucide-react";
import { CertificateField, TemplateConfiguration } from "@/lib/certificate/templateTypes";
import { DEFAULT_TEMPLATE_CONFIG } from "@/lib/certificate/defaultTemplate";

export default function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);

  const [eventName, setEventName] = useState("");
  const [version, setVersion] = useState(1);
  const [config, setConfig] = useState<TemplateConfiguration>(DEFAULT_TEMPLATE_CONFIG);
  const [selectedFieldId, setSelectedFieldId] = useState<string>("field-participant-name");
  const [bgReference, setBgReference] = useState<string>("default-ornate-gold");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Zoom & Canvas Drag-and-Drop state
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // File upload input ref and Canvas drag refs
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

  useEffect(() => {
    async function loadData() {
      try {
        const [evRes, tmplRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/template`),
        ]);

        const evData = await evRes.json();
        const tmplData = await tmplRes.json();

        if (evData.event) setEventName(evData.event.name);
        if (tmplData.template) {
          setVersion(tmplData.template.version);
          if (tmplData.template.configuration) {
            setConfig(tmplData.template.configuration);
          }
          if (tmplData.template.templateReference) {
            setBgReference(tmplData.template.templateReference);
          }
        }
      } catch (err) {
        console.error("Failed to load template data:", err);
      }
    }
    loadData();
  }, [eventId]);

  const selectedField = config.fields.find((f) => f.id === selectedFieldId) || config.fields[0];

  const updateSelectedField = (updates: Partial<CertificateField>) => {
    if (!selectedField) return;
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === selectedField.id ? { ...f, ...updates } : f)),
    }));
  };

  const handleAddField = (type: "text" | "custom_text" | "qr") => {
    const newId = `field-custom-${Date.now()}`;
    const newField: CertificateField = {
      id: newId,
      key: `CUSTOM_${Date.now().toString(36).toUpperCase()}`,
      label: type === "qr" ? "Extra QR Code" : "Custom Dynamic Field",
      type,
      defaultText: type === "qr" ? undefined : "Custom Text Content",
      x: 50,
      y: 50,
      width: 40,
      height: 6,
      fontSize: 14,
      fontFamily: "Helvetica",
      fontWeight: "normal",
      textAlign: "center",
      color: "#1C1917",
      qrSize: 70,
    };

    setConfig((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newId);
  };

  const handleDeleteField = (id: string) => {
    if (config.fields.length <= 1) return;
    const target = config.fields.find((f) => f.id === id);
    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
    }));
    const remaining = config.fields.filter((f) => f.id !== id);
    if (remaining.length > 0) setSelectedFieldId(remaining[0].id);

    setNotification({
      type: "success",
      text: `Deleted "${target?.label || "field"}" from certificate.`,
    });
    setTimeout(() => setNotification(null), 3000);
  };

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
      setNotification({
        type: "success",
        text: "Pre-printed text fields were already removed.",
      });
      setTimeout(() => setNotification(null), 2500);
      return;
    }

    setConfig((prev) => ({
      ...prev,
      fields: remaining,
    }));

    const nextField = remaining.find((f) => f.key === "PARTICIPANT_NAME") || remaining[0];
    if (nextField) {
      setSelectedFieldId(nextField.id);
    }

    setNotification({
      type: "success",
      text: "Cleared pre-printed boilerplate (Title, Subtitle, Description, Organizers). Only dynamic fields remain!",
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Keyboard shortcut: Delete or Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || (activeEl as HTMLElement)?.isContentEditable) {
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedFieldId) {
        e.preventDefault();
        handleDeleteField(selectedFieldId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFieldId, config.fields]);

  // Drag-and-Drop Handler for Canvas Elements (Only moves while clicking and dragging continuously)
  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    if (e.button !== 0) return; // Only respond to primary left mouse button
    e.stopPropagation();
    e.preventDefault();
    setSelectedFieldId(fieldId);

    const targetField = config.fields.find((f) => f.id === fieldId);
    if (!targetField) return;

    draggedFieldRef.current = fieldId;
    setDraggedFieldId(fieldId);
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
          f.id === targetId ? { ...f, x: clampedX, y: clampedY } : f
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
          const movedField = config.fields.find((f) => f.id === targetId);
          if (movedField) {
            setNotification({
              type: "success",
              text: `Placed ${movedField.label} at X: ${movedField.x}%, Y: ${movedField.y}%`,
            });
            setTimeout(() => setNotification(null), 2000);
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
    setSelectedFieldId("");
    setNotification({
      type: "success",
      text: "All overlays cleared! Template is completely blank. Use '+ Add Field' to place elements.",
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Canvas Click Handler: clicking on the canvas background does NOT move fields
  const handleCanvasClick = () => {
    // Intentionally no-op: fields only move when clicked and dragged continuously
  };

  const handleSave = async () => {
    setSaving(true);
    setNotification(null);

    try {
      const res = await fetch(`/api/events/${eventId}/template`, {
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
        setNotification({ type: "error", text: data.error || "Save failed" });
      } else {
        setVersion(data.template.version);
        setNotification({
          type: "success",
          text: `Template configuration saved successfully (Active Version: v${data.template.version}).`,
        });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch {
      setNotification({ type: "error", text: "Network error occurred while saving." });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setNotification(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/events/${eventId}/template/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: "error", text: data.error || "Upload failed" });
      } else {
        setBgReference(data.templateReference);

        // When custom template is uploaded, strip out boilerplate overlays:
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

        const nameField = updated.find((f) => f.key === "PARTICIPANT_NAME") || updated[0];
        if (nameField) setSelectedFieldId(nameField.id);

        setNotification({
          type: "success",
          text: "Custom certificate template uploaded! Default text overlays removed so only your graphic and dynamic draggable fields (Name, QR, ID) appear.",
        });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch {
      setNotification({ type: "error", text: "Network error during image upload." });
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefault = () => {
    if (confirm("Reset template fields to official institutional defaults?")) {
      setConfig(DEFAULT_TEMPLATE_CONFIG);
      setBgReference("default-ornate-gold");
      setSelectedFieldId("field-participant-name");
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E3D8] shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/events"
            className="p-1.5 rounded-lg border border-[#D5D2C4] hover:bg-[#F2F1E4] text-[#57534E]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#1C1917]">
                Certificate Template Studio
              </h1>
              <span className="rounded-full bg-[#FFF9C4] px-2 py-0.5 text-[10px] font-bold text-[#7F5800] border border-[#FBC02D]">
                v{version} Active
              </span>
            </div>
            <p className="text-[11px] text-[#57534E]">
              {eventName || "Event Certificate"} &bull; Visual Coordinate Engine (A4 842 &times; 595 pt)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center rounded-lg border border-[#D5D2C4] bg-[#FBFBF9] p-0.5 text-xs text-[#57534E]">
            <button
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 15))}
              className="p-1.5 hover:text-[#1C1917]"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 font-mono text-[10px]">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(130, zoomLevel + 15))}
              className="p-1.5 hover:text-[#1C1917]"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
              showGrid
                ? "bg-[#EBEBD0] border-[#D5D2C4] text-[#1C1917]"
                : "border-[#D5D2C4] bg-white text-[#57534E] hover:bg-[#F2F1E4]"
            }`}
          >
            Guides {showGrid ? "ON" : "OFF"}
          </button>

          {/* Upload BG */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleUploadBg}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2C4] bg-white px-3 py-1.5 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] transition"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-[#FF8F00]" />
            )}
            Upload Background
          </button>

          {/* Preview Modal Trigger */}
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2C4] bg-white px-3 py-1.5 text-xs font-semibold text-[#1C1917] hover:bg-[#F2F1E4] transition"
          >
            <Eye className="h-3.5 w-3.5 text-[#2E7D32]" />
            Preview Sample
          </button>

          {/* Reset */}
          <button
            onClick={handleResetToDefault}
            className="p-1.5 rounded-lg border border-[#D5D2C4] bg-white text-[#8C8880] hover:text-[#C62828] hover:bg-[#FFEBEE] transition"
            title="Reset to default template"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#C62828] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#B71C1C] disabled:opacity-50 transition"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FBC02D]" />
            ) : (
              <Save className="h-3.5 w-3.5 text-[#FBC02D]" />
            )}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          className={`rounded-lg p-3 text-xs flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]"
              : "bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {notification.text}
        </div>
      )}

      {/* 3-COLUMN STUDIO LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PANEL: Dynamic Fields List */}
        <div className="lg:col-span-3 rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
              Dynamic Fields
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleAddField("text")}
                className="p-1 rounded hover:bg-[#F2F1E4] text-[#C62828]"
                title="Add Text Field"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
            {config.fields.map((f) => {
              const isSelected = f.id === selectedFieldId;
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFieldId(f.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs transition border ${
                    isSelected
                      ? "bg-[#F5F5DC] border-[#C62828] text-[#1C1917] font-semibold"
                      : "bg-[#FBFBF9] border-[#E5E3D8] text-[#57534E] hover:border-[#D5D2C4]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {f.type === "qr" ? (
                      <QrCode className="h-4 w-4 text-[#FF8F00] shrink-0" />
                    ) : (
                      <Type className="h-4 w-4 text-[#8D6E63] shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="block truncate">{f.label}</span>
                      <span className="block text-[10px] text-[#8C8880] font-mono">
                        {`{{${f.key}}}`}
                      </span>
                    </div>
                  </div>

                  {config.fields.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteField(f.id);
                      }}
                      className="text-[#8C8880] hover:text-[#C62828] p-1"
                      title="Remove field"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#E5E3D8] space-y-2">
            <button
              type="button"
              onClick={handleClearAllFields}
              className="w-full py-1.5 px-2 text-[11px] font-bold text-[#C62828] bg-[#FFEBEE] border border-[#FFCDD2] rounded-lg hover:bg-[#FFCDD2] transition flex items-center justify-center gap-1.5 shadow-2xs"
              title="Clear all overlays for a completely blank custom canvas"
            >
              <Trash2 className="h-3.5 w-3.5 text-[#C62828]" />
              Clear All (Blank Canvas)
            </button>
            <button
              type="button"
              onClick={handleClearPreprintedFields}
              className="w-full py-1.5 px-2 text-[11px] font-bold text-[#7F5800] bg-[#FFF9C4] border border-[#FBC02D] rounded-lg hover:bg-[#FFF59D] transition flex items-center justify-center gap-1.5 shadow-2xs"
              title="Remove title, subtitle, and body text if already in your background image"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#FF8F00]" />
              Clear Pre-printed Boilerplate
            </button>
            <button
              onClick={() => handleAddField("text")}
              className="w-full py-1.5 text-[11px] font-semibold text-[#1C1917] bg-[#FAF9F5] border border-[#D5D2C4] rounded-lg hover:bg-[#F2F1E4] transition"
            >
              + Add Custom Text Placeholder
            </button>
          </div>
        </div>

        {/* CENTER PANEL: Interactive Certificate Canvas */}
        <div className="lg:col-span-6 rounded-xl border border-[#E5E3D8] bg-[#EBEBD0]/40 p-4 shadow-2xs flex flex-col items-center justify-center min-h-[580px] overflow-hidden">
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center center" }}
            className="transition-transform duration-200"
          >
            {/* The Certificate Canvas (A4 landscape ratio 842 : 595 => ~720 x 509 px on screen) */}
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={`relative w-[720px] h-[509px] rounded-lg select-none shadow-md overflow-hidden border-4 border-[#C62828] ${
                isDragging ? "cursor-grabbing select-none" : "cursor-default"
              } ${
                showGrid ? "bg-[radial-gradient(#D5D2C4_1px,transparent_1px)] [background-size:16px_16px]" : ""
              }`}
              style={{
                backgroundColor: bgReference.startsWith("data:") ? "#FFFFFF" : config.backgroundColor || "#F5F5DC",
                backgroundImage: bgReference.startsWith("data:") ? `url(${bgReference})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* If default institutional canvas (no custom image uploaded) */}
              {!bgReference.startsWith("data:") && (
                <>
                  {/* Outer Red Line */}
                  <div className="absolute inset-2 border-2 border-[#C62828] pointer-events-none"></div>
                  {/* Middle Gold Line */}
                  <div className="absolute inset-3 border border-[#FBC02D] pointer-events-none"></div>
                  {/* Corner accents */}
                  <div className="absolute top-3 left-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>
                  <div className="absolute top-3 right-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>
                  <div className="absolute bottom-3 left-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>
                  <div className="absolute bottom-3 right-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>

                  {/* Gold Medallion Seal at bottom center */}
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

              {/* RENDER ALL FIELDS ON THE CANVAS */}
              {config.fields.map((field) => {
                const isSelected = field.id === selectedFieldId;
                const isCurrentlyBeingDragged = isDragging && draggedFieldId === field.id;

                if (field.type === "qr") {
                  return (
                    <div
                      key={field.id}
                      onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFieldId(field.id);
                      }}
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className={`group absolute transition-all p-1 rounded bg-white cursor-grab active:cursor-grabbing select-none ${
                        isCurrentlyBeingDragged
                          ? "ring-4 ring-[#C62828] scale-105 shadow-2xl z-50 cursor-grabbing"
                          : isSelected
                          ? "ring-2 ring-[#C62828] ring-offset-2 bg-white/95 shadow-md z-30"
                          : "hover:ring-1 hover:ring-[#FF8F00] bg-white/80 z-10"
                      }`}
                    >
                      {/* Live Coordinates Pill while dragging */}
                      {isCurrentlyBeingDragged && (
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#C62828] text-white text-[9px] font-mono px-2 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-50">
                          📍 X: {field.x}% &bull; Y: {field.y}%
                        </div>
                      )}

                      {/* Floating Action Pill on Selected QR */}
                      {isSelected && !isCurrentlyBeingDragged && (
                        <div
                          className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40 bg-[#1C1917] text-white text-[10px] font-sans px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="font-semibold">{field.label || "QR Code"}</span>
                          <span className="text-[#8C8880]">({field.x}%, {field.y}%)</span>
                          {config.fields.length > 1 && (
                            <button
                              type="button"
                              title="Delete QR code from certificate"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteField(field.id);
                              }}
                              className="ml-1 flex items-center gap-0.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer transition shadow-xs"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col items-center">
                        <QrCode className="h-10 w-10 text-[#1C1917]" />
                        <span className="text-[8px] font-mono font-bold text-[#57534E]">
                          Scan QR
                        </span>
                      </div>
                    </div>
                  );
                }

                // Text field
                let displayText = field.defaultText || field.label;
                if (field.key === "PARTICIPANT_NAME") displayText = "Dharanesh Kumar";
                else if (field.key === "ROLL_NUMBER") displayText = "Roll No: 24ISR011";
                else if (field.key === "EVENT_NAME") displayText = eventName || "Tech Symposium 2026";
                else if (field.key === "CERTIFICATE_ID") displayText = "CERT-2026-X7K9P4M2";

                return (
                  <div
                    key={field.id}
                    onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFieldId(field.id);
                    }}
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      transform: field.textAlign === "center" ? "translateX(-50%)" : field.textAlign === "right" ? "translateX(-100%)" : "none",
                      color: field.color || "#1C1917",
                      fontSize: `${Math.max(9, (field.fontSize || 14) * 0.75)}px`,
                      fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
                      fontFamily: field.fontFamily?.includes("Times") ? "serif" : field.fontFamily?.includes("Courier") ? "monospace" : "sans-serif",
                      letterSpacing: field.letterSpacing ? `${field.letterSpacing}px` : undefined,
                    }}
                    className={`group absolute transition-all px-2 py-0.5 rounded select-none cursor-grab active:cursor-grabbing bg-transparent ${
                      isCurrentlyBeingDragged
                        ? "ring-2 ring-dashed ring-[#C62828] scale-105 z-50 cursor-grabbing bg-transparent"
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

                    {/* Floating Action Pill on Selected Text */}
                    {isSelected && !isCurrentlyBeingDragged && (
                      <div
                        className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40 bg-[#1C1917] text-white text-[10px] font-sans px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="font-semibold">{field.label}</span>
                        <span className="text-[#8C8880]">({field.x}%, {field.y}%)</span>
                        {config.fields.length > 1 && (
                          <button
                            type="button"
                            title="Delete this field from certificate"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteField(field.id);
                            }}
                            className="ml-1 flex items-center gap-0.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer transition shadow-xs"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}

                    <span className="whitespace-pre-line leading-tight">
                      {displayText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Field Properties */}
        <div className="lg:col-span-3 rounded-xl border border-[#E5E3D8] bg-white p-4 shadow-2xs space-y-4">
          <div className="border-b border-[#E5E3D8] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
              Field Attributes
            </h2>
            <p className="text-[11px] text-[#8C8880] truncate font-mono">
              {selectedField ? selectedField.label : "Select a field"}
            </p>
          </div>

          {/* Quick Element Selector (1-click switch between Name, QR, and Cert ID) */}
          <div className="rounded-xl border border-[#E5E3D8] bg-[#FBFBF9] p-2.5 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8880] block">
              Quick Focus & Position:
            </span>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  const target = config.fields.find((f) => f.key === "PARTICIPANT_NAME");
                  if (target) setSelectedFieldId(target.id);
                }}
                className={`py-1 px-1.5 rounded-md font-bold transition text-center border text-[11px] cursor-pointer ${
                  selectedField?.key === "PARTICIPANT_NAME"
                    ? "bg-[#C62828] text-white border-[#C62828] shadow-xs"
                    : "bg-white border-[#E5E3D8] text-[#1C1917] hover:border-[#D5D2C4]"
                }`}
              >
                👤 Name
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = config.fields.find((f) => f.type === "qr" || f.key === "QR_CODE");
                  if (target) setSelectedFieldId(target.id);
                }}
                className={`py-1 px-1.5 rounded-md font-bold transition text-center border text-[11px] cursor-pointer ${
                  selectedField?.type === "qr" || selectedField?.key === "QR_CODE"
                    ? "bg-[#C62828] text-white border-[#C62828] shadow-xs"
                    : "bg-white border-[#E5E3D8] text-[#1C1917] hover:border-[#D5D2C4]"
                }`}
              >
                📱 QR Code
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = config.fields.find((f) => f.key === "CERTIFICATE_ID");
                  if (target) setSelectedFieldId(target.id);
                }}
                className={`py-1 px-1.5 rounded-md font-bold transition text-center border text-[11px] cursor-pointer ${
                  selectedField?.key === "CERTIFICATE_ID"
                    ? "bg-[#C62828] text-white border-[#C62828] shadow-xs"
                    : "bg-white border-[#E5E3D8] text-[#1C1917] hover:border-[#D5D2C4]"
                }`}
              >
                🏷️ Cert ID
              </button>
            </div>
          </div>

          {selectedField ? (
            <div className="space-y-3.5 text-xs">
              {/* Field Label */}
              <div>
                <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={selectedField.label}
                  onChange={(e) => updateSelectedField({ label: e.target.value })}
                  className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                />
              </div>

              {/* Template Placeholder Text */}
              {selectedField.type !== "qr" && (
                <div>
                  <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                    Text / Placeholder Template
                  </label>
                  <textarea
                    rows={2}
                    value={selectedField.defaultText || ""}
                    onChange={(e) => updateSelectedField({ defaultText: e.target.value })}
                    className="w-full rounded-lg border border-[#D5D2C4] p-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                  />
                </div>
              )}

              {/* Coordinates (X, Y in %) with Range Slider + Direct Numeric Inputs */}
              <div className="space-y-2.5 bg-[#F8F7F0] p-2.5 rounded-lg border border-[#E5E3D8]">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#1C1917] mb-1">
                    <span>Horizontal (X)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedField.x}
                        onChange={(e) =>
                          updateSelectedField({ x: Math.max(0, Math.min(100, Number(e.target.value))) })
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
                    value={selectedField.x}
                    onChange={(e) => updateSelectedField({ x: Number(e.target.value) })}
                    className="w-full accent-[#C62828] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#1C1917] mb-1">
                    <span>Vertical (Y)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedField.y}
                        onChange={(e) =>
                          updateSelectedField({ y: Math.max(0, Math.min(100, Number(e.target.value))) })
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
                    value={selectedField.y}
                    onChange={(e) => updateSelectedField({ y: Number(e.target.value) })}
                    className="w-full accent-[#C62828] cursor-pointer"
                  />
                </div>
              </div>

              {/* Font Controls (for text) */}
              {selectedField.type !== "qr" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                        Font Family
                      </label>
                      <select
                        value={selectedField.fontFamily || "Helvetica"}
                        onChange={(e) => updateSelectedField({ fontFamily: e.target.value as any })}
                        className="w-full rounded-lg border border-[#D5D2C4] p-1.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                      >
                        <option value="Helvetica">Helvetica (Sans)</option>
                        <option value="Helvetica-Bold">Helvetica Bold</option>
                        <option value="Times-Roman">Times (Serif)</option>
                        <option value="Times-Bold">Times Bold</option>
                        <option value="Courier">Courier (Mono)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                        Font Size ({selectedField.fontSize}pt)
                      </label>
                      <input
                        type="number"
                        min={8}
                        max={48}
                        value={selectedField.fontSize || 14}
                        onChange={(e) => updateSelectedField({ fontSize: Number(e.target.value) })}
                        className="w-full rounded-lg border border-[#D5D2C4] p-1.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                      />
                    </div>
                  </div>

                  {/* Alignment & Weight */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                        Alignment
                      </label>
                      <select
                        value={selectedField.textAlign}
                        onChange={(e) => updateSelectedField({ textAlign: e.target.value as any })}
                        className="w-full rounded-lg border border-[#D5D2C4] p-1.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                      >
                        <option value="center">Center</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                        Weight
                      </label>
                      <select
                        value={selectedField.fontWeight || "normal"}
                        onChange={(e) => updateSelectedField({ fontWeight: e.target.value as any })}
                        className="w-full rounded-lg border border-[#D5D2C4] p-1.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#C62828]"
                      >
                        <option value="normal">Regular</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                  </div>

                  {/* Color Selector with Brand Swatches */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#1C1917] mb-1">
                      Text Color ({selectedField.color})
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedField.color || "#1C1917"}
                        onChange={(e) => updateSelectedField({ color: e.target.value })}
                        className="h-8 w-10 rounded border border-[#D5D2C4] p-0.5 cursor-pointer"
                      />
                      <div className="flex gap-1.5">
                        {["#1C1917", "#C62828", "#FF8F00", "#FBC02D", "#57534E", "#2E7D32"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updateSelectedField({ color: c })}
                            style={{ backgroundColor: c }}
                            className="h-6 w-6 rounded-full border border-black/10 hover:scale-110 transition"
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* QR properties */}
              {selectedField.type === "qr" && (
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-[#1C1917] mb-1">
                    <span>QR Code Size</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={30}
                        max={160}
                        value={selectedField.qrSize || 75}
                        onChange={(e) =>
                          updateSelectedField({
                            qrSize: Math.max(30, Math.min(160, Number(e.target.value))),
                          })
                        }
                        className="w-14 rounded border border-[#D5D2C4] bg-white px-1.5 py-0.5 text-right font-mono text-xs font-bold text-[#C62828] focus:outline-none"
                      />
                      <span className="font-mono text-xs text-[#8C8880]">px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={160}
                    value={selectedField.qrSize || 75}
                    onChange={(e) => updateSelectedField({ qrSize: Number(e.target.value) })}
                    className="w-full accent-[#C62828] cursor-pointer"
                  />
                </div>
              )}

              {/* Delete Field Button */}
              {config.fields.length > 1 && (
                <div className="pt-3 border-t border-[#E5E3D8]">
                  <button
                    type="button"
                    onClick={() => handleDeleteField(selectedField.id)}
                    className="w-full rounded-lg border border-[#FFCDD2] bg-[#FFEBEE] py-2 text-xs font-bold text-[#C62828] hover:bg-[#FFCDD2] transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[#C62828]" />
                    Delete &ldquo;{selectedField.label}&rdquo; from Certificate
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#8C8880] italic">
              Select any field on the canvas or left list to adjust its properties.
            </p>
          )}
        </div>
      </div>

      {/* SAMPLE DATA PREVIEW MODAL (Section 12 specification) */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl rounded-xl border border-[#D5D2C4] bg-white p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E3D8] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1C1917]">
                  Final Certificate Visual Output Preview
                </h3>
                <p className="text-xs text-[#57534E]">
                  Sample Data: John Doe (Roll: DEMO001, Cert ID: CERT-2026-DEMO123)
                </p>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-[#8C8880] hover:text-[#1C1917]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview Box */}
            <div className="flex justify-center p-2 bg-[#F8F7F0] rounded-lg border border-[#E5E3D8]">
              <div
                className="relative w-[780px] h-[551px] rounded-lg border-4 border-[#C62828] shadow-lg overflow-hidden"
                style={{
                  backgroundColor: bgReference.startsWith("data:") ? "#FFFFFF" : config.backgroundColor || "#F5F5DC",
                  backgroundImage: bgReference.startsWith("data:") ? `url(${bgReference})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!bgReference.startsWith("data:") && (
                  <>
                    <div className="absolute inset-2 border-2 border-[#C62828]"></div>
                    <div className="absolute inset-3 border border-[#FBC02D]"></div>
                    <div className="absolute top-3 left-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>
                    <div className="absolute top-3 right-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>
                    <div className="absolute bottom-3 left-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>
                    <div className="absolute bottom-3 right-3 w-3 h-3 bg-[#C62828] border border-[#FBC02D]"></div>

                    {/* Seal */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FBC02D] border-2 border-[#FF8F00] shadow-sm">
                        <Award className="h-6 w-6 text-[#C62828]" />
                      </div>
                      <span className="text-[8px] font-bold text-[#8D6E63] mt-1 tracking-wider">
                        {config.sealText || "OFFICIAL SEAL"}
                      </span>
                    </div>
                  </>
                )}

                {/* Sample Rendered Fields */}
                {config.fields.map((field) => {
                  if (field.type === "qr") {
                    return (
                      <div
                        key={field.id}
                        style={{
                          left: `${field.x}%`,
                          top: `${field.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className="absolute p-1 bg-white rounded border border-[#E5E3D8] flex flex-col items-center"
                      >
                        <QrCode className="h-10 w-10 text-[#1C1917]" />
                        <span className="text-[7px] font-mono text-[#57534E]">Verify</span>
                      </div>
                    );
                  }

                  let text = field.defaultText || "";
                  if (field.key === "PARTICIPANT_NAME") text = "John Doe";
                  else if (field.key === "ROLL_NUMBER") text = "Roll No: DEMO001";
                  else if (field.key === "EVENT_NAME") text = eventName || "Tech Symposium 2026";
                  else if (field.key === "CERTIFICATE_ID") text = "ID: CERT-2026-DEMO123";
                  else if (field.key === "DESCRIPTION") {
                    text = `has successfully participated in ${eventName || "Tech Symposium 2026"} organized on 02 October 2026.`;
                  }

                  return (
                    <div
                      key={field.id}
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        transform: field.textAlign === "center" ? "translateX(-50%)" : field.textAlign === "right" ? "translateX(-100%)" : "none",
                        color: field.color || "#1C1917",
                        fontSize: `${Math.max(9, (field.fontSize || 14) * 0.8)}px`,
                        fontWeight: field.fontWeight === "bold" ? "bold" : "normal",
                        fontFamily: field.fontFamily?.includes("Times") ? "serif" : field.fontFamily?.includes("Courier") ? "monospace" : "sans-serif",
                        letterSpacing: field.letterSpacing ? `${field.letterSpacing}px` : undefined,
                      }}
                      className="absolute px-1 text-center whitespace-pre-line leading-tight"
                    >
                      {text}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="rounded-lg bg-[#1C1917] px-4 py-2 text-xs font-semibold text-white hover:bg-[#292524]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
