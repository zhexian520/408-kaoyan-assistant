"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Award, 
  Bot, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Code2, 
  Cpu, 
  Layers, 
  Globe2,
  LayoutDashboard,
  ShieldCheck,
  GraduationCap
} from "lucide-react";

export default function HomePage() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalQuestions: 846,
    totalPapers: 18,
    subjectStats: { DS: 233, CO: 235, OS: 216, CN: 162 } as Record<string, number>,
  });

  useEffect(() => {
    fetch("/api/exams/stats")
      .then((res) => res.json())
      .then((json) => {
        if (json.code === 200 && json.data) {
          setStats({
            totalQuestions: json.data.totalQuestions || 0,
            totalPapers: json.data.totalPapers || 0,
            subjectStats: json.data.subjectStats || {},
          });
        }
      })
      .catch(() => {});
  }, []);

  const subjects = [
    { code: "DS", name: "数据结构", score: "45 分", count: `${stats.subjectStats.DS ?? 233} 题`, icon: Code2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800" },
    { code: "CO", name: "组成原理", score: "45 分", count: `${stats.subjectStats.CO ?? 235} 题`, icon: Cpu, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800" },
    { code: "OS", name: "操作系统", score: "35 分", count: `${stats.subjectStats.OS ?? 216} 题`, icon: Layers, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800" },
    { code: "NET", name: "计算机网络", score: "25 分", count: `${stats.subjectStats.CN ?? 162} 题`, icon: Globe2, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800" },
  ];

  const portals = [
    {
      title: "学员学习中心",
      badge: "学员端",
      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
      desc: "面向考研学生：提供个人备考看板、四科能力雷达图、180 分钟模拟考场、智能错题本与备考规划。",
      href: "/user/dashboard",
      icon: LayoutDashboard,
      btnText: "进入学员中心",
      btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
    },
    {
      title: "408 统考真题专区",
      badge: "真题题库",
      badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      desc: `收录 2009-2026 年全部统考真题，并融合 AI 智能练习题库，当前共 ${stats.totalQuestions} 道题，配备标准题干、公式高清图、选项及详细采分点解析。`,
      href: user ? "/user/exams" : "/login?redirect=/user/exams",
      icon: Award,
      btnText: "进入真题题库",
      btnClass: "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-zinc-500/20",
    },
    {
      title: "平台管理后台",
      badge: "管理端",
      badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
      desc: "面向系统管理员：提供全站用户账号与状态管理、公共知识库维护审核与 18 套试卷题库监控。",
      href: "/admin/dashboard",
      icon: ShieldCheck,
      btnText: "进入管理后台",
      btnClass: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-4 sm:py-8">
      {/* 极简 Hero 区 */}
      <div className="text-center space-y-5">
        {/* 官方矢量科技徽标展示 */}
        <div className="flex justify-center pt-2">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/25 p-1 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 hover:scale-105 transition-transform duration-300">
            <Image
              src="/logo.svg"
              alt="408 计算机考研助手 Logo"
              width={96}
              height={96}
              className="w-full h-full object-contain rounded-[20px]"
              priority
            />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          收录 2009 - 2026 年全国统考全部真题与标准采分点
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 max-w-3xl mx-auto leading-tight">
          408 计算机考研真题研炼 <br className="hidden sm:inline" />
          与全流程智能备考平台
        </h1>

        <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          全量真题题库、180 分钟全真模考、客观题秒级判分与主观大题采分点评改，助你系统攻克数据结构、组成原理、操作系统与网络。
        </p>

        {/* 核心操作按钮 */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
          {user ? (
            <>
              {isAdmin ? (
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-purple-600 text-white font-black text-sm sm:text-base hover:bg-purple-700 shadow-lg shadow-purple-600/25 transition-all hover:scale-105"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>进入平台管理后台</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/user/dashboard"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-sm sm:text-base hover:bg-blue-700 shadow-lg shadow-blue-600/25 transition-all hover:scale-105"
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span>进入学员学习中心</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/user/exams"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-bold text-sm sm:text-base hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-xs"
                  >
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>研炼 408 真题</span>
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-sm sm:text-base hover:bg-blue-700 shadow-lg shadow-blue-600/25 transition-all hover:scale-105"
              >
                <GraduationCap className="w-5 h-5" />
                <span>立即登录学员端</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-sm sm:text-base hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>登录管理后台</span>
              </Link>
              <Link
                href="/login?redirect=/user/exams"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-bold text-sm sm:text-base hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-xs"
              >
                <Award className="w-5 h-5 text-amber-500" />
                <span>研炼 408 真题</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 核心专区卡片 */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            系统核心专区
          </h2>
          <p className="text-base font-extrabold text-zinc-800 dark:text-zinc-200">
            涵盖真题研炼、模拟实战与备考规划
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {portals.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-xs hover:shadow-md flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">
                    {p.title}
                  </h3>

                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {p.desc}
                  </p>
                </div>

                <Link
                  href={p.href}
                  className={`flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${p.btnClass}`}
                >
                  <span>{p.btnText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* 四大科目直达卡片 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span className="font-semibold uppercase tracking-wider">408 四大学科全真题量</span>
          <span>总分 150 分 · {stats.totalQuestions} 道真题与 AI 练习题</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {subjects.map((sub) => {
            const Icon = sub.icon;
            return (
              <Link
                key={sub.code}
                href={`/exams?subjectCode=${sub.code}`}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all hover:shadow-sm space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl border ${sub.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-zinc-400 font-mono">
                    {sub.score}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                    {sub.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    历年统考共 {sub.count}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
