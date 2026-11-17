"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart3,
  Flame,
  TrendingUp,
  Award,
  Target,
  BookOpen,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  RefreshCw,
  Layers,
  Activity,
  Gauge,
  ChevronRight,
  Brain,
  CalendarDays,
} from "lucide-react";

interface MasteryItem {
  id: number;
  knowledgeBlockId: string;
  subjectCode: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracyRate: number;
  masteryLevel: string;
  weaknessScore: number;
}

interface WeakPoint {
  id: string;
  name: string;
  subjectCode: string;
  accuracyRate: number;
  totalAttempts: number;
  weaknessScore: number;
}

interface AnalyticsData {
  masteryList: MasteryItem[];
  pointNames: Record<string, string>;
  radarStats: Record<string, number>;
  levelCounts: { mastered: number; familiar: number; weak: number; unlearned: number };
  totals?: {
    answeredTotal?: number;
    correctTotal?: number;
    mockCount?: number;
    noteCount?: number;
    wrongTotal?: number;
    wrongOpen?: number;
    wrongMastered?: number;
    questionTotal?: number;
    coverage?: number;
    accuracy?: number;
  };
  subjectStats?: Record<string, { subjectCode: string; answered: number; correct: number; accuracy: number }>;
  dailyActivity?: Array<{ day: string; answered: number; correct: number }>;
  weakPoints?: WeakPoint[];
  recentRecords?: Array<{
    id: number;
    testTitle: string;
    userScore: number;
    totalScore: number;
    createdAt: string;
    timeSpentSeconds?: number;
  }>;
}

const SUBJECT_META: Record<string, { name: string; short: string; color: string; soft: string; text: string }> = {
  DS: { name: "数据结构", short: "DS", color: "#7c3aed", soft: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300" },
  CO: { name: "计算机组成原理", short: "CO", color: "#2563eb", soft: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300" },
  OS: { name: "操作系统", short: "OS", color: "#059669", soft: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300" },
  NET: { name: "计算机网络", short: "NET", color: "#d97706", soft: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300" },
};

export default function AnalyticsHeatmapPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const token = user?.token || localStorage.getItem("408_auth_token") || "";
      let url = "/api/user/analytics/mastery-graph";
      if (selectedSubject !== "ALL") url += `?subjectCode=${selectedSubject}`;
      const res = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : "" } });
      const json = await res.json();
      if (json.code === 200 && json.data) setData(json.data);
      else setError(json.message || "学习分析加载失败");
    } catch (err: any) {
      setError(`学习分析加载失败：${err.message || "请确认 Java 服务已启动"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject, user?.token]);

  const totals = data?.totals || {};
  const levelCounts = data?.levelCounts || { mastered: 0, familiar: 0, weak: 0, unlearned: 0 };
  const totalPoints = levelCounts.mastered + levelCounts.familiar + levelCounts.weak + levelCounts.unlearned;
  const accuracy = Number(totals.accuracy || 0);
  const coverage = Number(totals.coverage || 0);
  const answered = Number(totals.answeredTotal || 0);

  const dailySeries = useMemo(() => {
    const map = new Map((data?.dailyActivity || []).map((item) => [String(item.day).slice(0, 10), item]));
    return Array.from({ length: 14 }).map((_, index) => {
      const day = new Date();
      day.setDate(day.getDate() - (13 - index));
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      const item = map.get(key);
      return {
        date: key,
        label: `${day.getMonth() + 1}/${day.getDate()}`,
        answered: item?.answered || 0,
        correct: item?.correct || 0,
      };
    });
  }, [data?.dailyActivity]);
  const maxDaily = Math.max(1, ...dailySeries.map((item) => item.answered));

  const mockRecords = useMemo(
    () =>
      [...(data?.recentRecords || [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [data?.recentRecords]
  );
  const maxMock = Math.max(150, ...mockRecords.map((item) => Number(item.totalScore || 150)));

  const weakPoints = data?.weakPoints || [];
  const weakPointIds = new Set(weakPoints.map((item) => item.id));
  const masteryWeak = (data?.masteryList || [])
    .filter((item) => ["WEAK", "UNLEARNED"].includes(String(item.masteryLevel).toUpperCase()))
    .sort((a, b) => Number(a.accuracyRate || 0) - Number(b.accuracyRate || 0))
    .slice(0, 12);

  const insights = useMemo(() => {
    const items: string[] = [];
    if (accuracy > 0 && accuracy < 60) items.push("整体正确率低于 60%，建议先回到课程中心补基础概念，再刷真题。");
    if (coverage < 10) items.push(`题库覆盖率只有 ${coverage}%，当前样本还少，先扩大做题量再判断真实水平。`);
    if (weakPoints.length > 0) items.push(`优先处理 ${weakPoints.slice(0, 2).map((item) => item.name).join("、")}，这些是当前失分最集中的考点。`);
    if (mockRecords.length === 0) items.push("还没有全真模考记录，建议本周完成一套 180 分钟整卷，建立真实分数基线。");
    if (items.length === 0) items.push("当前学习状态较稳，保持每日补给 + 每周一套模考的节奏即可。");
    return items;
  }, [accuracy, coverage, weakPoints, mockRecords.length]);

  const donutStops = useMemo(() => {
    if (totalPoints <= 0) return "conic-gradient(#e2e8f0 0% 100%)";
    const mastered = (levelCounts.mastered / totalPoints) * 100;
    const familiar = (levelCounts.familiar / totalPoints) * 100;
    const weak = (levelCounts.weak / totalPoints) * 100;
    return `conic-gradient(#059669 0% ${mastered}%, #2563eb ${mastered}% ${mastered + familiar}%, #e11d48 ${mastered + familiar}% ${mastered + familiar + weak}%, #cbd5e1 ${mastered + familiar + weak}% 100%)`;
  }, [levelCounts, totalPoints]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      {/* 顶部 */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50/70 p-5 shadow-xs dark:border-blue-900/50 dark:from-blue-950/30 dark:via-zinc-900 dark:to-indigo-950/20 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-700/10" />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                Learning Analytics · 408 Pilot
                <span className="rounded-full border border-blue-200 bg-white/80 px-2 py-0.5 text-[9px] tracking-normal text-blue-700 dark:border-blue-900 dark:bg-zinc-900/80 dark:text-blue-300">
                  真实作答数据
                </span>
              </div>
              <h1 className="mt-1.5 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                学习分析中心
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                把作答、正确率、题库覆盖、薄弱考点和模考趋势放在一起看，告诉你现在最该补什么，而不是只给一堆数字。
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold">
                <span className="rounded-full border border-emerald-200 bg-white/70 px-2.5 py-1 text-emerald-700 dark:border-emerald-900 dark:bg-zinc-900/70 dark:text-emerald-300">
                  正确率 {accuracy}%
                </span>
                <span className="rounded-full border border-blue-200 bg-white/70 px-2.5 py-1 text-blue-700 dark:border-blue-900 dark:bg-zinc-900/70 dark:text-blue-300">
                  题库覆盖 {coverage}%
                </span>
                <span className="rounded-full border border-rose-200 bg-white/70 px-2.5 py-1 text-rose-700 dark:border-rose-900 dark:bg-zinc-900/70 dark:text-rose-300">
                  薄弱考点 {levelCounts.weak} 个
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-white/80 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80">
              {[
                { code: "ALL", label: "全科" },
                { code: "DS", label: "数据结构" },
                { code: "CO", label: "组成原理" },
                { code: "OS", label: "操作系统" },
                { code: "NET", label: "计算机网络" },
              ].map((item) => (
                <button
                  key={item.code}
                  onClick={() => setSelectedSubject(item.code)}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                    selectedSubject === item.code
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> 刷新
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white py-24 dark:border-zinc-800 dark:bg-zinc-900">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs font-bold text-slate-500">正在聚合作答、错题和模考数据...</p>
        </div>
      ) : (
        <>
          {/* 核心指标 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "精通考点", value: levelCounts.mastered, unit: "个", icon: CheckCircle2, tone: "text-emerald-600", hint: "正确率 ≥ 80%" },
              { label: "熟悉考点", value: levelCounts.familiar, unit: "个", icon: TrendingUp, tone: "text-blue-600", hint: "正确率 60%–79%" },
              { label: "薄弱考点", value: levelCounts.weak, unit: "个", icon: Flame, tone: "text-rose-600", hint: "正确率 < 60%" },
              { label: "未练考点", value: levelCounts.unlearned, unit: "个", icon: Clock, tone: "text-slate-500", hint: `共 ${totalPoints} 个考点` },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">{item.label}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-800">
                      <Icon className={`h-4 w-4 ${item.tone}`} />
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-2xl font-black text-slate-900 dark:text-zinc-100">
                    {item.value}
                    <span className="ml-1 text-[10px] font-normal text-slate-400">{item.unit}</span>
                  </p>
                  <p className="mt-1 text-[9px] text-slate-400">{item.hint}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "累计作答", value: answered, unit: "题", icon: BookOpen, tone: "text-violet-600" },
              { label: "整体正确率", value: `${accuracy}`, unit: "%", icon: Target, tone: "text-emerald-600" },
              { label: "题库覆盖率", value: `${coverage}`, unit: "%", icon: Gauge, tone: "text-blue-600" },
              { label: "全真模考", value: totals.mockCount || 0, unit: "次", icon: Award, tone: "text-amber-600" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-800">
                    <Icon className={`h-4 w-4 ${item.tone}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-400">{item.label}</p>
                    <p className="mt-0.5 font-mono text-xl font-black text-slate-900 dark:text-zinc-100">
                      {item.value}
                      <span className="ml-1 text-[10px] font-normal text-slate-400">{item.unit}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 活跃度 + 四科正确率 */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
                    <Activity className="h-4 w-4 text-blue-600" /> 近 14 天学习活跃度
                  </h2>
                  <p className="mt-0.5 text-[10px] text-slate-400">按真实作答流水统计，每天做了多少题、做对多少</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  14 天累计 {dailySeries.reduce((sum, item) => sum + item.answered, 0)} 题
                </span>
              </div>
              <div className="mt-5 flex h-44 items-end gap-1.5">
                {dailySeries.map((item) => {
                  const height = Math.max(4, Math.round((item.answered / maxDaily) * 100));
                  const correctHeight = item.answered > 0 ? Math.round((item.correct / item.answered) * height) : 0;
                  return (
                    <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <div className="relative flex h-32 w-full items-end justify-center">
                        <div className="relative w-full max-w-[26px] overflow-hidden rounded-t-md bg-blue-100 dark:bg-blue-950/40" style={{ height: `${height}%` }}>
                          <div className="absolute bottom-0 left-0 w-full rounded-t-md bg-emerald-500" style={{ height: `${correctHeight}%` }} />
                        </div>
                        <div className="pointer-events-none absolute bottom-full mb-1 hidden rounded-lg bg-slate-900 px-2 py-1 text-[9px] text-white group-hover:block">
                          {item.answered} 题 / 对 {item.correct}
                        </div>
                      </div>
                      <span className="w-full truncate text-center font-mono text-[8px] text-slate-400">{item.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-end gap-3 text-[9px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> 正确</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-100 dark:bg-blue-950/40" /> 作答</span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
                <Target className="h-4 w-4 text-emerald-600" /> 四科真实正确率
              </h2>
              <div className="mt-4 space-y-4">
                {[
                  { code: "DS", name: "数据结构", score: data?.radarStats?.DS || 0 },
                  { code: "CO", name: "计算机组成原理", score: data?.radarStats?.CO || 0 },
                  { code: "OS", name: "操作系统", score: data?.radarStats?.OS || 0 },
                  { code: "NET", name: "计算机网络", score: data?.radarStats?.NET || 0 },
                ].map((item) => (
                  <div key={item.code}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-zinc-200">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: SUBJECT_META[item.code]?.color }} />
                        {item.name}
                      </span>
                      <span className="font-mono text-[12px] font-black text-slate-800 dark:text-zinc-100">{item.score}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                      <div
                        className={`h-2 rounded-full ${item.score >= 70 ? "bg-emerald-500" : item.score >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                        style={{ width: `${Math.min(100, item.score)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/user/exams" className="mt-5 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline">
                去真题专区针对性训练 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* 掌握分布 + 学习诊断 */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
                <Layers className="h-4 w-4 text-violet-600" /> 考点掌握分布
              </h2>
              <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
                <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: donutStops }}>
                  <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white dark:bg-zinc-900">
                    <span className="font-mono text-xl font-black text-slate-900 dark:text-zinc-100">{totalPoints}</span>
                    <span className="text-[9px] font-bold text-slate-400">覆盖考点</span>
                  </div>
                </div>
                <div className="w-full space-y-2">
                  {[
                    { label: "精通", value: levelCounts.mastered, color: "bg-emerald-500" },
                    { label: "熟悉", value: levelCounts.familiar, color: "bg-blue-500" },
                    { label: "薄弱", value: levelCounts.weak, color: "bg-rose-500" },
                    { label: "未练", value: levelCounts.unlearned, color: "bg-slate-300" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 dark:border-zinc-800">
                      <span className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-zinc-300">
                        <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} /> {item.label}
                      </span>
                      <span className="font-mono text-[11px] font-black text-slate-800 dark:text-zinc-100">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-indigo-50/60 to-white p-5 shadow-xs dark:border-blue-900/60 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-zinc-900">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-zinc-100">
                <Brain className="h-4 w-4 text-blue-600" /> AI 学习诊断
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">根据当前作答、覆盖率和薄弱点自动生成，不用自己猜先学什么。</p>
              <div className="mt-4 space-y-2.5">
                {insights.map((item, index) => (
                  <div key={index} className="flex items-start gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-2.5 text-[11px] leading-relaxed text-slate-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white">{index + 1}</span>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/user/study-plan" className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-blue-700">
                  查看备考规划 <ArrowRight className="h-3 w-3" />
                </Link>
                <Link href="/user/wrong-notebook" className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-[10px] font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:bg-zinc-900 dark:text-blue-300">
                  去错题本
                </Link>
              </div>
            </div>
          </div>

          {/* 薄弱考点 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
                  <Flame className="h-4 w-4 text-rose-500" /> 薄弱考点热力图
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-400">按正确率从低到高排序，点击可直接让 AI 讲、去课程中心或做该知识点真题</p>
              </div>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                {weakPoints.length} 个高危考点
              </span>
            </div>

            {weakPoints.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {weakPoints.map((point) => {
                  const meta = SUBJECT_META[point.subjectCode === "CN" ? "NET" : point.subjectCode] || SUBJECT_META.DS;
                  return (
                    <div key={point.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 transition-colors hover:border-rose-300 dark:border-zinc-700 dark:bg-zinc-800/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${meta.soft} ${meta.text}`}>{meta.short}</span>
                          <p className="mt-1.5 line-clamp-2 text-[11px] font-extrabold text-slate-800 dark:text-zinc-100">{point.name}</p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-black text-rose-600">{point.accuracyRate}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rose-100 dark:bg-rose-950/40">
                        <div className="h-1.5 rounded-full bg-rose-500" style={{ width: `${Math.max(6, point.accuracyRate)}%` }} />
                      </div>
                      <p className="mt-1.5 text-[9px] text-slate-400">练过 {point.totalAttempts} 题 · 薄弱分 {point.weaknessScore}</p>
                      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                        <Link href={`/user/agent?point=${encodeURIComponent(point.name)}`} className="rounded-lg bg-blue-600 py-1.5 text-center text-[9px] font-bold text-white hover:bg-blue-700">AI 讲</Link>
                        <Link href={`/user/courses?subject=${encodeURIComponent(point.subjectCode || "DS")}&keyword=${encodeURIComponent(point.name)}`} className="rounded-lg border border-slate-200 bg-white py-1.5 text-center text-[9px] font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">课程</Link>
                        <Link href={`/user/exams?subject=${(point.subjectCode || "ds").toLowerCase()}&knowledgePoint=${encodeURIComponent(point.name)}`} className="rounded-lg border border-slate-200 bg-white py-1.5 text-center text-[9px] font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">真题</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-xs text-slate-400 dark:border-zinc-700">
                还没有检测到薄弱考点，继续做题后会自动生成。
              </div>
            )}
          </div>

          {/* 模考走势 + 待巩固考点 */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800">
                <h2 className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
                  <TrendingUp className="h-4 w-4 text-amber-500" /> 全真模考成绩走势
                </h2>
                <Link href="/user/exam-reports" className="text-[10px] font-bold text-blue-600 hover:underline">全部战报</Link>
              </div>
              {mockRecords.length > 0 ? (
                <div className="mt-5 flex h-44 items-end gap-3">
                  {mockRecords.map((record, index) => {
                    const score = Number(record.userScore || 0);
                    const total = Number(record.totalScore || 150);
                    const height = Math.max(6, Math.round((score / maxMock) * 100));
                    return (
                      <div key={record.id} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
                        <span className="font-mono text-[10px] font-black text-blue-600">{score}</span>
                        <div className="flex h-28 w-full items-end justify-center">
                          <div className="w-full max-w-[42px] rounded-t-lg bg-gradient-to-t from-blue-600 to-indigo-400" style={{ height: `${height}%` }} />
                        </div>
                        <span className="w-full truncate text-center text-[9px] text-slate-400">第 {index + 1} 次</span>
                        <span className="text-[8px] text-slate-400">{score}/{total}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">暂无模考记录，建议先完成一套 180 分钟整卷。</div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
                <h2 className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> 待巩固考点
                </h2>
                <span className="text-[9px] text-slate-400">按薄弱程度排序</span>
              </div>
              <div className="mt-3 space-y-2">
                {masteryWeak.length > 0 ? (
                  masteryWeak.slice(0, 6).map((item) => {
                    const name = data?.pointNames?.[item.knowledgeBlockId] || item.knowledgeBlockId;
                    return (
                      <div key={`${item.id}-${item.knowledgeBlockId}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 dark:border-zinc-800">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-bold text-slate-700 dark:text-zinc-200">{name}</p>
                          <p className="text-[9px] text-slate-400">{item.subjectCode} · 正确率 {item.accuracyRate}%</p>
                        </div>
                        <Link href={`/user/agent?point=${encodeURIComponent(name)}`} className="shrink-0 rounded-lg bg-slate-900 px-2 py-1 text-[9px] font-bold text-white dark:bg-white dark:text-slate-900">
                          AI 讲
                        </Link>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-xs text-slate-400">暂无需巩固考点</p>
                )}
              </div>
              <Link href="/user/knowledge-graph" className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline">
                打开知识图谱查看全部考点 <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
