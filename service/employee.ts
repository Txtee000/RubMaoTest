import type { Employee } from "@/schema";
import { readResponse } from "./api";

export async function getEmployee(filters: Record<string, string> = {}, signal?: AbortSignal): Promise<Employee[]> {
  const query = new URLSearchParams(filters);
  const response = await fetch(`/api/employee?${query}`, { cache: "no-store", signal });
  const result = await readResponse<{ employees: Employee[] }>(response);
  return result.employees;
}

export async function createEmployee(data: Omit<Employee, "employee_id"> & Partial<Omit<Employee, "employee_id">>): Promise<Employee> {
  const response = await fetch("/api/employee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ employee: Employee }>(response);
  return result.employee;
}

export async function updateEmployee(id: number, data: Partial<Employee>): Promise<Employee> {
  const response = await fetch(`/api/employee?id=${encodeURIComponent(String(id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ employee: Employee }>(response);
  return result.employee;
}

export async function deleteEmployee(id: number): Promise<void> {
  const response = await fetch(`/api/employee?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
  await readResponse(response);
}
