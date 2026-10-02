import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getAdminSession } from "@/lib/auth/jwt";
import { logAuditAction } from "@/lib/audit/logger";
import { Prisma } from "@prisma/client";
import Papa from "papaparse";
import { cleanParticipantName, cleanRollNumber, cleanGenericText } from "@/lib/utils/sanitize";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: eventId } = await context.params;
    const body = await req.json();
    const { csvContent, dryRun = false } = body;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json({ error: "Missing or invalid CSV content" }, { status: 400 });
    }

    // Clean any corrupt Unicode replacement chars or control chars from raw CSV string
    const sanitizedCsv = csvContent
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\r\n/g, "\n");

    // Parse CSV
    const parsed = Papa.parse<Record<string, string>>(sanitizedCsv.trim(), {
      header: true,
      skipEmptyLines: true,
      comments: "#",
      transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]+/g, "_"),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: "CSV parsing failed", details: parsed.errors },
        { status: 400 }
      );
    }

    const rows = parsed.data;
    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    // Fetch existing roll numbers for this event
    const existingParticipants = await prisma.participant.findMany({
      where: { event_id: eventId },
      select: { roll_number: true },
    });
    const existingRollSet = new Set(existingParticipants.map((p) => p.roll_number.toUpperCase()));

    const seenInCsv = new Set<string>();
    const validRows: Prisma.ParticipantCreateManyInput[] = [];
    const invalidRows: { row: number; roll_number?: string; name?: string; reason: string }[] = [];
    const duplicateRows: { row: number; roll_number: string; reason: string }[] = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2; // account for 1-based index and header line

      // Find relevant keys flexibly and sanitize
      const rawRoll = row.roll_number || row.roll_no || row.rollno || row.participant_id || row.id || "";
      const rawName = row.name || row.participant_name || row.full_name || "";
      const rawEmail = row.email || row.mail || row.email_address || "";
      const rawDept = row.department || row.dept || row.branch || "";
      const rawInst = row.institution || row.college || row.organization || "";

      const rollNumber = cleanRollNumber(rawRoll);
      const name = cleanParticipantName(rawName);
      const email = cleanGenericText(rawEmail).toLowerCase();
      const department = cleanGenericText(rawDept);
      const institution = cleanGenericText(rawInst);

      if (!rollNumber) {
        invalidRows.push({ row: rowNum, name, reason: "Missing Roll Number / Participant ID" });
        return;
      }

      if (!name) {
        invalidRows.push({ row: rowNum, roll_number: rollNumber, reason: "Missing Participant Name" });
        return;
      }

      if (seenInCsv.has(rollNumber)) {
        duplicateRows.push({
          row: rowNum,
          roll_number: rollNumber,
          reason: `Duplicate roll number within CSV file`,
        });
        return;
      }
      seenInCsv.add(rollNumber);

      if (existingRollSet.has(rollNumber)) {
        duplicateRows.push({
          row: rowNum,
          roll_number: rollNumber,
          reason: `Roll number already registered in this event in database`,
        });
        return;
      }

      validRows.push({
        event_id: eventId,
        roll_number: rollNumber,
        name,
        email: email || null,
        department: department || null,
        institution: institution || null,
        eligible: true,
      });
    });

    // If dryRun, return validation preview
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        summary: {
          totalRows: rows.length,
          validCount: validRows.length,
          invalidCount: invalidRows.length,
          duplicateCount: duplicateRows.length,
        },
        previewValid: validRows.slice(0, 10),
        invalidRows,
        duplicateRows,
      });
    }

    // Actual import
    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid rows found to import.",
          invalidRows,
          duplicateRows,
        },
        { status: 400 }
      );
    }

    // Create valid participants
    await prisma.participant.createMany({
      data: validRows,
    });

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "PARTICIPANTS_BULK_IMPORTED",
      entityType: "Participant",
      entityId: eventId,
      details: {
        totalRows: rows.length,
        importedCount: validRows.length,
        skippedDuplicates: duplicateRows.length,
        invalidRows: invalidRows.length,
      },
    });

    return NextResponse.json({
      success: true,
      importedCount: validRows.length,
      skippedDuplicates: duplicateRows.length,
      invalidCount: invalidRows.length,
      invalidRows,
      duplicateRows,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: "Failed to process participant CSV import" }, { status: 500 });
  }
}
