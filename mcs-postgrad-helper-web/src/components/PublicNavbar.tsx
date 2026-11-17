"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { 
  LayoutDashboard, 
  ShieldCheck, 
  LogIn, 
  LogOut,
  ArrowRight
} from "lucide-react";

export default function PublicNavbar() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* 前台 Brand Logo */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-8">
          <Logo href="/" size="md" variant="portal" className="min-w-0 max-w-[140px] sm:max-w-none" />
        </div>

        {/* 右侧端侧流转与鉴权 */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin ? (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md shadow-purple-500/20 transition-all hover:scale-105"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>管理控制台</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                </Link>
              ) : (
                <Link
                  href="/user/dashboard"
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105 whitespace-nowrap"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="sm:hidden">学习中心</span><span className="hidden sm:inline">学员学习中心</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                </Link>
              )}

              <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-zinc-200 dark:border-zinc-800">
                <div className="text-right">
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {user.nickname || user.username}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {isAdmin ? "平台超级管理员" : (user.targetSchool || "408备考学员")}
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="退出登录"
                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>登录</span>
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold hover:opacity-90 transition-all shadow-md"
              >
                免费注册
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

