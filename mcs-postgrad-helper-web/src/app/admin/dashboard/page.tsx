"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  BookOpen,
  FileCheck2,
  Bot,
  TrendingUp,
  Server,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Sparkles,
  Database,
  CalendarDays,
  Target,
  Gauge,
  GraduationCap,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  AdminBadge,
  AdminEmptyState,
  AdminLink,
  AdminPanel,
  AdminSpinner,
  AdminStatCard,
  cx,
} from "@/components/admin/AdminUI";

interface AdminAnalyticsData {
  totals?: {
    answeredTotal?: number;
    correctTotal?: number;
    mockCount?: number;
    wrongTotal?: number;
    wrongMastered?: number;
    userCount?: number;
    questionCount?: number;
  };
  subjectStats?: Array<{ subjectCode: string; answered: number; correct: number }>;
  dailyActivity?: Array<{ day: string; answered: number; correct: number }>;
}

interface AdminDashboardData {
  totalUsers: number;
  todayNewUsers: number;
  totalExamPapers: number;
  totalQuestions: number;
  totalTestSubmissions: number;
  totalAiGradingCalls: number;
  avgExamScore: number;
  aiEngineStatus: string;
  javaBackendStatus: string;
  subjectQuestionStats: Record<string, number>;
  recentSubmissions: Array<{
    id: number;
    userId: number;
    username: string;
    nickname: string;
    paperId: number;
    testTitle: string;
    userScore: number;
    totalScore: number;
    timeSpentSeconds: number;
    submitTime: string;
  }>;
  recentUsers: Array<{
    id: number;
    username: string;
    nickname: string;
    targetSchool: string;
    targetScore: number;
    status: number;
    createdAt: string;
  }>;
}

const SUBJECT_META = [
  {
    code: "DS",
    name: "数据结构",
    short: "DS",
    desc: "线性表 · 树 · 图 · 排序",
    color: "#1f3a56",
    bar: "bg-sky-900",
  },
  {
    code: "CO",
    name: "计算机组成原理",
    short: "CO",
    desc: "数据通路 · 存储 · 指令",
    color: "#4a6b8a",
    bar: "bg-sky-700",
  },
  {
    code: "OS",
    name: "操作系统",
    short: "OS",
    desc: "进程 · 内存 · 文件系统",
    color: "#2f7d5d",
    bar: "bg-emerald-600",
  },
  {
    code: "NET",
    name: "计算机网络",
    short: "NET",
    desc: "分层协议 · 路由 · 拥塞控制",
    color: "#b7791f",
    bar: "bg-amber-600",
  },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "long",
      })
    );
  }, []);

  const fetchDashboardData = async (mode: "load" | "refresh" = "load") => {
    if (!user?.token) return;
    if (mode === "refresh") setRefreshing(true);
    try {
      const res = await fetch("/api/admin/dashboard/stats", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.message || "仪表盘数据加载失败");
      }
    } catch (err) {
      console.error("Failed to load admin overview:", err);
      setError("无法连接 Java 业务网关，请确认 8080 端口服务正常");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch("/api/admin/analytics/overview", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setAnalytics(json.data);
      }
    } catch (err) {
      console.warn("学习分析数据加载失败:", err);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchDashboardData();
      fetchAnalytics();
    }
  }, [user?.token]);

  if (loading) {
    return <AdminSpinner label="正在同步平台运营指标与服务集群状态..." />;
  }

  const totalUsers = data?.totalUsers ?? 0;
  const todayNewUsers = data?.todayNewUsers ?? 0;
  const totalQuestions = data?.totalQuestions ?? 0;
  const totalExamPapers = data?.totalExamPapers ?? 0;
  const totalTestSubmissions = data?.totalTestSubmissions ?? 0;
  const totalAiGradingCalls = data?.totalAiGradingCalls ?? 0;
  const avgExamScore = data?.avgExamScore ?? 0;

  const subjectCounts = SUBJECT_META.map((subject) => ({
    ...subject,
    count:
      data?.subjectQuestionStats?.[subject.code] ??
      (subject.code === "NET" ? data?.subjectQuestionStats?.CN : undefined) ??
      0,
  }));
  const subjectTotal = subjectCounts.reduce((sum, item) => sum + item.count, 0);

  let donutCursor = 0;
  const donutStops = subjectCounts.map((subject) => {
    const start = donutCursor;
    const share = subjectTotal > 0 ? (subject.count / subjectTotal) * 100 : 0;
    donutCursor += share;
    return `${subject.color} ${start.toFixed(2)}% ${donutCursor.toFixed(2)}%`;
  });
  const donutBackground =
    subjectTotal > 0
      ? `conic-gradient(${donutStops.join(", ")})`
      : "conic-gradient(rgba(148,163,184,.25) 0% 100%)";

  const services = [
    {
      name: "Python AI 智能体引擎",
      sub: "FastAPI · Port 8000",
      status: data?.aiEngineStatus || "STANDBY",
      icon: Bot,
      tone: "sky" as const,
    },
    {
      name: "Java 业务网关",
      sub: "Spring Boot · Port 8080",
      status: data?.javaBackendStatus || "STANDBY",
      icon: Server,
      tone: "blue" as const,
    },
    {
      name: "MySQL 核心数据库",
      sub: "26 张表 · Port 3306",
      status: data ? "ONLINE" : "STANDBY",
      icon: Database,
      tone: "emerald" as const,
    },
    {
      name: "DeepSeek 大模型",
      sub: "OpenAI 兼容协议 · 已配置密钥",
      status: data?.aiEngineStatus === "ONLINE" ? "CONNECTED" : "STANDBY",
      icon: Sparkles,
      tone: "amber" as const,
    },
  ];
  const onlineServices = services.filter((service) =>
    ["ONLINE", "CONNECTED"].includes(service.status)
  ).length;
  const healthPercent = Math.round((onlineServices / services.length) * 100);

  const dailyActivity = analytics?.dailyActivity || [];
  const maxDailyAnswered = Math.max(1, ...dailyActivity.map((item) => Number(item.answered || 0)));
  const subjectAccuracy = SUBJECT_META.map((meta) => {
    const raw = analytics?.subjectStats?.find((item) =>
      meta.code === "NET" ? item.subjectCode === "CN" : item.subjectCode === meta.code
    );
    const answered = Number(raw?.answered || 0);
    const correct = Number(raw?.correct || 0);
    return {
      ...meta,
      answered,
      correct,
      rate: answered > 0 ? Math.round((correct / answered) * 1000) / 10 : 0,
    };
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page header */}
      <header
        className="flex flex-col gap-5 border-b pb-5 xl:flex-row xl:items-end xl:justify-between"
        style={{ borderColor: "var(--a-border)" }}
      >
        <div className="min-w-0">
          <div
            className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em]"
            style={{ color: "var(--a-faint)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            平台实时运营概览
            <span className="text-slate-300">·</span>
            <span className="font-mono tracking-normal">{today || "实时数据流"}</span>
          </div>
          <h1
            className="mt-2 text-[1.8rem] font-black tracking-tight sm:text-[2.1rem]"
            style={{ color: "var(--a-text)" }}
          >
            平台运营总览
          </h1>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed" style={{ color: "var(--a-muted)" }}>
            实时掌控 408 考研助手的学员增长、真题题库、全真模考与 AI 评卷引擎健康度。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold"
            style={{ borderColor: "var(--a-border)", background: "var(--a-surface)", color: "var(--a-muted)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {onlineServices}/{services.length} 服务在线 · 健康度 {healthPercent}%
          </div>
          <Link href="/admin/ai-config" className="admin-btn admin-btn-primary">
            <Cpu className="h-4 w-4" />
            配置 AI 大模型
          </Link>
          <Link href="/admin/users" className="admin-btn admin-btn-ghost">
            <Users className="h-4 w-4" />
            用户管理
          </Link>
          <button
            onClick={() => {
              fetchDashboardData("refresh");
              fetchAnalytics();
            }}
            disabled={refreshing}
            className="admin-btn admin-btn-ghost disabled:opacity-50"
            aria-label="刷新数据"
          >
            <RefreshCw className={cx("h-4 w-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">运营数据同步失败</p>
            <p className="mt-0.5 text-[11px] opacity-80">{error}</p>
          </div>
          <button
            onClick={() => fetchDashboardData("refresh")}
            className="shrink-0 rounded-lg border border-rose-500/30 px-2.5 py-1 font-bold transition-colors hover:bg-rose-500/10"
          >
            重试
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="注册学员总数"
          value={totalUsers}
          suffix="人"
          icon={Users}
          tone="sky"
          hint={`今日新增 +${todayNewUsers} 人`}
          badge={<AdminBadge tone="sky">活跃增长</AdminBadge>}
        />
        <AdminStatCard
          label="题库题目总量"
          value={totalQuestions}
          suffix="题"
          icon={BookOpen}
          tone="blue"
          hint={`已导入 ${totalExamPapers} 套试卷（含 AI 练习题库）`}
          badge={<AdminBadge tone="blue">真题 + AI 练习</AdminBadge>}
        />
        <AdminStatCard
          label="模拟考场交卷人次"
          value={totalTestSubmissions}
          suffix="人次"
          icon={FileCheck2}
          tone="amber"
          hint={`全站实战均分 ${avgExamScore} 分`}
          badge={<AdminBadge tone="amber">全真模考</AdminBadge>}
        />
        <AdminStatCard
          label="AI 评卷与智能体调用"
          value={totalAiGradingCalls}
          suffix="次"
          icon={Bot}
          tone="emerald"
          hint="主观题采分点判分与 Agent 特训"
          badge={<AdminBadge tone="emerald">引擎在线</AdminBadge>}
        />
      </div>

      {/* 学习活跃度 + 四科正确率 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AdminPanel
          title="近 14 天学习活跃度"
          subtitle="按真实作答流水统计每日作答量与正确量"
          icon={TrendingUp}
          action={<AdminLink href="/admin/analytics">查看完整分析</AdminLink>}
        >
          {dailyActivity.length > 0 ? (
            <div className="flex h-44 items-end gap-2">
              {dailyActivity.map((item) => {
                const answered = Number(item.answered || 0);
                const correct = Number(item.correct || 0);
                const height = Math.max(8, Math.round((answered / maxDailyAnswered) * 100));
                return (
                  <div key={item.day} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="relative flex h-32 w-full items-end justify-center">
                      <div
                        className="w-full max-w-[26px] rounded-t-lg bg-sky-800/80 transition-all group-hover:bg-sky-700 dark:bg-sky-500/70"
                        style={{ height: `${height}%` }}
                        title={`${item.day.slice(0, 10)}：作答 ${answered}，正确 ${correct}`}
                      />
                    </div>
                    <span className="w-full truncate text-center font-mono text-[8px]" style={{ color: "var(--a-faint)" }}>
                      {item.day.slice(5, 10)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <AdminEmptyState
              title="暂无学习活跃数据"
              description="学员完成练习或模考后，这里会自动生成每日活跃趋势。"
              icon={TrendingUp}
            />
          )}
          <div className="mt-3 flex items-center justify-between rounded-xl border px-3 py-2 text-[10px]" style={{ borderColor: "var(--a-border)", color: "var(--a-muted)" }}>
            <span>累计作答 {Number(analytics?.totals?.answeredTotal || 0)} 道次</span>
            <span>
              全站正确率{" "}
              {Number(analytics?.totals?.answeredTotal || 0) > 0
                ? Math.round((Number(analytics?.totals?.correctTotal || 0) / Number(analytics?.totals?.answeredTotal || 1)) * 1000) / 10
                : 0}
              %
            </span>
          </div>
        </AdminPanel>

        <AdminPanel
          title="四科掌握度"
          subtitle="按真实作答正确率对比数据结构、组成原理、操作系统与网络"
          icon={Gauge}
          action={<AdminBadge tone="sky">真实作答</AdminBadge>}
        >
          <div className="space-y-3.5">
            {subjectAccuracy.map((item) => (
              <div key={item.code}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                      {item.name}
                    </span>
                    <span className="text-[9px]" style={{ color: "var(--a-faint)" }}>
                      {item.answered} 次作答
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-black" style={{ color: item.rate >= 70 ? "#2f7d5d" : item.rate >= 50 ? "#b7791f" : "#b5473f" }}>
                    {item.rate}%
                  </span>
                </div>
                <div className="admin-progress" style={{ height: 6 }}>
                  <span style={{ width: `${Math.min(100, item.rate)}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border px-3 py-2.5 text-[10px] leading-relaxed" style={{ borderColor: "var(--a-border)", color: "var(--a-muted)" }}>
            正确率低于 60% 的科目建议在题库解析、课程中心与每日补给中优先补充基础题与易错点讲解。
          </div>
        </AdminPanel>
      </div>

      {/* Subject coverage + service cluster */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AdminPanel
          className="xl:col-span-2"
          title="408 核心学科题量覆盖"
          subtitle="数据结构、组成原理、操作系统与网络：统考真题 + AI 练习题库分布"
          icon={Layers}
          action={<AdminLink href="/admin/questions">题库运维</AdminLink>}
        >
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="admin-donut" style={{ background: donutBackground }}>
                <div className="admin-donut-content">
                  <span className="font-mono text-2xl font-black" style={{ color: "var(--a-text)" }}>
                    {subjectTotal}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "var(--a-faint)" }}>
                    题目总量
                  </span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold" style={{ color: "var(--a-text)" }}>
                  四科题量总覆盖
                </p>
                <p className="mt-0.5 text-[10px]" style={{ color: "var(--a-faint)" }}>
                  18 套统考真题 · 全量入库
                </p>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              {subjectCounts.map((subject) => {
                const percent = subjectTotal > 0 ? (subject.count / subjectTotal) * 100 : 0;
                return (
                  <div
                    key={subject.code}
                    className="rounded-2xl border p-3.5 transition-colors hover:border-sky-800/25"
                    style={{
                      borderColor: "var(--a-border)",
                      background: "color-mix(in srgb, var(--a-surface-solid) 55%, transparent)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: subject.color, boxShadow: `0 0 12px ${subject.color}66` }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                            {subject.name}
                          </p>
                          <p className="truncate text-[10px]" style={{ color: "var(--a-faint)" }}>
                            {subject.desc}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-mono text-sm font-black" style={{ color: "var(--a-text)" }}>
                          {subject.count}
                        </span>
                        <span className="ml-0.5 text-[9px] font-bold" style={{ color: "var(--a-faint)" }}>
                          题
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="admin-progress flex-1">
                        <span
                          className={subject.bar}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-9 text-right font-mono text-[10px] font-bold" style={{ color: "var(--a-faint)" }}>
                        {percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3"
            style={{
              borderColor: "var(--a-border)",
              background: "color-mix(in srgb, var(--a-sky) 5%, transparent)",
            }}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold" style={{ color: "var(--a-muted)" }}>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              题库已覆盖四大学科，含 846 道统考真题与 2083 道 AI 练习题
            </div>
            <Link
              href="/admin/questions"
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-sky-900 hover:text-sky-800 dark:text-sky-300"
            >
              查看试卷库 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </AdminPanel>

        <AdminPanel
          title="系统服务集群"
          subtitle="实时健康探测与连接状态"
          icon={Server}
          action={<AdminLink href="/admin/ai-config">配置模型</AdminLink>}
        >
          <div className="space-y-2.5">
            {services.map((service) => {
              const Icon = service.icon;
              const online = ["ONLINE", "CONNECTED"].includes(service.status);
              const toneClasses = {
                sky: "border-sky-800/20 bg-sky-800/10 text-sky-900 dark:text-sky-300",
                blue: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300",
                emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
                amber: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
              }[service.tone];

              return (
                <div
                  key={service.name}
                  className="flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition-colors hover:border-sky-800/25"
                  style={{
                    borderColor: "var(--a-border)",
                    background: "color-mix(in srgb, var(--a-surface-solid) 55%, transparent)",
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", toneClasses)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                        {service.name}
                      </p>
                      <p className="truncate text-[10px] font-mono" style={{ color: "var(--a-faint)" }}>
                        {service.sub}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cx(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-extrabold",
                      online
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                    )}
                  >
                    <span className={cx("h-1.5 w-1.5 rounded-full", online ? "bg-emerald-500" : "bg-amber-500")} />
                    {service.status}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                  集群健康度 {healthPercent}%
                </p>
                <p className="text-[10px]" style={{ color: "var(--a-faint)" }}>
                  最近探测 · 实时
                </p>
              </div>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-500/80" />
          </div>
        </AdminPanel>
      </div>

      {/* Recent activity + new users */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AdminPanel
          className="xl:col-span-2"
          title="全真考场最新交卷动态"
          subtitle="实时流水记录 · 最近 6 条"
          icon={FileCheck2}
          action={
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "var(--a-faint)" }}>
              <Clock className="h-3 w-3" />
              实时更新
            </span>
          }
          noPadding
        >
          {data?.recentSubmissions && data.recentSubmissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="admin-table min-w-[640px]">
                <thead>
                  <tr>
                    <th>交卷考生</th>
                    <th>试卷名称</th>
                    <th>实得分数</th>
                    <th>耗时</th>
                    <th>交卷时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSubmissions.slice(0, 6).map((sub) => {
                    const scorePercent =
                      sub.totalScore > 0 ? Math.min((sub.userScore / sub.totalScore) * 100, 100) : 0;
                    return (
                      <tr key={sub.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-800/10 text-[11px] font-black text-sky-900 dark:text-sky-200">
                              {(sub.nickname || sub.username || "考").charAt(0)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                                {sub.nickname || sub.username}
                              </p>
                              <p className="text-[10px]" style={{ color: "var(--a-faint)" }}>
                                @{sub.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className="max-w-[220px] truncate text-[11px] font-semibold" style={{ color: "var(--a-text)" }}>
                            {sub.testTitle}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--a-faint)" }}>
                            全真模拟 · 408 统考
                          </p>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-300">
                              {sub.userScore}
                            </span>
                            <span className="font-mono text-[10px]" style={{ color: "var(--a-faint)" }}>
                              / {sub.totalScore}
                            </span>
                          </div>
                          <div className="mt-1 w-24">
                            <div className="admin-progress" style={{ height: 4 }}>
                              <span className="bg-sky-700" style={{ width: `${scorePercent}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1 font-mono text-[11px]" style={{ color: "var(--a-muted)" }}>
                            <Clock className="h-3 w-3" />
                            {Math.round(sub.timeSpentSeconds / 60)} 分钟
                          </span>
                        </td>
                        <td>
                          <span className="font-mono text-[10px]" style={{ color: "var(--a-faint)" }}>
                            {sub.submitTime ? sub.submitTime.substring(0, 16).replace("T", " ") : "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState
              title="暂无交卷记录"
              description="学员完成全真模拟考试后，最新交卷动态会实时出现在这里。"
              icon={FileCheck2}
            />
          )}
        </AdminPanel>

        <AdminPanel
          title="最新注册学员"
          subtitle="近期加入备考的新同学"
          icon={GraduationCap}
          action={<AdminLink href="/admin/users">全部用户</AdminLink>}
        >
          {data?.recentUsers && data.recentUsers.length > 0 ? (
            <div className="space-y-2.5">
              {data.recentUsers.slice(0, 5).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition-colors hover:border-sky-800/25"
                  style={{
                    borderColor: "var(--a-border)",
                    background: "color-mix(in srgb, var(--a-surface-solid) 55%, transparent)",
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                      alt={u.nickname || u.username}
                      className="h-9 w-9 shrink-0 rounded-xl border border-[var(--a-border)] bg-sky-800/5"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                        {u.nickname || u.username}
                      </p>
                      <p className="truncate text-[10px]" style={{ color: "var(--a-faint)" }}>
                        {u.targetSchool || "未设置目标院校"} · {u.targetScore || 0} 分
                      </p>
                    </div>
                  </div>
                  <AdminBadge tone={u.status === 1 ? "emerald" : "rose"} dot>
                    {u.status === 1 ? "正常" : "禁用"}
                  </AdminBadge>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="暂无新学员"
              description="新注册的学员会展示在这里。"
              icon={Users}
            />
          )}

          <div
            className="mt-4 flex items-center justify-between rounded-2xl border px-4 py-3"
            style={{
              borderColor: "var(--a-border)",
              background: "color-mix(in srgb, var(--a-sky) 5%, transparent)",
            }}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold" style={{ color: "var(--a-muted)" }}>
              <Target className="h-3.5 w-3.5 text-sky-800" />
              今日新增 {todayNewUsers} 名学员
            </div>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-[10px] font-extrabold text-sky-900 hover:text-sky-800 dark:text-sky-300"
            >
              管理 <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </AdminPanel>
      </div>

      {/* Footer insight strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            icon: TrendingUp,
            title: "学员增长",
            value: `+${todayNewUsers} 今日新增`,
            desc: "持续跟踪注册转化与备考活跃度",
            tone: "text-sky-800",
          },
          {
            icon: Zap,
            title: "AI 调用",
            value: `${totalAiGradingCalls} 次累计`,
            desc: "主观题采分点精批与智能体特训",
            tone: "text-emerald-500",
          },
          {
            icon: CalendarDays,
            title: "题库运维",
            value: `${totalExamPapers} 套试卷`,
            desc: "2009 - 2026 年 408 统考全量覆盖",
            tone: "text-blue-500",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex items-center gap-3 rounded-2xl border px-4 py-3.5"
              style={{
                borderColor: "var(--a-border)",
                background: "var(--a-surface)",
              }}
            >
              <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500/5", item.tone)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--a-faint)" }}>
                  {item.title}
                </p>
                <p className="truncate text-[12px] font-extrabold" style={{ color: "var(--a-text)" }}>
                  {item.value}
                </p>
                <p className="truncate text-[10px]" style={{ color: "var(--a-faint)" }}>
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
