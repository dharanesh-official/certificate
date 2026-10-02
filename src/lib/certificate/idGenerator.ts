import { generateSecureRandomString } from "@/lib/security/hash";

/**
 * Generates a unique, non-sequential Certificate ID.
 * Format: {EVENT_PREFIX}-{ROLL_NUMBER} or {EVENT_PREFIX}-{YEAR}-{RANDOM}
 * e.g. QUANTUM-PRJ-24ISR011
 */
export function generateUniqueCertificateId(eventCode?: string, rollNumber?: string): string {
  const currentYear = new Date().getFullYear();
  const cleanPrefix = (eventCode || "CERT").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (rollNumber) {
    const cleanRoll = rollNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return `${cleanPrefix}-${cleanRoll}`;
  }

  const randomSuffix = generateSecureRandomString(6);
  return `${cleanPrefix}-${currentYear}-${randomSuffix}`;
}
