"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  Award, 
  Bot, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  LogIn, 
  LogOut 
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { name: "真题专区", href: "/exams", icon: Award },
    { name: "答题考场", href: "/exam-hall", icon: FileText },
    { name: "AI智能体", href: "/agent", icon: Bot },
    { name: "错题本", href: "/wrong-notebook", icon: CheckCircle2 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
        {/* 极简 Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-black text-xs tracking-tight shadow-sm transition-transform group-hover:scale-105">
            408
          </div>
          <span className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-100">
            考研助手
          </span>
        </Link>

        {/* 精炼核心导航 */}
        <nav className="flex items-center gap-1 sm:gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* 管理员后台入口 */}
          {isAdmin && (
            <Link
              href="/admin/users"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname.startsWith("/admin")
                  ? "bg-purple-600 text-white"
                  : "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>用户管理</span>
            </Link>
          )}
        </nav>

        {/* 用户状态 / 登录按钮 */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block leading-tight">
                  {user.nickname || user.username}
                </span>
                {user.targetSchool && (
                  <span className="text-[10px] text-zinc-400 leading-tight block">
                    {user.targetSchool}
                  </span>
                )}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt={user.nickname}
                className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200 dark:border-zinc-700"
              />
              <button
                onClick={logout}
                title="退出登录"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 transition-colors"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 transition-opacity"
              >
                注册
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
