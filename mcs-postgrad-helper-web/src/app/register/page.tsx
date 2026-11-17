"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";
import { UserPlus, User, Lock, School, Target, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const { user, register, loading: authLoading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [targetSchool, setTargetSchool] = useState("浙江大学");
  const [targetScore, setTargetScore] = useState(125);
  const [loading, setLoading] = useState(false);

  // 如果已登录，自动跳转至用户工作台
  useEffect(() => {
    if (!authLoading && user) {
      if (user.roleCode === "ROLE_ADMIN" || user.username === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/user/dashboard");
      }
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert("请输入用户名和密码");
      return;
    }
    setLoading(true);
    const ok = await register({
      username: username.trim(),
      password: password.trim(),
      nickname: nickname.trim(),
      targetSchool: targetSchool.trim(),
      targetScore: Number(targetScore),
    });
    setLoading(false);
    if (ok) {
      router.push("/user/dashboard");
    }
  };

  return (
    <div className="max-w-lg mx-auto my-8 sm:my-14">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-7">
        <div className="text-center space-y-3">
          <Logo size="lg" showText={false} className="justify-center mx-auto" />
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            注册 408 考研助手档案
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            创建您的专属考研档案，建立个人知识图谱与薄弱点画像
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              设置用户名 *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="建议3位以上英文或数字"
                className="w-full text-base pl-11 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:border-purple-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all"
              />
              <User className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              设置登录密码 *
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6位密码"
                className="w-full text-base pl-11 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:border-purple-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all"
              />
              <Lock className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              备考昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="如：浙大上岸选手"
              className="w-full text-base px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:border-purple-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <School className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>目标院校</span>
              </label>
              <input
                type="text"
                value={targetSchool}
                onChange={(e) => setTargetSchool(e.target.value)}
                placeholder="如: 浙江大学"
                className="w-full text-sm sm:text-base px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>目标分数 (满分150)</span>
              </label>
              <input
                type="number"
                min={60}
                max={150}
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="w-full text-sm sm:text-base px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 outline-none font-bold focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-base shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
            <span>{loading ? "正在创建档案..." : "立即注册并开启备考"}</span>
          </button>
        </form>

        <div className="text-center text-sm text-zinc-500 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          已有考研助手账号？{" "}
          <Link href="/login" className="text-purple-600 dark:text-purple-400 hover:underline font-bold">
            直接登录 →
          </Link>
        </div>
      </div>
    </div>
  );
}

