import type { Appointment } from "@/features/project/types";

export const mockAppointments: Appointment[] = [
    {
      id: "a1",
      project_id: "01",
      appointment_type: "site_visit",
      appointment_datetime: "2026-10-06T10:00:00+07:00",
      location: "บ้านลูกค้า · บางนา กรุงเทพฯ",
      status: "pending",
    },
  ];
