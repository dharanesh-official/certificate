import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateVerificationHash(certificateId: string, eventId: string, participantId: string): string {
  const secret = process.env.AUTH_SECRET || "default-secret-salt-2026";
  return crypto
    .createHmac("sha256", secret)
    .update(`${certificateId}:${eventId}:${participantId}`)
    .digest("hex");
}

export function generateSecureRandomString(length: number = 8): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // readable chars without 0, O, 1, I
  let result = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += characters[randomBytes[i] % characters.length];
  }
  return result;
}
