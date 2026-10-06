import type { JobMaterial } from "@/schema";
import { readResponse } from "./api";

export async function getJobMaterial(filters: Record<string, string> = {}, signal?: AbortSignal): Promise<JobMaterial[]> {
  const query = new URLSearchParams(filters);
  const response = await fetch(`/api/job_material?${query}`, { cache: "no-store", signal });
  const result = await readResponse<{ job_materials: JobMaterial[] }>(response);
  return result.job_materials;
}

export async function createJobMaterial(data: Omit<JobMaterial, "job_material_id" | "use_for"> & Partial<Omit<JobMaterial, "job_material_id">>): Promise<JobMaterial> {
  const response = await fetch("/api/job_material", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ job_material: JobMaterial }>(response);
  return result.job_material;
}

export async function updateJobMaterial(id: number, data: Partial<JobMaterial>): Promise<JobMaterial> {
  const response = await fetch(`/api/job_material?id=${encodeURIComponent(String(id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ job_material: JobMaterial }>(response);
  return result.job_material;
}

export async function deleteJobMaterial(id: number): Promise<void> {
  const response = await fetch(`/api/job_material?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
  await readResponse(response);
}
