import type { Appointment } from "@/schema";
import { readResponse } from "./api";

export async function getAppointment(filters: Record<string, string> = {}, signal?: AbortSignal): Promise<Appointment[]> {
  const query = new URLSearchParams(filters);
  const response = await fetch(`/api/appointment?${query}`, { cache: "no-store", signal });
  const result = await readResponse<{ appointments: Appointment[] }>(response);
  return result.appointments;
}

export async function createAppointment(data: Omit<Appointment, "appointment_id" | "reminder_status" | "reminder_sent_at">): Promise<Appointment> {
  const response = await fetch("/api/appointment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ appointment: Appointment }>(response);
  return result.appointment;
}

export async function updateAppointment(id: number, data: Partial<Omit<Appointment, "appointment_id" | "reminder_status" | "reminder_sent_at">>): Promise<Appointment> {
  const response = await fetch(`/api/appointment?id=${encodeURIComponent(String(id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ appointment: Appointment }>(response);
  return result.appointment;
}

export async function sendAppointmentReminder(id: number): Promise<Appointment> {
  const response = await fetch(`/api/appointment/reminder?id=${encodeURIComponent(String(id))}`, { method: "POST" });
  const result = await readResponse<{ appointment: Appointment }>(response);
  return result.appointment;
}

export async function deleteAppointment(id: number): Promise<void> {
  const response = await fetch(`/api/appointment?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
  await readResponse(response);
}
