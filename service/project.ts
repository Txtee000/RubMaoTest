import type { Project } from "@/schema";
import { readResponse } from "./api";

export async function getProject(filters: Record<string, string> = {}, signal?: AbortSignal): Promise<Project[]> {
  const query = new URLSearchParams(filters);
  const response = await fetch(`/api/project?${query}`, { cache: "no-store", signal });
  const result = await readResponse<{ projects: Project[] }>(response);
  return result.projects;
}

export async function createProject(data: Omit<Project, "project_id">): Promise<Project> {
  const response = await fetch("/api/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ project: Project }>(response);
  return result.project;
}

export async function updateProject(id: number, data: Partial<Project>): Promise<Project> {
  const response = await fetch(`/api/project?id=${encodeURIComponent(String(id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ project: Project }>(response);
  return result.project;
}

export async function deleteProject(id: number): Promise<void> {
  const response = await fetch(`/api/project?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
  await readResponse(response);
}
