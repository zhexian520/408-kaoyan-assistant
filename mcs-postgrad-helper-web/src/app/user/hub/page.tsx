"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Layers,
  Award,
  FileText,
  BarChart3,
  Zap,
  CheckCircle2,
  Sparkles,
  Bot,
  Calendar,
  Target,
  FileEdit,
  ArrowRight,
  Grid3X3,
  Flame,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const WORKSPACES = [
  {
    title: "学习工作台",
    subtitle: "打基础、看课程、查知识体系",
    tone: "from-blue-500 to-indigo-500",
    icon: GraduationCap,
    items: [
      { name: "学习总览", href: "/user/dashboard", icon: LayoutDashboard, desc: "今日任务、目标与学习状态" },
      { name: "课程中心", href: "/user/courses", icon: GraduationCap, desc: "四科章节精讲、动画与代码" },
      { name: "智能知识库", href: "/user/knowledge", icon: BookOpen, desc: "教材原文、RAG 切片与上传" },
      { name: "408 知识图谱", href: "/user/knowledge-graph", icon: Layers, desc: "412 考点关系与章节网络" },
    ],
  },
  {
    title: "实战训练",
    subtitle: "刷真题、全真模考、错题复盘",
    tone: "from-amber-500 to-orange-500",
    icon: Award,
    items: [
      { name: "408 统考真题", href: "/user/exams", icon: Award, desc: "按知识点分类的全部真题" },
      { name: "全真模拟考场", href: "/user/exam-hall", icon: FileText, desc: "180 分钟整卷模考" },
      { name: "模考战报", href: "/user/exam-reports", icon: BarChart3, desc: "历史成绩、逐题答卷与 PDF" },
      { name: "真题变式题", href: "/user/variant", icon: Zap, desc: "原创高仿变式训练" },
      { name: "错题本与诊断", href: "/user/wrong-notebook", icon: CheckCircle2, desc: "错因分析与针对性重练" },
    ],
  },
  {
    title: "AI 与规划",
    subtitle: "问 AI、生成计划、做择校",
    tone: "from-violet-500 to-fuchsia-500",
    icon: Sparkles,
    items: [
      { name: "研炼问答助手", href: "/user/qa", icon: Sparkles, desc: "多话题上下文与多模态问答" },
      { name: "AI 备考智能体", href: "/user/agent", icon: Bot, desc: "精讲 → 自测 → 判分 → 真题 → 复盘" },
      { name: "个性化备考规划", href: "/user/study-plan", icon: Calendar, desc: "一直覆盖到考研初试的周计划" },
      { name: "智能择校", href: "/user/school-selection", icon: Target, desc: "学硕专硕、专业代码与冲稳保" },
    ],
  },
  {
    title: "数据与沉淀",
    subtitle: "看分析、记笔记、复盘薄弱点",
    tone: "from-emerald-500 to-teal-500",
    icon: BarChart3,
    items: [
      { name: "学习分析", href: "/user/analytics", icon: BarChart3, desc: "正确率、活跃度、薄弱热力图" },
      { name: "考研云笔记", href: "/user/notes", icon: FileEdit, desc: "章节摘录、AI 摘要与真题笔记" },
    ],
  },
];

export default function UserHubPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50/70 p-6 shadow-xs dark:border-blue-900/50 dark:from-blue-950/30 dark:via-zinc-900 dark:to-indigo-950/20">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-700/10" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
              <Grid3X3 className="h-3.5 w-3.5" />
              Workspace Map
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
              功能地图
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {user?.nickname || "同学"}，这里把学员端所有功能按学习流程重新整理成 4 个工作区。日常只需要从侧边栏进入，找不到时来这里。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[9px] font-bold">
            <span className="rounded-full border border-blue-200 bg-white/80 px-2.5 py-1 text-blue-700 dark:border-blue-900 dark:bg-zinc-900/80 dark:text-blue-300">412 考点</span>
            <span className="rounded-full border border-emerald-200 bg-white/80 px-2.5 py-1 text-emerald-700 dark:border-emerald-900 dark:bg-zinc-900/80 dark:text-emerald-300">2929 道题</span>
            <span className="rounded-full border border-amber-200 bg-white/80 px-2.5 py-1 text-amber-700 dark:border-amber-900 dark:bg-zinc-900/80 dark:text-amber-300">18 年真题</span>
            <span className="rounded-full border border-violet-200 bg-white/80 px-2.5 py-1 text-violet-700 dark:border-violet-900 dark:bg-zinc-900/80 dark:text-violet-300">4 科全流程</span>
          </div>
        </div>
      </div>

      {WORKSPACES.map((workspace, index) => {
        const Icon = workspace.icon;
        return (
          <section key={workspace.title} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${workspace.tone} text-white shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                    {String(index + 1).padStart(2, "0")} {workspace.title}
                  </h2>
                  <p className="text-[10px] text-slate-400">{workspace.subtitle}</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-400">{workspace.items.length} 个功能</span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {workspace.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800/40 dark:hover:border-blue-800"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-zinc-900 dark:text-blue-300">
                      <ItemIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] font-extrabold text-slate-800 dark:text-zinc-100">
                          {item.name}
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-slate-300 transition-colors group-hover:text-blue-600" />
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-[10px] leading-relaxed text-slate-500 dark:text-zinc-400">
                        {item.desc}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
          <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          推荐学习顺序：学习工作台打基础 → 实战训练做真题和模考 → AI 与规划补薄弱和定计划 → 数据与沉淀复盘笔记。不要一上来只刷题，也不要只看课不做题。
        </p>
      </div>
    </div>
  );
}
