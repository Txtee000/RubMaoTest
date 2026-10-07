export const PROOF_MAX_SIZE = 3 * 1024 * 1024;
export const PROOF_TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf",
};
export type PaymentProof = { path: string; name: string; note: string };
export function parsePaymentProof(value: string): PaymentProof | null {
  try {
    const proof = JSON.parse(value);
    return proof && typeof proof.path === "string" && /^\d+\/[\da-f-]+\.(jpg|png|webp|pdf)$/.test(proof.path)
      && typeof proof.name === "string" && typeof proof.note === "string" ? proof : null;
  } catch { return null; }
}
