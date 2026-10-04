"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  Users,
  ClipboardCheck,
  Wallet,
  Hammer,
  Menu,
  X,
  ChevronRight,
  CircleHelp,
} from "lucide-react";
import { useProjects } from "@/features/project/project-provider";

const navigation = [
  { href: "/", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/project", label: "รายการงาน", icon: FolderKanban },
  { href: "/appointments", label: "นัดหมาย", icon: CalendarDays },
  { href: "/employees", label: "ทีมงาน", icon: Users },
  { href: "/tasks", label: "งานที่ได้รับมอบหมาย", icon: ClipboardCheck },
  { href: "/payments", label: "การชำระเงิน", icon: Wallet },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { storageError } = useProjects();
  if (pathname.endsWith("/bill")) return <>{children}</>;
  const current = navigation.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );

  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="sidebar-overlay"
          aria-label="ปิดเมนู"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
        <Link href="/" className="brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">
            <Hammer size={23} />
          </span>
          <span>
            RubMao<span className="brand-caption">WORKSPACE</span>
          </span>
        </Link>
        <button
          className="mobile-close icon-button"
          onClick={() => setMenuOpen(false)}
          aria-label="ปิดเมนู"
        >
          <X size={20} />
        </button>
        <p className="nav-caption">พื้นที่ทำงาน</p>
        <nav aria-label="เมนูหลัก">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`nav-link ${active ? "active" : ""}`}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {active && <span className="nav-active-dot" />}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="เปิดเมนู"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span>พื้นที่ทำงาน</span>
            <ChevronRight size={14} />
            <strong>{current?.label ?? "รายละเอียดงาน"}</strong>
          </div>
          
        </header>
        <main className="page-content">
          {storageError && (
            <p className="notice notice-amber" role="alert">
              {storageError}
            </p>
          )}
          {children}
        </main>
        <footer className="app-footer">
          RubMao · ระบบจัดการงานรับเหมา<span>ข้อมูลตัวอย่างเก็บเฉพาะเบราว์เซอร์นี้</span>
        </footer>
      </div>
    </div>
  );
}
