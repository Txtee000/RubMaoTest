export const MAX_PHONE_LENGTH = 10;

export function getPhoneNumberError(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return "กรุณากรอกเบอร์โทรศัพท์";
  if (value.length > MAX_PHONE_LENGTH) return "เบอร์โทรศัพท์ต้องไม่เกิน 10 ตัว";
  return null;
}
