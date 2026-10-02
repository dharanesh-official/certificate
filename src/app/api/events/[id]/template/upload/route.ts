import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/jwt";
import { logAuditAction } from "@/lib/audit/logger";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No template image file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds the 5MB limit (Current: ${(file.size / (1024 * 1024)).toFixed(2)} MB)` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Please upload a PNG or JPEG certificate background.` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate image magic numbers to prevent disguised executables
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isWebp = buffer.toString("ascii", 8, 12) === "WEBP";

    if (!isPng && !isJpg && !isWebp) {
      return NextResponse.json(
        { error: "Invalid image content. File signature does not match image headers." },
        { status: 400 }
      );
    }

    // Convert to Base64 Data URL for zero-disk-dependency portability
    const base64DataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    await logAuditAction({
      adminId: session.id,
      adminEmail: session.email,
      action: "TEMPLATE_BACKGROUND_UPLOADED",
      entityType: "CertificateTemplate",
      entityId: eventId,
      details: {
        filename: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json({
      success: true,
      templateReference: base64DataUrl,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Template upload error:", error);
    return NextResponse.json({ error: "Failed to upload template image" }, { status: 500 });
  }
}
