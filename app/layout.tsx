import type { Metadata } from "next";
import "./globals.css";
import { ProjectProvider } from "@/features/project/project-provider";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "RubMao · จัดการงานของร้าน",
  description: "พื้นที่จัดการงานรับเหมา ประเมินราคา วางแผนทีม และส่งมอบงาน",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased">
      <body>
        <ProjectProvider>
          <DashboardShell>{children}</DashboardShell>
        </ProjectProvider>
        <Toaster />
      </body>
    </html>
  );
}
