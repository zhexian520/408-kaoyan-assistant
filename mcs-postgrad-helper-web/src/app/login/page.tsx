"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";
import { LogIn, Sparkles, User, Lock, ArrowRight, ShieldCheck, GraduationCap } from "lucide-react";

function LoginContent() {
  const { user, login, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 如果已登录，自动跳转到对应端侧仪表盘
  useEffect(() => {
    if (!authLoading && user) {
      if (user.roleCode === "ROLE_ADMIN" || user.username === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/user/dashboard");
      }
    }
  }, [user, authLoading, router]);

  const navigateAfterLogin = (loggedUser: any) => {
    if (loggedUser.roleCode === "ROLE_ADMIN" || loggedUser.username === "admin") {
      router.push("/admin/dashboard");
    } else {
      if (redirectUrl && redirectUrl.startsWith("/user/")) {
        router.push(redirectUrl);
      } else {
        router.push("/user/dashboard");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert("请输入用户名和密码");
      return;
    }
    setLoading(true);
    const loggedUser = await login(username.trim(), password.trim());
    setLoading(false);
    if (loggedUser) {
      navigateAfterLogin(loggedUser);
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setLoading(true);
    const loggedUser = await login(u, p);
    setLoading(false);
    if (loggedUser) {
      navigateAfterLogin(loggedUser);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-8 sm:my-14">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-7">
        <div className="text-center space-y-3">
          <Logo size="lg" showText={false} className="justify-center mx-auto" />
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            登录 408 计算机考研助手
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            登录后自动进入学员学习中心或管理后台
          </p>
        </div>

        {/* 快捷一键登录预设 */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 space-y-3">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
            测试账号快捷一键登入：
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleQuickLogin("admin", "admin123")}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-sm font-bold transition-all shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>管理员 (admin)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("student", "123456")}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-sm font-bold transition-all shadow-xs"
            >
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>学员端 (student)</span>
            </button>
          </div>
        </div>

        {/* 账号密码表单 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              账号 / 用户名
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full text-base pl-11 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all"
              />
              <User className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              登录密码
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full text-base pl-11 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all"
              />
              <Lock className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            <span>{loading ? "正在验证身份..." : "立即登录进入系统"}</span>
          </button>
        </form>

        <div className="text-center text-sm text-zinc-500 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          还没有考研助手档案？{" "}
          <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-bold">
            免费注册一个 →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-zinc-500">正在加载登录界面...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

