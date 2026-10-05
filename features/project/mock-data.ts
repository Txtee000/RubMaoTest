import type { DemoData } from "./types";
import { mockProjects } from "./data/mock-projects";
import { mockEmployees } from "@/features/employee/data/mock-employees";
import { mockAppointments } from "@/features/appointment/data/mock-appointments";

// Combine the separate demo files for the provider.
export const mockData: DemoData = {
  projects: mockProjects,
  employees: mockEmployees,
  appointments: mockAppointments,
};
