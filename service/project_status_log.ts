import type { ProjectStatusLog } from "@/schema";
import { readResponse } from "./api";

export async function getProjectStatusLog(
  filters: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<ProjectStatusLog[]> {
  const query = new URLSearchParams(filters);
  const response = await fetch(`/api/project_status_log?${query}`, { cache: "no-store", signal });
  const result = await readResponse<{ status_logs: ProjectStatusLog[] }>(response);
  return result.status_logs;
}
