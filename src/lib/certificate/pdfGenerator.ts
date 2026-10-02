import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { TemplateConfiguration } from "./templateTypes";

export interface GeneratePdfParams {
  event: {
    name: string;
    event_date: string;
    organizer: string;
    department?: string | null;
  };
  participant: {
    name: string;
    roll_number: string;
    department?: string | null;
    institution?: string | null;
  };
  certificateId: string;
  verificationUrl: string;
  templateConfig: TemplateConfiguration;
  backgroundImageBuffer?: Buffer | null; // optional custom uploaded background
}

function hexToPdfRgb(hex: string) {
  try {
    const clean = hex.replace("#", "");
    const fullHex = clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean;
    const num = parseInt(fullHex, 16);
    const r = ((num >> 16) & 255) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;
    return rgb(r, g, b);
  } catch {
    return rgb(0.1, 0.1, 0.1);
  }
}

/**
 * Generates high-resolution Certificate PDF strictly in memory.
 * NEVER writes to disk. Returns Uint8Array.
 */
export async function generateCertificatePdf(params: GeneratePdfParams): Promise<Uint8Array> {
  const { event, participant, certificateId, verificationUrl, templateConfig, backgroundImageBuffer } = params;

  // A4 Landscape standard in points: 841.89 x 595.28
  const width = 842;
  const height = 595;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([width, height]);

  // Load standard fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const getFont = (family?: string, weight?: string) => {
    if (family === "Times-Bold" || weight === "bold" && family === "Times-Roman") return fontTimesBold;
    if (family === "Times-Roman") return fontTimesRoman;
    if (family === "Courier" || family === "CourierBold") return fontCourierBold;
    if (weight === "bold" || family === "Helvetica-Bold") return fontHelveticaBold;
    return fontHelvetica;
  };

  // 1. Background rendering
  if (backgroundImageBuffer && backgroundImageBuffer.length > 0) {
    try {
      let bgImage;
      // Check for PNG or JPEG header
      if (backgroundImageBuffer[0] === 0x89 && backgroundImageBuffer[1] === 0x50) {
        bgImage = await pdfDoc.embedPng(backgroundImageBuffer);
      } else {
        bgImage = await pdfDoc.embedJpg(backgroundImageBuffer);
      }
      page.drawImage(bgImage, {
        x: 0,
        y: 0,
        width,
        height,
      });
    } catch {
      drawDefaultInstitutionalCanvas(page, width, height, templateConfig);
    }
  } else {
    drawDefaultInstitutionalCanvas(page, width, height, templateConfig);
  }

  // 2. Generate Verification QR Code in memory as PNG buffer
  const qrPngBuffer = await QRCode.toBuffer(verificationUrl, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 256,
    color: {
      dark: "#1C1917",
      light: "#FFFFFF",
    },
  });
  const qrImage = await pdfDoc.embedPng(qrPngBuffer);

  // 3. Dynamic Placeholder Resolution map
  const replacements: Record<string, string> = {
    "{{PARTICIPANT_NAME}}": participant.name,
    "{{ROLL_NUMBER}}": participant.roll_number,
    "{{EVENT_NAME}}": event.name,
    "{{EVENT_DATE}}": event.event_date,
    "{{ORGANIZER}}": event.organizer,
    "{{DEPARTMENT}}": participant.department || event.department || "",
    "{{CERTIFICATE_ID}}": certificateId,
    "{{INSTITUTION}}": participant.institution || "",
  };

  const resolveText = (text: string): string => {
    let result = text;
    for (const [key, val] of Object.entries(replacements)) {
      result = result.replaceAll(key, val);
    }
    return result;
  };

  // 4. Render configured fields
  for (const field of templateConfig.fields) {
    // In web editor: x, y are percentages (0-100) from top-left.
    // In PDF: (0,0) is bottom-left.
    const fieldPixelX = (field.x / 100) * width;
    const fieldPixelYFromTop = (field.y / 100) * height;

    if (field.type === "qr") {
      const qrSize = field.qrSize || 75;
      const qrX = fieldPixelX - qrSize / 2;
      const qrY = height - fieldPixelYFromTop - qrSize / 2;

      // Draw subtle white background container for QR
      page.drawRectangle({
        x: qrX - 4,
        y: qrY - 4,
        width: qrSize + 8,
        height: qrSize + 8,
        color: rgb(1, 1, 1),
        borderColor: hexToPdfRgb("#E5E3D8"),
        borderWidth: 1,
      });

      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });

      // Small caption below QR
      const caption = "Scan to Verify";
      const capWidth = fontHelvetica.widthOfTextAtSize(caption, 7);
      page.drawText(caption, {
        x: qrX + qrSize / 2 - capWidth / 2,
        y: qrY - 10,
        size: 7,
        font: fontHelvetica,
        color: hexToPdfRgb("#57534E"),
      });
      continue;
    }

    // Text field
    let rawText = field.defaultText || "";
    if (field.key === "PARTICIPANT_NAME") rawText = participant.name;
    else if (field.key === "ROLL_NUMBER") {
      rawText = participant.department
        ? `Roll No: ${participant.roll_number}  |  Dept: ${participant.department}`
        : `Roll No: ${participant.roll_number}`;
    } else if (field.key === "EVENT_NAME") rawText = event.name;
    else if (field.key === "EVENT_DATE") rawText = event.event_date;
    else if (field.key === "ORGANIZER") rawText = event.organizer;
    else if (field.key === "CERTIFICATE_ID") rawText = `ID: ${certificateId}`;
    else if (field.key === "DESCRIPTION") {
      rawText = `has successfully participated in ${event.name} conducted by ${event.organizer} on ${event.event_date}.`;
    }

    const resolved = resolveText(rawText);
    const font = getFont(field.fontFamily, field.fontWeight);
    const fontSize = field.fontSize || 12;
    const fontColor = hexToPdfRgb(field.color || "#1C1917");

    // Handle multiline text (e.g. Signatures)
    const lines = resolved.split("\n");
    const lineHeight = fontSize * 1.3;

    lines.forEach((line, index) => {
      const textWidth = font.widthOfTextAtSize(line, fontSize);
      let drawX = fieldPixelX;

      if (field.textAlign === "center") {
        drawX = fieldPixelX - textWidth / 2;
      } else if (field.textAlign === "right") {
        drawX = fieldPixelX - textWidth;
      }

      // Convert top-down Y to bottom-up PDF coordinate
      const drawY = height - fieldPixelYFromTop - index * lineHeight - fontSize;

      page.drawText(line, {
        x: Math.max(10, drawX),
        y: drawY,
        size: fontSize,
        font,
        color: fontColor,
      });
    });
  }

  return await pdfDoc.save();
}

/**
 * Draws a luxurious, institutional certificate background:
 * Cream background (#F5F5DC), double gold/red ornate borders,
 * decorative corner brackets, and authentic gold medallion seal.
 */
function drawDefaultInstitutionalCanvas(page: PDFPage, width: number, height: number, config: TemplateConfiguration) {
  // 1. Solid Cream Base #F5F5DC
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: hexToPdfRgb(config.backgroundColor || "#F5F5DC"),
  });

  // 2. Outer Ornamental Red Border #C62828 (4px thickness)
  page.drawRectangle({
    x: 18,
    y: 18,
    width: width - 36,
    height: height - 36,
    borderWidth: 3.5,
    borderColor: hexToPdfRgb("#C62828"),
    color: undefined,
  });

  // 3. Middle Gold Line #FBC02D (1.5px)
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderWidth: 1.5,
    borderColor: hexToPdfRgb("#FBC02D"),
    color: undefined,
  });

  // 4. Inner Fine Border #FF8F00
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    borderWidth: 0.75,
    borderColor: hexToPdfRgb("#FF8F00"),
    color: undefined,
  });

  // 5. Corner decorative squares in gold
  const corners = [
    { x: 18, y: 18 },
    { x: width - 30, y: 18 },
    { x: 18, y: height - 30 },
    { x: width - 30, y: height - 30 },
  ];
  corners.forEach((c) => {
    page.drawRectangle({
      x: c.x,
      y: c.y,
      width: 12,
      height: 12,
      color: hexToPdfRgb("#C62828"),
      borderColor: hexToPdfRgb("#FBC02D"),
      borderWidth: 1,
    });
  });

  // 6. Institutional Gold Seal in bottom center
  const sealCenterX = width / 2;
  const sealCenterY = 90;
  const sealRadius = 34;

  // Outer gold circle
  page.drawCircle({
    x: sealCenterX,
    y: sealCenterY,
    size: sealRadius,
    color: hexToPdfRgb("#FBC02D"),
    borderColor: hexToPdfRgb("#FF8F00"),
    borderWidth: 2,
  });

  // Inner red circle
  page.drawCircle({
    x: sealCenterX,
    y: sealCenterY,
    size: sealRadius - 5,
    color: hexToPdfRgb("#FFF9C4"),
    borderColor: hexToPdfRgb("#C62828"),
    borderWidth: 1.5,
  });

  // Ribbon tails below seal
  page.drawRectangle({
    x: sealCenterX - 18,
    y: sealCenterY - 48,
    width: 14,
    height: 22,
    color: hexToPdfRgb("#C62828"),
    rotate: degrees(15),
  });
  page.drawRectangle({
    x: sealCenterX + 6,
    y: sealCenterY - 48,
    width: 14,
    height: 22,
    color: hexToPdfRgb("#C62828"),
    rotate: degrees(-15),
  });

  // Signature line accents
  page.drawLine({
    start: { x: 170, y: 110 },
    end: { x: 310, y: 110 },
    thickness: 1,
    color: hexToPdfRgb("#8D6E63"),
  });
  page.drawLine({
    start: { x: 532, y: 110 },
    end: { x: 672, y: 110 },
    thickness: 1,
    color: hexToPdfRgb("#8D6E63"),
  });
}
