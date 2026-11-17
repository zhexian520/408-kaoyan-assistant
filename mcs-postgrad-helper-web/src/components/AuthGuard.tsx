"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, PUBLIC_PATHS } from "@/context/AuthContext";
import { Lock, LogIn, ArrowRight, ShieldAlert } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute = pathname.startsWith("/user");

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      // 未登录直接重定向到登录页
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // 管理员属于纯粹的管理运维角色，禁止进入学员端学习页面，自动跳转至管理员后台
    if (!loading && user && isAdmin && isUserRoute) {
      router.replace("/admin/dashboard");
      return;
    }

    // 普通学员禁止越权访问管理后台
    if (!loading && user && !isAdmin && isAdminRoute) {
      router.replace("/user/dashboard");
      return;
    }
  }, [user, loading, isPublic, pathname, router, isAdmin, isUserRoute, isAdminRoute]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-zinc-500">正在验证用户登录身份...</p>
      </div>
    );
  }

  // 管理员路由越权拦截
  if (isAdminRoute && user && !isAdmin) {
    return (
      <div className="max-w-lg mx-auto my-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
          无访问权限
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          后台用户管理仅限系统超级管理员访问。当前账号为普通学生权限。
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all"
          >
            返回系统首页
          </Link>
        </div>
      </div>
    );
  }

  // 必须登录才能访问
  if (!user && !isPublic) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
          请先登录后使用本功能
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          408 真题库刷题、模拟考场交卷判分、AI 备考智能体带练及错题本功能需要绑定您的专属考研档案。
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href={`/login?redirect=${encodeURIComponent(pathname)}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all shadow-md"
          >
            <LogIn className="w-3.5 h-3.5" /> 立即登录
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-bold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            注册新账号 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

