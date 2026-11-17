"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Database,
  DatabaseBackup,
  Download,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  Server,
  Bot,
  Cpu,
  CheckCircle2,
  XCircle,
  Activity,
  Users,
  BookOpen,
  FileCheck2,
  ArrowUpRight,
  ShieldCheck,
  Layers,
  Settings2,
} from "lucide-react";
import {
  AdminBadge,
  AdminPageHeader,
  AdminPanel,
  AdminSpinner,
  AdminStatCard,
} from "@/components/admin/AdminUI";

interface AdminStats {
  totalUsers: number;
  totalQuestions: number;
  totalExamPapers: number;
  totalTestSubmissions: number;
  totalAiGradingCalls: number;
  avgExamScore: number;
  aiEngineStatus: string;
  javaBackendStatus: string;
}

interface HealthState {
  java: "ONLINE" | "OFFLINE";
  python: "ONLINE" | "OFFLINE";
  pilot: "ONLINE" | "OFFLINE";
  mysql: "ONLINE" | "OFFLINE";
}

const EMPTY_HEALTH: HealthState = {
  java: "OFFLINE",
  python: "OFFLINE",
  pilot: "OFFLINE",
  mysql: "OFFLINE",
};

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "\uFEFF";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) =>
    `"${String(value ?? "")
      .replace(/"/g, '""')
      .replace(/\r?\n/g, " ")}"`;
  return (
    "\uFEFF" +
    [
      headers.map(escape).join(","),
      ...rows.map((row) => headers.map((key) => escape(row[key])).join(",")),
    ].join("\r\n")
  );
}

export default function AdminOpsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<HealthState>(EMPTY_HEALTH);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const token = () => user?.token || localStorage.getItem("408_auth_token") || "";

  const fetchStats = async () => {
    const res = await fetch("/api/admin/dashboard/stats", {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const json = await res.json();
    if (json.code === 200 && json.data) {
      setStats(json.data);
      return true;
    }
    return false;
  };

  const probeHealth = async () => {
    const next: HealthState = { ...EMPTY_HEALTH };
    try {
      const res = await fetch("/ai-api/health");
      next.python = res.ok ? "ONLINE" : "OFFLINE";
    } catch {
      next.python = "OFFLINE";
    }
    try {
      const res = await fetch("/pilot/health");
      next.pilot = res.ok ? "ONLINE" : "OFFLINE";
    } catch {
      next.pilot = "OFFLINE";
    }
    try {
      next.java = (await fetchStats()) ? "ONLINE" : "OFFLINE";
      next.mysql = next.java;
    } catch {
      next.java = "OFFLINE";
      next.mysql = "OFFLINE";
    }
    setHealth(next);
  };

  const refreshAll = async () => {
    setLoading(true);
    setMessage("");
    await Promise.allSettled([fetchStats(), probeHealth()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  const exportUsers = async () => {
    setBusy("users");
    setMessage("");
    try {
      const res = await fetch("/api/admin/users?pageNum=1&pageSize=1000", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      const list = json.data?.list || [];
      if (!list.length) throw new Error("没有可导出的用户数据");
      const rows = list.map((item: any) => ({
        ID: item.id,
        用户名: item.username,
        昵称: item.nickname || "",
        角色: item.roleCode === "ROLE_ADMIN" ? "管理员" : "学员",
        账号状态: item.status === 1 ? "正常" : "禁用",
        目标院校: item.targetSchool || "",
        目标分数: item.targetScore ?? "",
        备考阶段: item.prepStage || "",
        注册时间: item.createdAt || "",
      }));
      downloadFile("408用户账号清单.csv", toCsv(rows), "text/csv;charset=utf-8");
      setMessage(`已导出 ${rows.length} 个用户账号`);
    } catch (err: any) {
      setMessage(`用户导出失败：${err.message}`);
    } finally {
      setBusy("");
    }
  };

  const exportPapers = async () => {
    setBusy("papers");
    setMessage("");
    try {
      const res = await fetch("/api/admin/questions/papers", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      const list = json.data || [];
      if (!list.length) throw new Error("没有可导出的试卷数据");
      const rows = list.map((item: any) => ({
        试卷ID: item.id,
        年份: item.year,
        试卷名称: item.title,
        题目数量: item.questionCount,
        总分: item.totalScore,
        时长分钟: item.durationMinutes,
        试卷类型: item.paperType || "",
        状态: item.status,
      }));
      downloadFile("408试卷清单.csv", toCsv(rows), "text/csv;charset=utf-8");
      setMessage(`已导出 ${rows.length} 套试卷`);
    } catch (err: any) {
      setMessage(`试卷导出失败：${err.message}`);
    } finally {
      setBusy("");
    }
  };

  const exportQuestions = async () => {
    setBusy("questions");
    setMessage("正在分批导出题库，请稍候...");
    try {
      const collected: any[] = [];
      let page = 1;
      let total = 0;
      do {
        const res = await fetch(
          `/api/admin/questions?pageNum=${page}&pageSize=100`,
          { headers: { Authorization: `Bearer ${token()}` } }
        );
        const json = await res.json();
        if (json.code !== 200) throw new Error(json.message || "题库读取失败");
        const list = json.data?.list || [];
        total = Number(json.data?.total || 0);
        collected.push(...list);
        if (list.length < 100) break;
        page += 1;
        setMessage(`正在导出题库：${collected.length}/${total} 题...`);
      } while (collected.length < total && page <= 40);

      if (!collected.length) throw new Error("没有可导出的题目数据");
      const rows = collected.map((item: any) => ({
        题目ID: item.id,
        年份: item.year ?? "",
        科目: item.subjectCode ?? "",
        题型: item.questionType ?? "",
        难度: item.difficulty ?? "",
        章节: item.chapterName ?? "",
        题干: item.stem ?? "",
        标准答案: item.answer ?? "",
        解析: item.explanation ?? "",
        分值: item.score ?? "",
      }));
      downloadFile("408题库全量导出.csv", toCsv(rows), "text/csv;charset=utf-8");
      setMessage(`已导出 ${rows.length} 道题目`);
    } catch (err: any) {
      setMessage(`题库导出失败：${err.message}`);
    } finally {
      setBusy("");
    }
  };

  const exportAnalytics = async () => {
    setBusy("analytics");
    setMessage("");
    try {
      const res = await fetch("/api/admin/analytics/overview", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (json.code !== 200) throw new Error(json.message || "分析数据读取失败");
      downloadFile(
        "408全站学习分析.json",
        JSON.stringify(json.data, null, 2),
        "application/json;charset=utf-8"
      );
      setMessage("已导出全站学习分析 JSON");
    } catch (err: any) {
      setMessage(`分析导出失败：${err.message}`);
    } finally {
      setBusy("");
    }
  };

  const serviceRows = [
    {
      name: "Java 业务网关",
      detail: "Spring Boot · :8080",
      status: health.java,
      icon: Server,
    },
    {
      name: "Python AI 引擎",
      detail: "FastAPI · :8000",
      status: health.python,
      icon: Bot,
    },
    {
      name: "408 Pilot Agent",
      detail: "多智能体运行时 · :8010",
      status: health.pilot,
      icon: Cpu,
    },
    {
      name: "MySQL 核心数据库",
      detail: "题库 / 用户 / 模考数据 · :3306",
      status: health.mysql,
      icon: Database,
    },
  ];

  const exportItems = [
    {
      key: "users",
      title: "用户账号清单",
      desc: "导出全部账号、角色、状态与备考档案，便于线下审核与备份。",
      icon: Users,
      action: exportUsers,
      format: "CSV",
    },
    {
      key: "questions",
      title: "全量题库",
      desc: "分批导出 2929 道题的题干、答案、解析、章节与分值。",
      icon: BookOpen,
      action: exportQuestions,
      format: "CSV",
    },
    {
      key: "papers",
      title: "试卷清单",
      desc: "导出 18 套统考真题与 AI 练习卷的题量、总分与时长。",
      icon: Layers,
      action: exportPapers,
      format: "CSV",
    },
    {
      key: "analytics",
      title: "全站学习分析",
      desc: "导出作答量、正确率、失分章节与高频错题的原始聚合数据。",
      icon: FileJson,
      action: exportAnalytics,
      format: "JSON",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow="数据与运维"
        title="数据导出与平台运维"
        description="集中处理账号、题库、试卷与学习分析的数据导出，实时探测 Java、Python、408 Pilot 与 MySQL 的服务健康度，作为管理端的运营与运维工作台。"
        icon={DatabaseBackup}
        badge={<AdminBadge tone="sky" dot>管理端工作台</AdminBadge>}
        actions={
          <button onClick={refreshAll} disabled={loading} className="admin-btn admin-btn-ghost disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            刷新状态
          </button>
        }
      />

      {loading && !stats ? (
        <AdminSpinner label="正在读取平台数据与探测服务状态..." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard
              label="注册账号"
              value={stats?.totalUsers ?? 0}
              suffix="人"
              icon={Users}
              tone="sky"
              hint="含学员与管理员账号"
              badge={<AdminBadge tone="sky">账号中心</AdminBadge>}
            />
            <AdminStatCard
              label="题库总量"
              value={stats?.totalQuestions ?? 0}
              suffix="题"
              icon={BookOpen}
              tone="blue"
              hint={`${stats?.totalExamPapers ?? 0} 套试卷`}
              badge={<AdminBadge tone="blue">可导出</AdminBadge>}
            />
            <AdminStatCard
              label="模考交卷"
              value={stats?.totalTestSubmissions ?? 0}
              suffix="人次"
              icon={FileCheck2}
              tone="amber"
              hint={`全站均分 ${stats?.avgExamScore ?? 0} 分`}
              badge={<AdminBadge tone="amber">全真考场</AdminBadge>}
            />
            <AdminStatCard
              label="AI 调用"
              value={stats?.totalAiGradingCalls ?? 0}
              suffix="次"
              icon={Bot}
              tone="emerald"
              hint="主观题精批与智能体特训"
              badge={<AdminBadge tone="emerald">引擎在线</AdminBadge>}
            />
          </div>

          {message && (
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] px-4 py-3 text-[11px] font-bold text-sky-700 dark:text-sky-300">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <AdminPanel
              className="xl:col-span-2"
              title="数据导出中心"
              subtitle="所有导出均使用当前后台真实数据，不包含前端静态占位"
              icon={Download}
              action={<AdminBadge tone="sky">CSV / JSON</AdminBadge>}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {exportItems.map((item) => {
                  const Icon = item.icon;
                  const running = busy === item.key;
                  return (
                    <div
                      key={item.key}
                      className="rounded-2xl border p-4 transition-colors hover:border-sky-800/25"
                      style={{ borderColor: "var(--a-border)", background: "color-mix(in srgb, var(--a-surface-solid) 55%, transparent)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-800/15 bg-sky-800/5 text-sky-800 dark:text-sky-300">
                          <Icon className="h-4 w-4" />
                        </span>
                        <AdminBadge tone="slate">{item.format}</AdminBadge>
                      </div>
                      <p className="mt-3 text-[12px] font-extrabold" style={{ color: "var(--a-text)" }}>
                        {item.title}
                      </p>
                      <p className="mt-1 text-[10px] leading-relaxed" style={{ color: "var(--a-muted)" }}>
                        {item.desc}
                      </p>
                      <button
                        onClick={item.action}
                        disabled={!!busy}
                        className="admin-btn admin-btn-primary admin-btn-sm mt-3 w-full disabled:opacity-50"
                      >
                        {running ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        {running ? "正在导出..." : "立即导出"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </AdminPanel>

            <AdminPanel
              title="服务健康探测"
              subtitle="实时检查四个核心服务的可用性"
              icon={Activity}
              action={
                <AdminBadge tone={Object.values(health).every((item) => item === "ONLINE") ? "emerald" : "amber"} dot>
                  {Object.values(health).filter((item) => item === "ONLINE").length}/4 在线
                </AdminBadge>
              }
            >
              <div className="space-y-2.5">
                {serviceRows.map((service) => {
                  const Icon = service.icon;
                  const online = service.status === "ONLINE";
                  return (
                    <div
                      key={service.name}
                      className="flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3"
                      style={{ borderColor: "var(--a-border)", background: "color-mix(in srgb, var(--a-surface-solid) 55%, transparent)" }}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${online ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-rose-500/10 text-rose-500"}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                            {service.name}
                          </p>
                          <p className="truncate text-[9px]" style={{ color: "var(--a-faint)" }}>
                            {service.detail}
                          </p>
                        </div>
                      </div>
                      <span className={`flex shrink-0 items-center gap-1 text-[9px] font-extrabold ${online ? "text-emerald-600 dark:text-emerald-300" : "text-rose-500"}`}>
                        {online ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {online ? "在线" : "离线"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                服务离线时请先检查对应端口进程，再查看 `spring-boot.log`、`uvicorn.log` 与 408 Pilot 日志。
              </div>
            </AdminPanel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <AdminPanel
              className="xl:col-span-2"
              title="运维快捷入口"
              subtitle="从数据工作台直接进入高频管理模块"
              icon={Settings2}
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  { title: "用户权限管理", desc: "账号启停、角色与密码", href: "/admin/users", icon: ShieldCheck },
                  { title: "题库与试卷运维", desc: "新增、编辑、删除与预览", href: "/admin/questions", icon: BookOpen },
                  { title: "公共知识库", desc: "上传、切片与下架资料", href: "/admin/knowledge", icon: DatabaseBackup },
                  { title: "全站学习分析", desc: "正确率、失分章节与错题", href: "/admin/analytics", icon: Activity },
                  { title: "AI 模型配置", desc: "API Key、模型与协议地址", href: "/admin/ai-config", icon: Cpu },
                  { title: "AI 引擎监控", desc: "Agent 运行时与 MCP 工具", href: "/admin/agent-monitor", icon: Bot },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors hover:border-sky-800/25"
                      style={{ borderColor: "var(--a-border)", background: "color-mix(in srgb, var(--a-surface-solid) 55%, transparent)" }}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-800/5 text-sky-800 dark:text-sky-300">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                          {item.title}
                        </p>
                        <p className="truncate text-[9px]" style={{ color: "var(--a-faint)" }}>
                          {item.desc}
                        </p>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-sky-700" />
                    </Link>
                  );
                })}
              </div>
            </AdminPanel>

            <AdminPanel
              title="数据口径说明"
              subtitle="导出与看板使用同一套服务端口径"
              icon={FileSpreadsheet}
            >
              <div className="space-y-3 text-[10px] leading-relaxed" style={{ color: "var(--a-muted)" }}>
                <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--a-border)" }}>
                  <p className="font-extrabold" style={{ color: "var(--a-text)" }}>用户清单</p>
                  <p className="mt-1">来自 `sys_user` 与角色表，管理员不包含备考画像。</p>
                </div>
                <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--a-border)" }}>
                  <p className="font-extrabold" style={{ color: "var(--a-text)" }}>题库与试卷</p>
                  <p className="mt-1">来自 `exam_question` / `exam_paper`，与题库运维页面实时一致。</p>
                </div>
                <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--a-border)" }}>
                  <p className="font-extrabold" style={{ color: "var(--a-text)" }}>学习分析</p>
                  <p className="mt-1">来自真实作答、模考与错题流水，不包含静态演示占位。</p>
                </div>
              </div>
            </AdminPanel>
          </div>
        </>
      )}
    </div>
  );
}
