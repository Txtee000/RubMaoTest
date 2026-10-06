import type { WorkOn } from "@/schema";
import { readResponse } from "./api";

export async function getWorkOn(filters: Record<string, string> = {}, signal?: AbortSignal): Promise<WorkOn[]> {
  const query = new URLSearchParams(filters);
  const response = await fetch(`/api/work_on?${query}`, { cache: "no-store", signal });
  const result = await readResponse<{ assignments: WorkOn[] }>(response);
  return result.assignments;
}

export async function createWorkOn(data: WorkOn): Promise<WorkOn> {
  const response = await fetch("/api/work_on", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ assignment: WorkOn }>(response);
  return result.assignment;
}

export async function updateWorkOn(employee_id: number, project_id: number, data: Partial<WorkOn>): Promise<WorkOn> {
  const response = await fetch(`/api/work_on?employee_id=${encodeURIComponent(String(employee_id))}&project_id=${encodeURIComponent(String(project_id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ assignment: WorkOn }>(response);
  return result.assignment;
}

export async function deleteWorkOn(employee_id: number, project_id: number): Promise<void> {
  const response = await fetch(`/api/work_on?employee_id=${encodeURIComponent(String(employee_id))}&project_id=${encodeURIComponent(String(project_id))}`, { method: "DELETE" });
  await readResponse(response);
}
