"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  Sparkles,
  Cpu,
  CheckCircle2,
  Clock,
  ArrowRight,
  Terminal,
  RefreshCw,
  Server,
  ShieldCheck,
  Workflow,
  Zap,
  FileCheck2,
  CircleDot,
} from "lucide-react";
import {
  AdminBadge,
  AdminPageHeader,
  AdminPanel,
  AdminStatCard,
  cx,
} from "@/components/admin/AdminUI";

export default function AdminAgentMonitorPage() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<string>("CHECKING");
  const [lastChecked, setLastChecked] = useState<string>("");
  const [overview, setOverview] = useState<any>(null);
  const [capabilities, setCapabilities] = useState<any>(null);

  const checkHealth = async () => {
    try {
      const res = await fetch("/ai-api/health");
      setHealthStatus(res.ok ? "ONLINE" : "OFFLINE");
    } catch {
      setHealthStatus("OFFLINE");
    } finally {
      setLastChecked(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    }
  };

  const fetchOverview = async () => {
    try {
      const token = localStorage.getItem("408_auth_token") || "";
      const res = await fetch("/api/admin/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) setOverview(json.data);
    } catch {
      // 保留静态兜底
    }
  };

  const fetchCapabilities = async () => {
    try {
      const res = await fetch("/pilot/agent/capabilities");
      if (res.ok) setCapabilities(await res.json());
    } catch {
      setCapabilities(null);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchOverview();
    fetchCapabilities();
  }, []);

  const runGradingSimulation = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/ai-api/api/ai/grade-subjective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: "2024_41",
          user_answer:
            "【算法思想】采用双指针法，从头尾分别向中间扫描。时间复杂度O(n)，空间复杂度O(1)。\nint findPivot(int A[], int n) { int i=0, j=n-1; while(i<j){ ... } return i; }",
          standard_answer: "标准双指针扫描算法，时间复杂度O(n)，空间复杂度O(1)。",
          max_score: 15.0,
          subject_code: "DS",
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const online = healthStatus === "ONLINE";

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow="AI 引擎监控"
        title="Python AI 备考智能体监控"
        description="监控 408 主观大题采分点评卷服务（FastAPI）与自主备考 Agent 任务流调度运行状态，实时验证 AI 引擎连通性。"
        icon={Activity}
        badge={
          <AdminBadge tone={online ? "emerald" : "rose"} dot>
            {online ? "引擎在线" : "引擎离线"}
          </AdminBadge>
        }
        actions={
          <button onClick={checkHealth} className="admin-btn admin-btn-ghost">
            <RefreshCw className="h-4 w-4 text-sky-800" />
            检查心跳
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="FastAPI 服务端口"
          value="8000"
          suffix="端口"
          icon={Server}
          tone={online ? "emerald" : "rose"}
          hint={lastChecked ? `最近心跳检测 ${lastChecked}` : "正在检测服务心跳..."}
          badge={<AdminBadge tone={online ? "emerald" : "rose"} dot>{healthStatus}</AdminBadge>}
        />
        <AdminStatCard
          label="主观题采分模型"
          value="408"
          suffix="规则"
          icon={FileCheck2}
          tone="sky"
          hint="解题思路 30% + 代码 50% + 复杂度 20%"
          badge={<AdminBadge tone="sky">双轨评分</AdminBadge>}
        />
        <AdminStatCard
          label="Agent 工作流"
          value={overview?.totalAiGradingCalls ?? "5"}
          suffix={overview ? "次 AI 调用" : "阶段"}
          icon={Workflow}
          tone="blue"
          hint="精讲 → 演练 → 阅卷 → 提升"
          badge={<AdminBadge tone="blue">可暂停恢复</AdminBadge>}
        />
        <AdminStatCard
          label="大模型调用链路"
          value={overview?.aiEngineStatus === "ONLINE" || online ? "就绪" : "等待"}
          icon={Zap}
          tone="amber"
          hint={`DeepSeek · OpenAI 兼容协议${overview?.avgExamScore != null ? ` · 全站均分 ${overview.avgExamScore}` : ""}`}
          badge={<AdminBadge tone="amber">实时热重载</AdminBadge>}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AdminPanel
          className="xl:col-span-2"
          title="实时智能体阅卷连通性测试"
          subtitle="向 FastAPI 评分服务发起一次 2024 年 408 第 41 题仿真评分"
          icon={Terminal}
          action={
            <button
              onClick={runGradingSimulation}
              disabled={testing}
              className="admin-btn admin-btn-primary admin-btn-sm disabled:opacity-50"
            >
              <Sparkles className={cx("h-3.5 w-3.5", testing && "animate-pulse")} />
              {testing ? "AI 引擎运算中..." : "触发测试评分"}
            </button>
          }
        >
          <div className="rounded-2xl border border-slate-800 bg-[#0a1022] p-4 shadow-inner">
            <div className="mb-3 flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                ai-engine / grade-subjective
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                <span className={cx("h-1.5 w-1.5 rounded-full bg-emerald-400", online && "admin-live-dot")} />
                {healthStatus}
              </span>
            </div>

            {testResult ? (
              <pre className="admin-scrollbar max-h-[320px] overflow-auto font-mono text-[11px] leading-relaxed text-slate-300">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            ) : (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-600/20 bg-sky-800/10 text-sky-300">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-300">等待触发仿真评分</p>
                  <p className="mt-1 max-w-sm text-[10px] leading-relaxed text-slate-500">
                    点击右上角「触发测试评分」，将调用 Python AI 引擎对主观题答案进行采分点级判分，并返回结构化评分结果。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              { label: "服务状态", value: healthStatus, icon: CircleDot },
              { label: "评分协议", value: "REST / JSON", icon: Cpu },
              { label: "安全校验", value: "CORS + JWT", icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
                  style={{ borderColor: "var(--a-border)", background: "color-mix(in srgb, var(--a-surface-solid) 55%, transparent)" }}
                >
                  <Icon className="h-3.5 w-3.5 text-sky-800" />
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--a-faint)" }}>
                      {item.label}
                    </p>
                    <p className="font-mono text-[10px] font-bold" style={{ color: "var(--a-text)" }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Agent 五阶段工作流"
          subtitle="自主备考任务流与评分链路"
          icon={Workflow}
          action={<AdminBadge tone="sky">任务流水线</AdminBadge>}
        >
          <div className="space-y-0">
            {[
              { step: "01", title: "考点精讲", desc: "定位薄弱知识点并生成讲解", icon: Sparkles },
              { step: "02", title: "变式演练", desc: "按掌握度推送针对性练习", icon: Zap },
              { step: "03", title: "主观阅卷", desc: "采分点级判分与扣分归因", icon: FileCheck2 },
              { step: "04", title: "错题复盘", desc: "沉淀错题本与薄弱点图谱", icon: RefreshCw },
              { step: "05", title: "能力提升", desc: "动态调整备考计划与目标", icon: Activity },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < 4 && (
                    <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-sky-800/20" />
                  )}
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-800/20 bg-sky-800/10 font-mono text-[9px] font-black text-sky-900 dark:text-sky-300">
                    {item.step}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-sky-800" />
                      <p className="text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                        {item.title}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-relaxed" style={{ color: "var(--a-faint)" }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                  流水线运行正常
                </p>
                <p className="text-[10px]" style={{ color: "var(--a-faint)" }}>
                  支持暂停、恢复与薄弱点归因生成
                </p>
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel
        title="Agent Runtime 与 MCP 工具"
        subtitle="真实读取 408 Pilot 运行时契约与工具白名单"
        icon={Workflow}
        action={
          <AdminBadge tone={capabilities ? "emerald" : "amber"} dot>
            {capabilities ? "运行时在线" : "运行时离线"}
          </AdminBadge>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--a-border)", background: "var(--a-bg)" }}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--a-faint)" }}>
              Runtime
            </p>
            <p className="mt-2 font-mono text-sm font-black" style={{ color: "var(--a-text)" }}>
              {capabilities?.runtime || "planner-executor-validator"}
            </p>
            <p className="mt-1 text-[10px]" style={{ color: "var(--a-muted)" }}>
              最大迭代 {capabilities?.max_iterations ?? 12} 步 · 轨迹 {capabilities?.trace_enabled ? "已开启" : "未开启"}
            </p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--a-border)", background: "var(--a-bg)" }}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--a-faint)" }}>
              Memory Layers
            </p>
            <p className="mt-2 text-sm font-black" style={{ color: "var(--a-text)" }}>
              {(capabilities?.memory || ["working", "conversation", "semantic", "learning_state"]).join(" · ")}
            </p>
            <p className="mt-1 text-[10px]" style={{ color: "var(--a-muted)" }}>
              工作记忆 + 会话记忆 + 语义记忆 + 学习状态
            </p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--a-border)", background: "var(--a-bg)" }}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--a-faint)" }}>
              MCP Tools
            </p>
            <p className="mt-2 text-sm font-black" style={{ color: "var(--a-text)" }}>
              search_408_question_bank
            </p>
            <p className="text-sm font-black" style={{ color: "var(--a-text)" }}>
              ask_kaoyan_tutor
            </p>
            <p className="mt-1 text-[10px]" style={{ color: "var(--a-muted)" }}>
              stdio MCP server · 题库检索 + 辅导 Agent
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--a-faint)" }}>
            Agent 工具白名单
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {(capabilities?.tools || []).slice(0, 12).map((tool: any) => (
              <div
                key={tool.name}
                className="flex items-start justify-between gap-2 rounded-xl border px-3 py-2.5"
                style={{ borderColor: "var(--a-border)", background: "color-mix(in srgb, var(--a-surface-solid) 55%, transparent)" }}
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10px] font-extrabold" style={{ color: "var(--a-text)" }}>
                    {tool.name}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[9px]" style={{ color: "var(--a-faint)" }}>
                    {tool.description}
                  </p>
                </div>
                <AdminBadge tone={tool.read_only ? "emerald" : "amber"}>
                  {tool.read_only ? "只读" : "写入"}
                </AdminBadge>
              </div>
            ))}
          </div>
          {!capabilities && (
            <p className="mt-3 text-[10px]" style={{ color: "var(--a-faint)" }}>
              408 Pilot 运行时未连接，请确认 8010 服务已启动。
            </p>
          )}
        </div>
      </AdminPanel>
    </div>
  );
}
