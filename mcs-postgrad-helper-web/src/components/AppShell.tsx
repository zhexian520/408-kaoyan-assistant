"use client";

import React from "react";
import { usePathname } from "next/navigation";
import PublicNavbar from "./PublicNavbar";
import PublicFooter from "./PublicFooter";
import AuthGuard from "./AuthGuard";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 管理端与用户端各自拥有独立布局系统 (包含专属侧边栏与独立顶部栏)
  const isAdminPortal = pathname.startsWith("/admin");
  const isUserPortal = pathname.startsWith("/user");

  if (isAdminPortal || isUserPortal) {
    return (
      <div className="h-screen w-full overflow-hidden flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <AuthGuard>{children}</AuthGuard>
      </div>
    );
  }

  // 前台门户布局 (Public Portal)
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <PublicNavbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <AuthGuard>{children}</AuthGuard>
      </main>
      <PublicFooter />
    </div>
  );
}

