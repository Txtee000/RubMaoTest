import type { Customer } from "@/schema";
import { readResponse } from "./api";

export async function getCustomer(filters: Record<string, string> = {}, signal?: AbortSignal): Promise<Customer[]> {
  const query = new URLSearchParams(filters);
  const response = await fetch(`/api/customer?${query}`, { cache: "no-store", signal });
  const result = await readResponse<{ customers: Customer[] }>(response);
  return result.customers;
}

export async function createCustomer(data: Omit<Customer, "customer_id" | "line_user_id"> & Partial<Omit<Customer, "customer_id">>): Promise<Customer> {
  const response = await fetch("/api/customer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ customer: Customer }>(response);
  return result.customer;
}

export async function updateCustomer(id: number, data: Partial<Customer>): Promise<Customer> {
  const response = await fetch(`/api/customer?id=${encodeURIComponent(String(id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await readResponse<{ customer: Customer }>(response);
  return result.customer;
}

export async function deleteCustomer(id: number): Promise<void> {
  const response = await fetch(`/api/customer?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
  await readResponse(response);
}
