"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import TargetConfigModal from "@/components/TargetConfigModal";
import {
  Calendar,
  Target,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Flame,
  Award,
  BookOpen,
  RefreshCw,
  Sliders,
  Layers,
  Bot,
  Zap,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ExternalLink,
  Circle,
  GraduationCap,
} from "lucide-react";

interface PlanData {
  id: number;
  planName: string;
  prepDurationMonths: number;
  baseLevel: string;
  targetScore: number;
  currentStage: string;
  startDate: string;
  examDate: string;
  dailyTargetHours: number;
}

interface PlanTask {
  id: number;
  weekNumber: number;
  stage: string;
  subjectCode: string;
  title: string;
  taskType: string;
  isCompleted: number;
  completedAt?: string;
  description?: string;
  targetRoute?: string;
  targetCount?: number;
  progressCurrent?: number;
  progressUnit?: string;
  autoRule?: string;
  baselineValue?: number;
  dueDate?: string;
  priority?: number;
  isAuto?: number;
  lastSyncedAt?: string;
}

interface SubjectStat {
  subjectCode: string;
  subjectName: string;
  answered: number;
  correct: number;
  accuracy: number;
  total: number;
  coverage: number;
  mastery: number;
  masteredWrong: number;
}

interface Activity {
  answeredTotal: number;
  correctTotal: number;
  accuracy: number;
  mockCount: number;
  noteCount: number;
  wrongTotal: number;
  wrongOpen: number;
  wrongMastered: number;
  questionTotal: number;
  coverage: number;
  weakestSubject: string;
  subjectStats: Record<string, SubjectStat>;
  recentDaily: Array<{ day: string; answered: number; correct: number }>;
  lastMock?: { testTitle: string; userScore: number; totalScore: number; createdAt: string } | null;
  syncedAt?: string;
}

const STAGES_META: Record<string, { name: string; badge: string; color: string; desc: string; focus: string }> = {
  BASIC: {
    name: "基础阶段",
    badge: "第1阶段",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    desc: "地毯式夯实 408 核心概念，打通四大教材知识脉络",
    focus: "数据结构线性表/树/图基本操作 + 计组数制指令 + OS进程内存 + 计网体系结构",
  },
  ENHANCE: {
    name: "强化阶段",
    badge: "第2阶段",
    color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
    desc: "高频算法与硬核算力专项突破，攻关跨科目综合应用大题",
    focus: "代码大题手写 + Cache主存地址计算 + 虚存两级页表TLB推导 + TCP拥塞控制与子网划分",
  },
  TRUE_EXAM: {
    name: "真题阶段",
    badge: "第3阶段",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
    desc: "18届统考真题精刷与 180 分钟全真限时模考",
    focus: "2009-2026年真题分类逐题精析，标准采分点书写规范，严格卡考场做题时间",
  },
  SPRINT: {
    name: "冲刺阶段",
    badge: "第4阶段",
    color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300",
    desc: "薄弱考点雷达图靶向消灭，易错陷阱回炉与考前密押押题",
    focus: "个人错题本全面清零，易混概念辨析，考前模拟演练",
  },
};

const SUBJECT_NAMES: Record<string, string> = {
  DS: "数据结构",
  CO: "计算机组成原理",
  OS: "操作系统",
  CN: "计算机网络",
  ALL: "全科",
};

const SUBJECT_COLORS: Record<string, string> = {
  DS: "bg-violet-500",
  CO: "bg-blue-500",
  OS: "bg-emerald-500",
  CN: "bg-amber-500",
  ALL: "bg-slate-500",
};

function percent(value?: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

export default function StudyPlanPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>("ALL");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [lastSynced, setLastSynced] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const stageInitialized = useRef(false);

  const token = useCallback(() => {
    if (typeof window === "undefined") return "";
    return user?.token || localStorage.getItem("408_auth_token") || "";
  }, [user?.token]);

  const applyData = useCallback((json: any) => {
    if (json.code === 200 && json.data) {
      setPlan(json.data.plan);
      setTasks(json.data.tasks || []);
      setActivity(json.data.activity || null);
      setLastSynced(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
      setError("");
      if (!stageInitialized.current && json.data.plan?.currentStage) {
        setSelectedStage(json.data.plan.currentStage);
        stageInitialized.current = true;
      }
      return true;
    }
    return false;
  }, []);

  const fetchPlan = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch("/api/user/study-plan", {
          headers: { Authorization: `Bearer ${token()}` },
        });
        const json = await res.json();
        if (!applyData(json) && !silent) {
          setError(json.message || "备考规划加载失败");
        }
      } catch (err: any) {
        if (!silent) setError(`备考规划加载失败：${err.message || "请确认 Java 服务已启动"}`);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [applyData, token]
  );

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // 自动刷新：每 30 秒、窗口重新聚焦、从其他页面返回时同步真实进度。
  useEffect(() => {
    const timer = window.setInterval(() => fetchPlan(true), 30000);
    const onFocus = () => fetchPlan(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchPlan(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchPlan]);

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/user/study-plan/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!applyData(json)) {
        setError(json.message || "重新生成规划失败");
      } else {
        setSelectedStage(json.data?.plan?.currentStage || "ALL");
        stageInitialized.current = true;
        setSuccessMessage(
          `已根据当前目标重新生成规划：覆盖到 ${json.data?.plan?.examDate || "考试日"}，共 ${json.data?.tasks?.length || 0} 项任务。`
        );
        window.setTimeout(() => setSuccessMessage(""), 5000);
      }
    } catch (err: any) {
      setError(`重新生成规划失败：${err.message || "请确认 Java 服务已启动"}`);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = async (task: PlanTask) => {
    if (task.isAuto === 1) return;
    const nextStatus = task.isCompleted === 1 ? 0 : 1;
    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? {
              ...item,
              isCompleted: nextStatus,
              progressCurrent: nextStatus === 1 ? item.targetCount || 0 : 0,
            }
          : item
      )
    );
    try {
      const res = await fetch(`/api/user/study-plan/tasks/${task.id}/complete`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ isCompleted: nextStatus }),
      });
      const json = await res.json();
      if (json.code !== 200) {
        setError(json.message || "任务打卡失败");
        await fetchPlan(true);
      }
    } catch (err) {
      console.error("打卡任务失败:", err);
      await fetchPlan(true);
    }
  };

  const completedCount = tasks.filter((task) => task.isCompleted === 1).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = useMemo(() => {
    const list = selectedStage === "ALL" ? tasks : tasks.filter((task) => task.stage === selectedStage);
    return [...list].sort((a, b) => {
      const pa = a.priority || 0;
      const pb = b.priority || 0;
      if (pa !== pb) return pb - pa;
      return (a.weekNumber || 0) - (b.weekNumber || 0);
    });
  }, [tasks, selectedStage]);

  const todayTasks = useMemo(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const candidates = tasks.filter(
      (task) => !task.dueDate || task.dueDate <= today || (task.priority || 0) >= 4
    );
    const incomplete = candidates
      .filter((task) => task.isCompleted !== 1)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const completed = candidates
      .filter((task) => task.isCompleted === 1)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const picked = incomplete.slice(0, 4);
    // 完成任务不能从列表里凭空消失：至少保留一条已完成任务并显示“已完成”
    if (completed.length > 0) {
      if (picked.length >= 4) {
        picked[3] = completed[0];
      } else {
        picked.push(completed[0]);
      }
    }
    return picked;
  }, [tasks]);

  const daysLeft = useMemo(() => {
    if (!plan?.examDate) return 0;
    const diff = new Date(plan.examDate).getTime() - Date.now();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [plan?.examDate]);

  const currentStageMeta = STAGES_META[plan?.currentStage || "BASIC"] || STAGES_META.BASIC;
  const subjectStats = activity ? Object.values(activity.subjectStats || {}) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16">
      {/* 顶部 */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
              408 个性化备考规划
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 text-xs font-bold">
              真实数据自动同步
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            规划会结合你的目标院校/分数、当前阶段、真实作答、模考、错题掌握和笔记产出动态生成；完成任务后进度会自动刷新。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={generatePlan}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "正在生成..." : "重新生成规划"}
          </button>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 text-slate-700 dark:text-zinc-300 font-bold text-xs transition-all"
          >
            <Sliders className="w-4 h-4" />
            调整目标
          </button>
          <Link
            href="/user/dashboard#study-plan"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 text-slate-700 dark:text-zinc-300 font-bold text-xs transition-all"
          >
            <CalendarCheck className="w-4 h-4 text-blue-600" />
            首页看板
          </Link>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">{error}</p>
          <button onClick={() => fetchPlan()} className="font-bold underline">重试</button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs font-bold text-slate-500">正在读取目标、作答、模考与错题数据...</p>
        </div>
      ) : (
        <>
          {/* 目标与总进度 */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100">
                  {plan?.planName || "408 个性化备考规划"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold">
                    🎯 目标院校：<strong className="text-blue-600 dark:text-blue-400">{user?.targetSchool || "待设置"}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold">
                    🏆 目标分数：<strong className="text-amber-600 dark:text-amber-400">{plan?.targetScore || user?.targetScore || 125} 分</strong>
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg border font-bold ${currentStageMeta.color}`}>
                    🚩 {currentStageMeta.name}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold">
                    ⏳ 距考试 <strong className="font-mono text-rose-600">{daysLeft}</strong> 天
                  </span>
                  {plan?.examDate && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold">
                      计划覆盖至 {String(plan.examDate).slice(0, 10)} · 共 {Math.max(1, Math.ceil(daysLeft / 7))} 周
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold">
                    日均 <strong className="font-mono">{plan?.dailyTargetHours || 4.5}</strong> 小时
                  </span>
                </div>
              </div>

              <div className="shrink-0 lg:text-right">
                <div className="flex items-baseline gap-1 lg:justify-end">
                  <span className="text-4xl font-black text-blue-600 dark:text-blue-400 font-mono">{progressPercent}%</span>
                  <span className="text-xs text-slate-400 font-bold">总完成率</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  已达成 {completedCount} / {tasks.length} 项任务
                </p>
                <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  最近同步：{lastSynced || "--"}
                </p>
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* 真实学习数据 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {[
                { label: "已答题", value: activity?.answeredTotal ?? 0, unit: "题", icon: BookOpen, tone: "text-blue-600" },
                { label: "正确率", value: percent(activity?.accuracy), unit: "", icon: Target, tone: "text-emerald-600" },
                { label: "全真模考", value: activity?.mockCount ?? 0, unit: "次", icon: Award, tone: "text-amber-600" },
                { label: "待复习错题", value: activity?.wrongOpen ?? 0, unit: "道", icon: AlertTriangle, tone: "text-rose-600" },
                { label: "云笔记", value: activity?.noteCount ?? 0, unit: "篇", icon: Zap, tone: "text-violet-600" },
                { label: "题库覆盖率", value: percent(activity?.coverage), unit: "", icon: BarChart3, tone: "text-cyan-600" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400">{item.label}</span>
                      <Icon className={`h-3.5 w-3.5 ${item.tone}`} />
                    </div>
                    <p className="mt-1.5 font-mono text-lg font-black text-slate-900 dark:text-zinc-100">
                      {item.value}
                      <span className="ml-1 text-[10px] font-normal text-slate-400">{item.unit}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 今日建议任务 */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-zinc-100">
                  <Flame className="h-4 w-4 text-rose-500" />
                  今日优先任务
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  根据当前阶段、目标和真实进度推荐，已完成任务会保留标记
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <span>计划已完成 {completedCount} 项</span>
                <span>·</span>
                <span>{lastSynced ? `已同步 ${lastSynced}` : ""}</span>
              </div>
            </div>
            {todayTasks.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {todayTasks.map((task) => {
                  const done = task.isCompleted === 1;
                  const progress = task.progressCurrent || 0;
                  const target = task.targetCount || 0;
                  const unit = task.progressUnit || "题";
                  return (
                    <div
                      key={task.id}
                      className={`group flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition-all ${
                        done
                          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/10"
                          : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50 dark:border-zinc-700 dark:bg-zinc-800/40 dark:hover:border-blue-800"
                      }`}
                    >
                      <Link
                        href={task.targetRoute || "#"}
                        className="flex min-w-0 flex-1 items-start gap-3"
                      >
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white ${SUBJECT_COLORS[task.subjectCode] || "bg-slate-500"}`}>
                          {task.subjectCode}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[11px] font-bold ${
                              done
                                ? "text-slate-400 line-through dark:text-zinc-500"
                                : "text-slate-800 group-hover:text-blue-700 dark:text-zinc-200 dark:group-hover:text-blue-300"
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                            <span>第 {task.weekNumber} 周</span>
                            <span>·</span>
                            <span>{STAGES_META[task.stage]?.name || task.stage}</span>
                            <span>·</span>
                            {done ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">已完成</span>
                            ) : (
                              <span>
                                {progress}/{target} {unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {done ? (
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : task.isAuto === 1 ? (
                        <Link href={task.targetRoute || "#"} className="mt-0.5 shrink-0">
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleTask(task)}
                          title="标记为已完成"
                          className="mt-0.5 shrink-0 cursor-pointer text-slate-300 hover:text-blue-500 dark:text-zinc-600 dark:hover:text-blue-400"
                        >
                          <Circle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                <CheckCircle2 className="mx-auto mb-2 h-5 w-5" />
                今日优先任务已全部完成，可以继续刷真题或做一套模考保持手感。
              </div>
            )}
          </div>

          {/* 学科真实掌握 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {subjectStats.map((stat) => (
              <div key={stat.subjectCode} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-800 dark:text-zinc-200">{stat.subjectName}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {stat.answered}/{stat.total}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div>
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>正确率</span>
                      <span>{percent(stat.accuracy)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800">
                      <div className={`h-1.5 rounded-full ${SUBJECT_COLORS[stat.subjectCode]}`} style={{ width: `${Math.min(100, (stat.accuracy || 0) * 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>题库覆盖</span>
                      <span>{percent(stat.coverage)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800">
                      <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${Math.min(100, (stat.coverage || 0) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 阶段任务 */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100">四阶段任务清单</h3>
                  <p className="text-[10px] text-slate-400">自动任务会按真实作答、模考、错题掌握和笔记自动同步</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[{ code: "ALL", label: "全部阶段" }, ...Object.entries(STAGES_META).map(([code, meta]) => ({ code, label: meta.name }))].map((stage) => (
                  <button
                    key={stage.code}
                    type="button"
                    onClick={() => setSelectedStage(stage.code)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                      selectedStage === stage.code
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-blue-600"
                    }`}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedStage !== "ALL" && STAGES_META[selectedStage] && (
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 text-xs dark:border-blue-900/60 dark:bg-blue-950/20">
                <div className="flex items-center justify-between font-extrabold text-blue-900 dark:text-blue-300">
                  <span>{STAGES_META[selectedStage].desc}</span>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {STAGES_META[selectedStage].badge}
                  </span>
                </div>
                <p className="mt-1 text-slate-600 dark:text-zinc-400">【核心攻坚范围】：{STAGES_META[selectedStage].focus}</p>
              </div>
            )}

            {filteredTasks.length > 0 ? (
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                {filteredTasks.map((task) => {
                  const isDone = task.isCompleted === 1;
                  const auto = task.isAuto === 1;
                  const target = task.targetCount || 0;
                  const progress = task.progressCurrent || 0;
                  const taskPercent = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : isDone ? 100 : 0;
                  const stageMeta = STAGES_META[task.stage];
                  return (
                    <div
                      key={task.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isDone
                          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/10"
                          : "border-slate-200 bg-white hover:border-blue-300 dark:border-zinc-700/80 dark:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleTask(task)}
                            disabled={auto}
                            title={auto ? "该任务由真实学习数据自动统计" : isDone ? "标记为未完成" : "点击打卡完成"}
                            className={`mt-0.5 shrink-0 ${auto ? "cursor-default" : "cursor-pointer"}`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <Circle className={`h-5 w-5 ${auto ? "text-slate-300 dark:text-zinc-600" : "text-slate-300 hover:text-blue-500"}`} />
                            )}
                          </button>
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono font-extrabold text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
                                第 {task.weekNumber} 周
                              </span>
                              <span className={`rounded-md px-2 py-0.5 font-bold text-white ${SUBJECT_COLORS[task.subjectCode] || "bg-slate-500"}`}>
                                {SUBJECT_NAMES[task.subjectCode] || task.subjectCode}
                              </span>
                              <span className="text-slate-400">{stageMeta?.name || task.stage}</span>
                              <span className={`rounded-md px-1.5 py-0.5 font-bold ${auto ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                                {auto ? "自动同步" : "手动打卡"}
                              </span>
                              {isDone && (
                                <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 font-bold text-white">
                                  已完成
                                </span>
                              )}
                            </div>
                            <h4 className={`text-xs sm:text-sm font-bold leading-relaxed ${isDone ? "text-slate-400 line-through dark:text-zinc-500" : "text-slate-900 dark:text-zinc-100"}`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-[10px] leading-relaxed text-slate-400">{task.description}</p>
                            )}
                          </div>
                        </div>
                        {task.targetRoute && (
                          <Link
                            href={task.targetRoute}
                            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            去完成
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>

                      {target > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>真实进度</span>
                            <span className="font-mono">{progress} / {target} {task.progressUnit || "题"}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${isDone ? "bg-emerald-500" : "bg-blue-500"}`}
                              style={{ width: `${taskPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400">
                该阶段暂无任务，点击右上角「重新生成规划」。
              </div>
            )}
          </div>

          {/* 最近模考 */}
          {activity?.lastMock && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">最近一次全真模考</p>
                    <p className="text-xs font-black text-slate-900 dark:text-zinc-100">
                      {activity.lastMock.testTitle}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-black text-blue-600 dark:text-blue-400">
                    {activity.lastMock.userScore} / {activity.lastMock.totalScore}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {activity.lastMock.createdAt?.replace("T", " ").slice(0, 16)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] leading-relaxed text-slate-500 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              进度统计口径：真实作答来自「408统考真题 / 全真模拟考场」的答题明细；错题掌握来自「错题本」标记；模考次数来自交卷记录；笔记来自「考研云笔记」。页面每 30 秒、窗口重新聚焦时自动同步。
            </p>
          </div>
        </>
      )}

      <TargetConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSaved={generatePlan}
      />
    </div>
  );
}
