import type { Payment } from "@/schema";
import { readResponse } from "./api";

export async function getPayment(filters: Record<string, string> = {}, signal?: AbortSignal): Promise<Payment[]> {
  const query = new URLSearchParams(filters);
  const response = await fetch(`/api/payment?${query}`, { cache: "no-store", signal });
  const result = await readResponse<{ payments: Payment[] }>(response);
  return result.payments;
}

export async function createPayment(data: Omit<Payment, "payment_id" | "payment_date" | "proof_of_payment"> & Partial<Omit<Payment, "payment_id">>): Promise<Payment> {
  const response = await fetch("/api/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ payment: Payment }>(response);
  return result.payment;
}

export async function updatePayment(id: number, data: Partial<Payment>): Promise<Payment> {
  const response = await fetch(`/api/payment?id=${encodeURIComponent(String(id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ payment: Payment }>(response);
  return result.payment;
}

export async function deletePayment(id: number): Promise<void> {
  const response = await fetch(`/api/payment?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
  await readResponse(response);
}
