"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getWorkspace, saveProjectDetails, saveProjectAppointment } from "@/service/workspace";
import type { Appointment, AppData, Project } from "./types";

const emptyData: AppData = { projects: [], employees: [], appointments: [] };
type ProjectContextValue = {
  data: AppData;
  ready: boolean;
  saving: boolean;
  error: string;
  loadError: string;
  reload: () => Promise<void>;
  updateProject: (project: Project) => Promise<boolean>;
  saveAppointment: (appointment: Appointment) => Promise<boolean>;
};
const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const busy = useRef(false);
  const loadId = useRef(0);

  async function loadData(signal?: AbortSignal) {
    if (pathname === "/login") return emptyData;
    return getWorkspace(signal);
  }

  useEffect(() => {
    const controller = new AbortController();
    const id = ++loadId.current;
    setReady(false);
    setLoadError("");
    setError("");
    loadData(controller.signal)
      .then((result) => { if (id === loadId.current) setData(result); })
      .catch((error: unknown) => {
        if (controller.signal.aborted || id !== loadId.current) return;
        setData(emptyData);
        setLoadError(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
      })
      .finally(() => { if (!controller.signal.aborted && id === loadId.current) setReady(true); });
    return () => controller.abort();
    // Reload when moving from login, a bill, or another application page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function reload() {
    const id = ++loadId.current;
    setLoadError("");
    try {
      const result = await loadData();
      if (id === loadId.current) { setData(result); setError(""); }
    } catch (error) {
      if (id === loadId.current) setLoadError(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      if (id === loadId.current) setReady(true);
    }
  }

  async function save(action: () => Promise<void>): Promise<boolean> {
    if (busy.current) return false;
    const id = loadId.current;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await action();
      const result = await loadData();
      if (id === loadId.current) setData(result);
      return true;
    } catch (error) {
      // A save can contain several CRUD requests; recover the actual database state.
      try {
        const result = await loadData();
        if (id === loadId.current) setData(result);
      } catch {
        if (id === loadId.current) setLoadError("โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
      if (id === loadId.current) setError(error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ");
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function updateProject(project: Project) {
    const previous = data.projects.find((item) => item.id === project.id);
    if (!previous) { setError("ไม่พบงานนี้"); return false; }
    return save(() => saveProjectDetails(project, previous));
  }

  async function saveAppointment(appointment: Appointment) {
    const project = data.projects.find((item) => item.id === appointment.project_id);
    if (!project) { setError("ไม่พบงานของนัดหมายนี้"); return false; }
    const exists = data.appointments.some((item) => item.id === appointment.id);
    return save(() => saveProjectAppointment(appointment, project, exists));
  }

  return (
    <ProjectContext.Provider value={{ data, ready, saving, error, loadError, reload, updateProject, saveAppointment }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProjects requires ProjectProvider");
  return context;
}
