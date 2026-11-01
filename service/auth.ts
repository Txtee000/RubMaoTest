import { readResponse } from "./api";

export async function logout() {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  return readResponse<{ success: boolean }>(response);
}

export async function login(username: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return readResponse<{ success: boolean }>(response);
}
