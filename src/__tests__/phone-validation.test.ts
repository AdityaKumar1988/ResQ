import { describe, it, expect } from "vitest";
// @ts-expect-error Server JS module import without declaration
import { isValidPhone, PHONE_REGEX } from "../../server/src/utils/phone.js";

describe("Phone Validation Utility", () => {
  it("accepts valid E.164 and international phone numbers", () => {
    expect(isValidPhone("+919876543210")).toBe(true);
    expect(isValidPhone("+14155550100")).toBe(true);
    expect(isValidPhone("+442071838750")).toBe(true);
    expect(isValidPhone("+1 555 0192")).toBe(true);
    expect(isValidPhone("9876543210")).toBe(true);
    expect(isValidPhone("+1-800-555-0199")).toBe(true);
    expect(isValidPhone("(555) 123-4567")).toBe(true);
  });

  it("rejects missing, null, undefined, or empty values", () => {
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone("   ")).toBe(false);
    expect(isValidPhone(null as unknown as string)).toBe(false);
    expect(isValidPhone(undefined as unknown as string)).toBe(false);
  });

  it("rejects invalid format or too short / too long values", () => {
    expect(isValidPhone("123")).toBe(false); // too short (< 7 digits)
    expect(isValidPhone("123456")).toBe(false); // 6 digits
    expect(isValidPhone("abc-def-ghij")).toBe(false); // non-digits
    expect(isValidPhone("+123456789012345678901")).toBe(false); // too long (> 15 digits)
  });
});
