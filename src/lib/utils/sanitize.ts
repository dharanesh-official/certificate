/**
 * Text and participant data sanitization utilities.
 * Handles removing corrupted Unicode replacement characters (e.g. \uFFFD displayed as ),
 * leading bullet points, non-breaking spaces, and invisible control characters
 * that commonly occur when copying/exporting rosters from Excel or Word.
 */

export function cleanParticipantName(rawName: string | null | undefined): string {
  if (!rawName) return "";
  return rawName
    // Normalize Unicode composite characters
    .normalize("NFKC")
    // Replace Unicode replacement char (\uFFFD), zero-width characters (\u200B, \uFEFF), control codes
    .replace(/[\uFFFD\u200B-\u200D\uFEFF\x00-\x1F\x7F]/g, " ")
    // Replace non-breaking spaces and tabs with regular space
    .replace(/[\u00A0\t\r\n]/g, " ")
    // Remove leading bullet symbols, asterisks, dashes, or middle dots commonly copied from lists
    .replace(/^[•·\-\*▪▫\.\s]+/, "")
    // Collapse multiple consecutive spaces into one
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanRollNumber(rawRoll: string | null | undefined): string {
  if (!rawRoll) return "";
  return rawRoll
    .normalize("NFKC")
    // Remove replacement characters and invisible chars
    .replace(/[\uFFFD\u200B-\u200D\uFEFF\x00-\x1F\x7F\s]/g, "")
    .trim()
    .toUpperCase();
}

export function cleanGenericText(rawText: string | null | undefined): string {
  if (!rawText) return "";
  return rawText
    .normalize("NFKC")
    .replace(/[\uFFFD\u200B-\u200D\uFEFF\x00-\x1F\x7F]/g, " ")
    .replace(/[\u00A0\t\r\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
