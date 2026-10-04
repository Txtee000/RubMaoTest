"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { mockData } from "./mock-data";
import type { Appointment, DemoData, Project } from "./types";

const STORAGE_KEY = "rubmao-demo-v1";
type ProjectContextValue = {
  data: DemoData;
  ready: boolean;
  storageError: string;
  updateProject: (project: Project) => void;
  saveAppointment: (appointment: Appointment) => void;
};
const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoData>(mockData);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");

  useEffect(() => {
    // Read browser storage after mount, keeping the initial server/client render identical.
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as DemoData;
          if (
            !Array.isArray(parsed.projects) ||
            !Array.isArray(parsed.employees) ||
            !Array.isArray(parsed.appointments) ||
            !parsed.projects.every(
              (p) =>
                Array.isArray(p.materials) &&
                Array.isArray(p.payments) &&
                Array.isArray(p.history) &&
                Array.isArray(p.employee_ids),
            )
          ) {
            throw new Error("Invalid demo data");
          }
          setData(parsed);
        }
      } catch {
        setStorageError("อ่านข้อมูลที่บันทึกไว้ไม่ได้ จึงแสดงข้อมูลตัวอย่างแทน");
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function saveData(next: DemoData) {
    setData(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setStorageError("บันทึกในเบราว์เซอร์ไม่ได้ ข้อมูลจะอยู่เฉพาะระหว่างเปิดแอป");
    }
  }

  function updateProject(project: Project) {
    saveData({
      ...data,
      projects: data.projects.map((item) => (item.id === project.id ? project : item)),
    });
  }

  function saveAppointment(appointment: Appointment) {
    const exists = data.appointments.some((item) => item.id === appointment.id);
    saveData({
      ...data,
      appointments: exists
        ? data.appointments.map((item) => (item.id === appointment.id ? appointment : item))
        : [...data.appointments, appointment],
    });
  }

  return (
    <ProjectContext.Provider value={{ data, ready, storageError, updateProject, saveAppointment }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProjects requires ProjectProvider");
  return context;
}
