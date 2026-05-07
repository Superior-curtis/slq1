/**
 * Age verification module
 * Handles 18+ verification for adult content
 */

const VERIFIED_USERS = new Set<number>();
const VERIFICATION_COOKIE_NAME = "age_verified";

export function isAgeVerified(userId: number): boolean {
  return VERIFIED_USERS.has(userId);
}

export function verifyAge(userId: number): void {
  VERIFIED_USERS.add(userId);
}

export function clearAgeVerification(userId: number): void {
  VERIFIED_USERS.delete(userId);
}

export function getAllVerifiedUsers(): number[] {
  return Array.from(VERIFIED_USERS);
}
