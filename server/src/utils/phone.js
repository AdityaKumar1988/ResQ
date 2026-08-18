/**
 * Phone number validation utility.
 * Supports E.164 (+14155550100, +919876543210) as well as common formatted variants.
 */
export const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

export function isValidPhone(val) {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (trimmed.length < 7 || trimmed.length > 20) return false;
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15) return false;
  return PHONE_REGEX.test(trimmed);
}
