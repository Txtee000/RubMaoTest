"use client";

import { useState } from "react";
import { Bell, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useProjects } from "@/features/project/project-provider";
import { formatDate } from "@/features/project/project-utils";
import type { Appointment } from "@/features/project/types";

export function AppointmentReminder({ appointment, canSend }: { appointment: Appointment; canSend: boolean }) {
  const { saving, sendReminder } = useProjects();
  const [sending, setSending] = useState(false);

  async function send() {
    if (saving || sending) return;
    setSending(true);
    try {
      const sent = await sendReminder(appointment.id);
      toast.add(sent ? {
        type: "success",
        title: "ส่งคำขอแจ้งเตือน LINE แล้ว",
        timeout: 5000,
      } : {
        type: "error",
        title: "ส่งคำขอแจ้งเตือน LINE ไม่สำเร็จ",
        description: "ดูรายละเอียดข้อผิดพลาดด้านบน",
        timeout: 7000,
      });
    } catch (error) {
      toast.add({
        type: "error",
        title: "ส่งคำขอแจ้งเตือน LINE ไม่สำเร็จ",
        description: error instanceof Error ? error.message : "กรุณาลองอีกครั้ง",
        timeout: 7000,
      });
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
          {sending ? "กำลังส่ง…" : appointment.reminder_status === "sent" ? "แจ้งเตือนอีกครั้ง" : "แจ้งเตือน"}
        </Button>
      )}
    </div>
  );
}
