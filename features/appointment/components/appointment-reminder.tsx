"use client";

import { useState } from "react";
import { Bell, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/features/project/project-provider";
import { formatDate } from "@/features/project/project-utils";
import type { Appointment } from "@/features/project/types";

export function AppointmentReminder({ appointment, canSend }: { appointment: Appointment; canSend: boolean }) {
  const { saving, sendReminder } = useProjects();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function send() {
    setSending(true);
    setMessage("");
    try {
      const sent = await sendReminder(appointment.id);
      setMessage(sent ? "บันทึกการแจ้งเตือนแล้ว" : "บันทึกไม่สำเร็จ ดูรายละเอียดด้านบน");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="appointment-line-reminder" data-state={appointment.reminder_status}>
      <div className="appointment-reminder-status">
        {appointment.reminder_status === "sent" ? <CheckCircle2 size={15} aria-hidden="true" /> : <Bell size={15} aria-hidden="true" />}
        <small>
        {appointment.reminder_sent_at
          ? `แจ้งเตือนครั้งแรก: ${formatDate(appointment.reminder_sent_at, true)}`
          : appointment.reminder_status === "sent"
            ? "แจ้งเตือนแล้ว (ไม่มีเวลาครั้งแรก)"
            : appointment.reminder_status === "failed" ? "แจ้งเตือนไม่สำเร็จ สามารถลองใหม่ได้" : "ยังไม่ได้แจ้งเตือน"}
        </small>
      </div>
      {canSend && (
        <Button type="button" variant="outline" disabled={saving || sending} onClick={send} className="appointment-reminder-button">
          {sending ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
          {sending ? "กำลังบันทึก..." : appointment.reminder_status === "sent" ? "แจ้งเตือนอีกครั้ง" : "แจ้งเตือน"}
        </Button>
      )}
      {message && <small role="status" className="appointment-reminder-feedback">{message}</small>}
    </div>
  );
}
