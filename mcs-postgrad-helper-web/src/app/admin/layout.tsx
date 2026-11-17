"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  Users,
  BookMarked,
  Activity,
  LogOut,
  Globe,
  ChevronRight,
  Server,
  BookOpen,
  BarChart3,
  Cpu,
  Menu,
  X,
  Search,
  Bell,
  Sparkles,
  ShieldCheck,
  Radio,
  ArrowUpRight,
  DatabaseBackup,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "总览",
    items: [
      {
        name: "管理仪表盘",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        description: "平台全景数据与指标",
      },
    ],
  },
  {
    label: "运营管理",
    items: [
      {
        name: "用户权限管理",
        href: "/admin/users",
        icon: Users,
        description: "账号启停、重置密码与赋权",
      },
      {
        name: "公共知识库",
        href: "/admin/knowledge",
        icon: BookOpen,
        description: "公共教材与讲义上传审核",
      },
      {
        name: "真题试卷库",
        href: "/admin/questions",
        icon: BookMarked,
        description: "18 套 408 全真试卷运维",
      },
      {
        name: "全站统计与热点",
        href: "/admin/analytics",
        icon: BarChart3,
        description: "热门考点与高频错题榜",
      },
    ],
  },
  {
    label: "系统与 AI",
    items: [
      {
        name: "AI 引擎与模型配置",
        href: "/admin/ai-config",
        icon: Cpu,
        badge: "已联通",
        description: "API Key 与多模态模型对接",
      },
      {
        name: "AI 引擎监控",
        href: "/admin/agent-monitor",
        icon: Activity,
        description: "主观题阅卷与智能体流水线",
      },
      {
        name: "数据导出与运维",
        href: "/admin/ops",
        icon: DatabaseBackup,
        description: "CSV 导出、服务健康与运维入口",
      },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function isItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const currentItem = ALL_ITEMS.find((item) => isItemActive(pathname, item.href));
  const searchResults = ALL_ITEMS.filter((item) => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return true;
    return (
      item.name.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword)
    );
  });

  const sidebar = (
    <aside className="admin-sidebar relative flex h-full w-[280px] shrink-0 flex-col border-r border-[var(--a-sidebar-border)] text-[var(--a-sidebar-text)]">
      {/* Brand */}
      <div className="relative z-10 shrink-0 px-5 pb-5 pt-6">
        <Link href="/admin/dashboard" className="group flex items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-[var(--a-surface-solid)] p-[1px] ring-1 ring-[var(--a-border)]">
            <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[var(--a-surface-solid)]">
              <Image
                src="/logo.svg"
                alt="408 计算机考研助手"
                width={40}
                height={40}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-black tracking-tight text-[var(--a-sidebar-text)]">
                408 管理总控台
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[9px] font-extrabold text-sky-700 dark:border-sky-600/30 dark:bg-sky-800/15 dark:text-sky-200">
                ADMIN
              </span>
            </div>
            <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--a-sidebar-muted)]">
              管理控制台
            </p>
          </div>
        </Link>

        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[var(--a-sidebar-border)] bg-[var(--a-sidebar-hover)] px-3 py-2.5">
          <span className="admin-live-dot h-2 w-2 rounded-full bg-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-[var(--a-sidebar-text)]">系统运行正常</p>
            <p className="truncate text-[10px] text-[var(--a-sidebar-muted)]">Java · Python · MySQL 全链路在线</p>
          </div>
          <Radio className="h-3.5 w-3.5 text-emerald-500/80" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="admin-scrollbar relative z-10 flex-1 space-y-5 overflow-y-auto px-3.5 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 flex items-center gap-2 px-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-[var(--a-sidebar-muted)]">
                {group.label}
              </span>
              <span className="h-px flex-1 bg-[var(--a-sidebar-border)]" />
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.description}
                    className={`admin-sidebar-link ${active ? "is-active" : ""}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center transition-colors ${
                        active ? "text-[var(--a-sidebar-accent)]" : "text-[var(--a-sidebar-muted)] group-hover:text-[var(--a-sidebar-text)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {item.badge && !active && (
                      <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                        {item.badge}
                      </span>
                    )}
                    {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--a-sidebar-muted)]" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <div className="mb-1.5 flex items-center gap-2 px-2.5">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-[var(--a-sidebar-muted)]">
              快捷入口
            </span>
            <span className="h-px flex-1 bg-[var(--a-sidebar-border)]" />
          </div>
          <Link
            href="/"
            className="admin-sidebar-link"
            title="返回 408 计算机考研助手前台门户"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--a-sidebar-hover)] text-[var(--a-sidebar-muted)]">
              <Globe className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate">返回系统首页</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--a-sidebar-muted)]" />
          </Link>
        </div>
      </nav>

      {/* User footer */}
      <div className="relative z-10 shrink-0 border-t border-[var(--a-sidebar-border)] p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--a-sidebar-border)] bg-[var(--a-sidebar-hover)] p-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--a-border-strong)] bg-[var(--a-accent)] text-sm font-black text-white">
            {user?.nickname?.charAt(0) || "A"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-[var(--a-sidebar-text)]">
              {user?.nickname || "超级管理员"}
            </div>
            <div className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-[var(--a-sidebar-muted)]">
              <ShieldCheck className="h-3 w-3 text-sky-600" />
              @{user?.username || "admin"} · 总控运维
            </div>
          </div>
          <button
            onClick={logout}
            title="退出登录"
            className="shrink-0 rounded-lg p-1.5 text-[var(--a-sidebar-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-500"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="admin-shell flex h-screen h-[100dvh] w-full overflow-hidden bg-[var(--a-bg)] font-sans antialiased">
      {/* Desktop sidebar */}
      <div className="hidden h-full lg:block">{sidebar}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[280px] admin-fade-up">{sidebar}</div>
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface-solid)] p-2 text-[var(--a-text)]"
            aria-label="关闭菜单"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main column */}
      <div className="flex h-screen h-[100dvh] min-w-0 flex-1 flex-col">
        <header className="admin-topbar z-30 flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-[var(--a-border)] bg-[var(--a-surface-solid)] p-2 text-slate-500 lg:hidden"
              aria-label="打开菜单"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex min-w-0 items-center gap-2 text-xs">
              <span className="hidden text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:inline">
                管理后台
              </span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <span
                className="truncate text-[13px] font-extrabold"
                style={{ color: "var(--a-text)" }}
              >
                {currentItem?.name || "控制台"}
              </span>
              <span className="hidden items-center gap-1 whitespace-nowrap rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold text-emerald-600 md:inline-flex dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                实时
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="admin-search hidden md:flex"
              aria-label="打开功能搜索"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="flex-1 truncate text-left">搜索功能或页面...</span>
              <span className="admin-kbd">⌘K</span>
            </button>

            <Link
              href="/admin/ai-config"
              className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-extrabold text-emerald-600 transition-colors hover:border-emerald-500/40 dark:text-emerald-300 sm:flex"
            >
              <span className="admin-live-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
              DeepSeek 引擎就绪
            </Link>

            <ThemeToggle admin />

            <button
              className="relative rounded-xl border border-[var(--a-border)] bg-[var(--a-surface-solid)] p-2 text-slate-500 transition-colors hover:text-sky-900"
              aria-label="通知"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-[var(--a-surface-solid)]" />
            </button>

            <div className="flex items-center gap-2 rounded-xl border border-[var(--a-border)] bg-[var(--a-surface-solid)] py-1 pl-1 pr-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1f3a56] text-[11px] font-black text-white">
                {user?.nickname?.charAt(0) || "A"}
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="max-w-[92px] truncate text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                  {user?.nickname || "管理员"}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  超级管理员
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-canvas admin-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
            <div className="admin-fade-up">{children}</div>
          </div>
        </main>
      </div>

      {searchOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-950/50 p-4 pt-[12vh]"
          onMouseDown={() => setSearchOpen(false)}
        >
          <div
            className="admin-modal w-full max-w-xl overflow-hidden"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              className="flex items-center gap-2.5 border-b px-4 py-3"
              style={{ borderColor: "var(--a-border)" }}
            >
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索功能或页面..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--a-text)" }}
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="rounded-md border border-[var(--a-border)] px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-400"
              >
                ESC
              </button>
            </div>
            <div className="admin-scrollbar max-h-[52vh] overflow-y-auto p-2">
              {searchResults.length > 0 ? (
                searchResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-500/5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] text-slate-600 dark:text-slate-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-extrabold" style={{ color: "var(--a-text)" }}>
                          {item.name}
                        </span>
                        <span className="block truncate text-[10px]" style={{ color: "var(--a-faint)" }}>
                          {item.description}
                        </span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </Link>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center">
                  <p className="text-xs font-bold" style={{ color: "var(--a-text)" }}>
                    没有找到匹配的功能
                  </p>
                  <p className="mt-1 text-[10px]" style={{ color: "var(--a-faint)" }}>
                    试试搜索「用户」「题库」「AI」等关键词
                  </p>
                </div>
              )}
            </div>
            <div
              className="flex items-center justify-between border-t px-4 py-2.5 text-[10px]"
              style={{ borderColor: "var(--a-border)", color: "var(--a-faint)" }}
            >
              <span>快速跳转到后台功能页面</span>
              <span className="font-mono">ESC 关闭</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
