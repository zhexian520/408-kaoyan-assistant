"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  Bot, 
  Sparkles, 
  Send, 
  ArrowRight, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  BookOpen, 
  FileCheck2, 
  Award,
  Layers,
  HelpCircle, 
  Clock,
  Bookmark,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Printer,
  Download,
  FileText,
  Brain,
  AlertTriangle
} from "lucide-react";
import MarkdownView from "@/components/MarkdownView";
import TopicVisual from "@/components/TopicVisual";
import KatexFormula from "@/components/KatexFormula";
import ExamAnswerSheetModal from "@/components/ExamAnswerSheetModal";

interface StageContent {
  is_real_ai?: boolean;

  // Step 1
  topic?: string;
  subject?: string;
  core_concepts?: Array<{ title: string; detail: string }>;
  recommended_flow?: string;

  // Step 2
  instruction?: string;
  questions?: Array<{
    q_id: string;
    type: string;
    stem: string;
    options?: Array<{ key: string; text: string }>;
    answer?: string;
    score: number;
    explanation?: string;
  }>;

  // Step 3
  score?: number;
  total_score?: number;
  accuracy?: string;
  diagnostic_summary?: string;
  weak_points?: string[];
  question_evals?: Array<{
    q_id: string;
    earned: number;
    is_correct: boolean;
    comment: string;
  }>;
  next_action_tip?: string;

  // Step 4
  title?: string;
  drill_questions?: Array<{
    id: string;
    year: number;
    number: number;
    score: number;
    type: string;
    subject: string;
    chapter: string;
    stem: string;
    options?: Array<{ key: string; text: string }>;
    answer: string;
    explanation: string;
  }>;
  drill_tip?: string;

  // Step 5
  overall_status?: string;
  study_efficiency?: string;
  accomplished_steps?: string[];
  weakness_advice?: string;
  next_recommended_topic?: string;
  markdown_report?: string;
}

interface SessionData {
  session_id: number;
  title: string;
  current_stage: string;
  stage_name: string;
  difficulty_level: string;
  stage_content: StageContent;
  progress_percent: number;
  is_paused: boolean;
  is_completed: boolean;
}

const PRESET_TOPICS = [
  { label: "计组: Cache 直接映射与组相联映射", sub: "co", prompt: "带我系统复习计算机组成原理 Cache 映射机制（直接映射、组相联计算与Tag比较器）" },
  { label: "操作系统: 虚拟内存与页面置换算法", sub: "os", prompt: "带我系统复习操作系统虚拟内存分页机制、TLB 快表与页面置换算法（FIFO、LRU、Clock）" },
  { label: "计网: TCP 滑动窗口与四阶段拥塞控制", sub: "cn", prompt: "带我系统复习计算机网络 TCP 拥塞控制四阶段（慢开始、拥塞避免、快重传、快恢复）" },
  { label: "数据结构: 平衡二叉树与图的拓扑排序", sub: "ds", prompt: "带我系统复习数据结构平衡二叉树（AVL）LL/RR/LR/RL旋转与图的拓扑排序算法" },
];

const STAGES = [
  { key: "KNOWLEDGE_EXPLAIN", name: "考点精讲", icon: BookOpen },
  { key: "PRACTICE_GEN", name: "针对性出题", icon: HelpCircle },
  { key: "GRADING", name: "智能判分", icon: FileCheck2 },
  { key: "TRUE_EXAM_DRILL", name: "真题实战", icon: Layers },
  { key: "SUMMARY_REPORT", name: "复盘报告", icon: Award },
];

export default function AgentPage() {
  const { user } = useAuth();
  const authToken = () => user?.token || (typeof window !== "undefined" ? localStorage.getItem("408_auth_token") || "" : "");
  const [instruction, setInstruction] = useState("");
  const [targetSubject, setTargetSubject] = useState("co");
  const [pointPrefilled, setPointPrefilled] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);

  // 用户在 Step 2 的作答状态
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  // Step 4 真题作答展开控制
  const [drillAnswers, setDrillAnswers] = useState<Record<string, string>>({});
  const [drillExpanded, setDrillExpanded] = useState<Record<string, boolean>>({});

  const [savedNotesSuccess, setSavedNotesSuccess] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [inspectRecordId, setInspectRecordId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const point = new URLSearchParams(window.location.search).get("point");
    if (!point) return;
    const text = point.toLowerCase();
    const inferred = /数据结构|顺序表|链表|栈|队列|二叉树|树|图|排序|查找|哈希|kmp|avl|b树|红黑树/.test(text)
      ? "ds"
      : /组成|计组|cache|指令|流水线|补码|浮点|cpu|总线|中断/.test(text)
      ? "co"
      : /操作系统|进程|线程|分页|页表|调度|死锁|文件系统|虚拟内存/.test(text)
      ? "os"
      : /网络|tcp|udp|ip|子网|路由|拥塞|协议/.test(text)
      ? "cn"
      : "ds";
    setTargetSubject(inferred);
    setInstruction(`请系统讲解【${point}】的考点精髓、核心公式、常见陷阱，并配几道例题巩固。`);
    setPointPrefilled(point);
  }, []);

  const handlePrintReport = () => {
    window.print();
  };

  const startAgentFlow = async (text: string, sub: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setSession(null);
    setPracticeAnswers({});
    setDrillAnswers({});
    try {
      const res = await fetch("/ai-api/api/ai/agent/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.userId || 2,
          instruction: text,
          target_subject: sub || targetSubject,
          difficulty: difficulty,
        }),
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setSession(json.data);
      }
    } catch (err) {
      console.error("启动 Agent 失败:", err);
      alert("启动智能体失败，请确认 Python 服务已开启 (port 8000)");
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async (action: string = "NEXT_STEP") => {
    if (!session) return;
    setLoading(true);
    try {
      const userAnsString = Object.entries(practiceAnswers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");

      const res = await fetch("/ai-api/api/ai/agent/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          action: action,
          user_response: userAnsString,
        }),
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setSession(json.data);
      }
    } catch (err) {
      console.error("Agent推进失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToNotes = async () => {
    if (!session || !session.stage_content) return;
    try {
      await fetch("/api/user/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken()}`
        },
        body: JSON.stringify({
          title: `【Agent复习复盘】${instruction.slice(0, 30)}`,
          subjectCode: targetSubject,
          contentMd: session.stage_content.markdown_report || `## 复习报告\n${session.stage_content.weakness_advice}`,
          excerptSource: "408 AI 备考智能体全闭环诊断",
          tagsJson: JSON.stringify(["Agent复盘", targetSubject.toUpperCase()])
        })
      });
      setSavedNotesSuccess(true);
      setTimeout(() => setSavedNotesSuccess(false), 2500);
    } catch (e) {
      console.error("存入笔记失败:", e);
    }
  };

  const handleCopyReport = () => {
    if (session?.stage_content?.markdown_report) {
      navigator.clipboard.writeText(session.stage_content.markdown_report);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 头部介绍横幅 (优雅白底紧凑卡片，去除刺眼深紫黑长条) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                    408 全自主闭环备考智能体
                  </h1>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900 font-bold">
                    DeepSeek 真实驱动
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  知识精讲 → 针对性生成自测 → 采分点批阅分析 → 匹配历年统考真题巩固 → 输出复盘总结
                </p>
                {pointPrefilled && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                    <Sparkles className="h-3 w-3" />
                    已从知识图谱/课程中心自动填入：{pointPrefilled}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 快捷目标预设 */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
          <span className="text-xs text-slate-400 block mb-2 font-medium">一键启动热门考点专项突破：</span>
          <div className="flex flex-wrap gap-2">
            {PRESET_TOPICS.map((pt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setInstruction(pt.prompt);
                  setTargetSubject(pt.sub);
                  startAgentFlow(pt.prompt, pt.sub);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 transition-all cursor-pointer"
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 指令输入栏 */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="输入自然语言指令，如：'带我系统复习数据结构并查集与最小生成树'..."
            className="flex-1 w-full text-xs sm:text-sm px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all outline-hidden"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={targetSubject}
              onChange={(e) => setTargetSubject(e.target.value)}
              className="text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2.5 border-none cursor-pointer"
            >
              <option value="ds">数据结构</option>
              <option value="co">组成原理</option>
              <option value="os">操作系统</option>
              <option value="cn">计算机网络</option>
            </select>

            <button
              onClick={() => startAgentFlow(instruction, targetSubject)}
              disabled={loading || !instruction.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? "Agent 思考调度中..." : "启动 Agent 任务"}
            </button>
          </div>
        </div>
      </div>

      {/* 未启动时的五步闭环说明 */}
      {!session && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const descriptions: Record<string, string> = {
                KNOWLEDGE_EXPLAIN: "建立概念框架、核心公式与易错边界",
                PRACTICE_GEN: "围绕薄弱点生成针对性自测题",
                GRADING: "按 408 采分点逐题批阅与归因",
                TRUE_EXAM_DRILL: "匹配历年统考真题进行实战巩固",
                SUMMARY_REPORT: "输出复盘报告与下一步行动建议",
              };
              return (
                <div
                  key={stage.key}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[10px] font-black text-slate-200 dark:text-zinc-700">
                      0{idx + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xs font-black text-slate-900 dark:text-zinc-100">
                    {stage.name}
                  </h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                    {descriptions[stage.key]}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 px-4 py-3 text-xs text-indigo-800 dark:border-indigo-900 dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-purple-950/20 dark:text-indigo-300">
            从课程中心、知识图谱或错题本跳转进入时，系统会自动带入当前考点，Agent 会沿着这五步一路带你走完，不需要自己拼学习流程。
          </div>
        </div>
      )}

      {/* 智能体运行态面板 */}
      {session && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* 5-Step 流程进度状态横幅 */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping"></span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                  {session.title}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  进度: {session.progress_percent}%
                </span>
              </div>

              {/* 智能体控制操作 */}
              <div className="flex items-center gap-2">
                {session.is_paused ? (
                  <button
                    onClick={() => handleNextStep("RESUME")}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white cursor-pointer"
                  >
                    <Play className="w-3 h-3" /> 继续任务
                  </button>
                ) : (
                  <button
                    onClick={() => handleNextStep("PAUSE")}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 cursor-pointer"
                  >
                    <Pause className="w-3 h-3" /> 暂停
                  </button>
                )}
                <button
                  onClick={() => startAgentFlow(instruction, targetSubject)}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> 重新开始
                </button>
              </div>
            </div>

            {/* 步骤条 */}
            <div className="grid grid-cols-5 gap-2 pt-2">
              {STAGES.map((st, i) => {
                const Icon = st.icon;
                const isCurrent = session.current_stage === st.key;
                const isPassed = session.progress_percent >= (i + 1) * 20;

                return (
                  <div
                    key={st.key}
                    className={`flex flex-col items-center p-2 rounded-xl text-center border transition-all ${
                      isCurrent
                        ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-600 font-bold shadow-sm"
                        : isPassed
                        ? "bg-zinc-50 dark:bg-zinc-800/40 border-emerald-300 dark:border-emerald-800 text-emerald-600"
                        : "border-transparent text-zinc-400"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[11px]">{st.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 阶段 1: 考点深度精讲视图 (全新美化卡片流) */}
          {session.current_stage === "KNOWLEDGE_EXPLAIN" && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              {/* 头部考点定位与导航 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                    1
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-zinc-100">
                        考点核心精讲与高频避坑
                      </h3>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold border border-indigo-200/80">
                        408 核心考向
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                      专项专题：<strong className="text-slate-800 dark:text-zinc-200">{session.stage_content.topic}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleNextStep("NEXT_STEP")}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>{loading ? "AI 正在量身出题..." : "进入自测演练 →"}</span>
                </button>
              </div>

              {/* 考点可视化 + 学习路径 + 公式速查 */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <TopicVisual
                  subject={targetSubject}
                  topic={session.stage_content.topic}
                  className="min-h-[220px]"
                />
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  <h4 className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-zinc-100">
                    <Brain className="h-3.5 w-3.5 text-indigo-600" />
                    本节学习路径
                  </h4>
                  <ol className="mt-2.5 space-y-2">
                    {(session.stage_content.core_concepts || []).map((concept, index) => (
                      <li key={concept.title} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-zinc-300">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[9px] font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {index + 1}
                        </span>
                        <span className="leading-relaxed">{concept.title}</span>
                      </li>
                    ))}
                    <li className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-zinc-300">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[9px] font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        ✓
                      </span>
                      <span className="leading-relaxed">完成针对性自测，检验考点掌握度</span>
                    </li>
                  </ol>

                  {(() => {
                    const formulas = (session.stage_content.core_concepts || [])
                      .flatMap((concept) => concept.detail.match(/\$[^$]{2,90}\$/g) || [])
                      .slice(0, 5);
                    if (formulas.length === 0) return null;
                    return (
                      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-zinc-800">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                          核心公式速查
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {formulas.map((formula, index) => (
                            <div
                              key={`${formula}-${index}`}
                              className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-2 py-1 dark:border-indigo-900 dark:bg-indigo-950/30"
                            >
                              <KatexFormula math={formula} displayMode={false} className="text-[11px]" />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 3 大核心知识维度卡片 (纵向/响应式展开，避免窄列挤压) */}
              <div className="space-y-4">
                {session.stage_content.core_concepts?.map((cc, idx) => {
                  const badges = [
                    { num: "01", label: "底层机理与核心定义", icon: BookOpen, color: "border-l-indigo-500 text-indigo-700 dark:text-indigo-300" },
                    { num: "02", label: "核心计算模型与推导公式", icon: Sparkles, color: "border-l-blue-500 text-blue-700 dark:text-blue-300" },
                    { num: "03", label: "408 统考高频陷阱与防踩坑指南", icon: AlertTriangle, color: "border-l-amber-500 text-amber-800 dark:text-amber-300" }
                  ];
                  const currentBadge = badges[idx % badges.length];
                  const BadgeIcon = currentBadge.icon;

                  return (
                    <div 
                      key={idx} 
                      className={`p-5 sm:p-6 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/80 border-l-4 ${currentBadge.color.split(" ")[0]} space-y-3 shadow-xs hover:border-slate-300 transition-all`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-zinc-700/50">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 shadow-2xs border border-slate-200/60 dark:border-zinc-700">
                            #{currentBadge.num}
                          </span>
                          <h4 className="font-black text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <BadgeIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            {cc.title}
                          </h4>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400">
                          {currentBadge.label}
                        </span>
                      </div>

                      <div className="text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-zinc-300">
                        <MarkdownView content={cc.detail} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 底部联动提示与行动呼唤 */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200">
                  <Brain className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{session.stage_content.recommended_flow || "考点精讲研读完毕！点击右侧开始自测，检验学习成效。"}</span>
                </div>
                <button
                  onClick={() => handleNextStep("NEXT_STEP")}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{loading ? "AI 动态出题中..." : "开始针对性自测 →"}</span>
                </button>
              </div>
            </div>
          )}

          {/* 阶段 2: 针对性自测视图 */}
          {session.current_stage === "PRACTICE_GEN" && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                      Step 2 · 针对性自测生成
                    </h3>
                    <p className="text-xs text-zinc-400">DeepSeek 已动态生成 3 道测试题检验考点掌握深度</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {session.stage_content.questions?.map((q, idx) => (
                  <div key={q.q_id} className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs px-2 py-0.5 rounded bg-indigo-600 text-white">
                        第 {idx + 1} 题 ({q.score}分)
                      </span>
                      <span className="text-xs text-zinc-500 font-medium">
                        {q.type === "choice" ? "单选题" : "综合应用题"}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      <MarkdownView content={q.stem} />
                    </div>

                    {q.type === "choice" && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {q.options.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setPracticeAnswers(prev => ({ ...prev, [q.q_id]: opt.key }))}
                            className={`flex items-start gap-2 p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              practiceAnswers[q.q_id] === opt.key
                                ? "bg-indigo-600 text-white font-bold border-indigo-600 shadow-sm"
                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            <span className="w-5 h-5 rounded flex items-center justify-center font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] shrink-0 mt-0.5">
                              {opt.key}
                            </span>
                            <div className="flex-1">
                              <MarkdownView content={opt.text} />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type !== "choice" && (
                      <textarea
                        rows={4}
                        value={practiceAnswers[q.q_id] || ""}
                        onChange={(e) => setPracticeAnswers(prev => ({ ...prev, [q.q_id]: e.target.value }))}
                        placeholder="请在此输入您的设计思想及伪代码算法思路..."
                        className="w-full text-xs p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono outline-hidden focus:border-indigo-500"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleNextStep("NEXT_STEP")}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {loading ? "Agent 智能批阅诊断中..." : "提交作答并让 Agent 智能诊断 →"}
                </button>
              </div>
            </div>
          )}

          {/* 阶段 3: 判分与错因分析视图 */}
          {session.current_stage === "GRADING" && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                      Step 3 · 智能批改与薄弱点诊断
                    </h3>
                    <p className="text-xs text-zinc-400">错题已自动录入【个人错题本】</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-emerald-600">
                    {session.stage_content.score} / {session.stage_content.total_score} 分
                  </span>
                  <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 px-2 py-1 rounded-md font-bold">
                    正确率: {session.stage_content.accuracy}
                  </span>
                </div>
              </div>

              {/* 单题判分详情 */}
              {session.stage_content.question_evals && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {session.stage_content.question_evals.map((qe, i) => (
                    <div key={i} className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                      qe.is_correct ? "bg-emerald-50/50 border-emerald-200 text-emerald-900" : "bg-rose-50/50 border-rose-200 text-rose-900"
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <span>第 {i + 1} 题</span>
                        <span>{qe.earned} 分</span>
                      </div>
                      <p className="opacity-90">{qe.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                  {session.stage_content.diagnostic_summary}
                </p>

                {session.stage_content.weak_points && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="text-xs font-bold text-red-500">检测到的薄弱考查点:</span>
                    {session.stage_content.weak_points.map((wp, i) => (
                      <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 font-medium">
                        {wp}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between">
                <span>{session.stage_content.next_action_tip}</span>
                <button
                  onClick={() => handleNextStep("NEXT_STEP")}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all shrink-0 ml-4 cursor-pointer"
                >
                  {loading ? "正在匹配真题..." : "调取历年统考真题演练 →"}
                </button>
              </div>
            </div>
          )}

          {/* 阶段 4: 真题实战演练视图 */}
          {session.current_stage === "TRUE_EXAM_DRILL" && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                      Step 4 · 调取历年 408 统考真题实战
                    </h3>
                    <p className="text-xs text-zinc-400">已从题库定向检索 3 道真题进行考点巩固</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {session.stage_content.drill_questions?.map((dq) => {
                  const isExp = !!drillExpanded[dq.id];
                  return (
                    <div key={dq.id} className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        <span>{dq.year} 年全国统考第 {dq.number} 题 ({dq.score}分)</span>
                        <span className="text-indigo-600 font-medium">[{dq.chapter}]</span>
                      </div>

                      <div className="text-xs sm:text-sm">
                        <MarkdownView content={dq.stem} />
                      </div>

                      {/* 选项交互 */}
                      {dq.options && dq.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {dq.options.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                setDrillAnswers(prev => ({ ...prev, [dq.id]: opt.key }));
                                setDrillExpanded(prev => ({ ...prev, [dq.id]: true }));
                              }}
                              className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                                drillAnswers[dq.id] === opt.key
                                  ? opt.key === dq.answer
                                    ? "bg-emerald-50 border-emerald-500 font-bold text-emerald-900"
                                    : "bg-rose-50 border-rose-500 font-bold text-rose-900"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                              }`}
                            >
                              <span className="font-bold mr-1.5">{opt.key}.</span>
                              <MarkdownView content={opt.text} />
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setDrillExpanded(prev => ({ ...prev, [dq.id]: !prev[dq.id] }))}
                          className="text-xs font-bold text-blue-600 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExp ? "收起官方解析" : "查看官方答案与解析"}</span>
                          {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {isExp && (
                        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 text-xs border border-blue-200 dark:border-blue-900 space-y-1 animate-in fade-in">
                          <span className="font-bold text-blue-600 block">【统考标准答案】: {dq.answer}</span>
                          <MarkdownView content={dq.explanation} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleNextStep("NEXT_STEP")}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {loading ? "Agent 生成复盘总结中..." : "完成真题演练，生成复盘报告 →"}
                </button>
              </div>
            </div>
          )}

          {/* 阶段 5: 复盘总结报告视图 (全新清爽美化与 PDF 导出) */}
          {session.current_stage === "SUMMARY_REPORT" && (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              
              {/* 打印专用文头 */}
              <div className="hidden print:block text-center pb-4 border-b border-slate-300">
                <h1 className="text-xl font-black text-slate-900">408 智能备考复盘与学情诊断总览报告</h1>
                <p className="text-xs text-slate-500 mt-1">
                  考点专题: {session.stage_content.title} · 掌握度评估: {session.stage_content.overall_status} · 能效: {session.stage_content.study_efficiency}
                </p>
              </div>

              {/* 头部标题与掌握度能效徽章 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-base shadow-md shrink-0">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-zinc-100">
                      {session.stage_content.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      本次考点全流程复习闭环已圆满达成，各项学习证据与薄弱考点已归集
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold border border-emerald-200">
                    掌握度: {session.stage_content.overall_status}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold border border-blue-200">
                    能效: {session.stage_content.study_efficiency}
                  </span>
                  <button
                    onClick={handlePrintReport}
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-all shadow-xs cursor-pointer border border-slate-200/80"
                    title="导出或打印为 PDF 格式"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-600" />
                    <span>导出 PDF 报告</span>
                  </button>
                </div>
              </div>

              {/* 达成成效与 AI 攻坚建议双栏 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 达成成效卡片 */}
                <div className="bg-slate-50 dark:bg-zinc-800/40 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-700 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-zinc-700/60">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">本次闭环已完成学习项:</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {session.stage_content.accomplished_steps?.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* AI 深度攻坚建议卡片 (结构化渲染，告别大色块堆叠) */}
                <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl p-5 border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-900/60">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                      <Brain className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold">后向攻坚方向与避坑诊断:</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                      AI 针对性建议
                    </span>
                  </div>

                  <div className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                    <MarkdownView content={session.stage_content.weakness_advice || "综合表现良好，建议持续巩固！"} />
                  </div>

                  {session.stage_content.next_recommended_topic && (
                    <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-zinc-400">下一步推荐攻坚：</span>
                      <Link
                        href={`/user/agent?point=${encodeURIComponent(session.stage_content.next_recommended_topic)}`}
                        className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span>{session.stage_content.next_recommended_topic}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* 完整 Markdown 复盘讲义卡片 (现代白底高品质卡片) */}
              {session.stage_content.markdown_report && (
                <div className="bg-slate-50/80 dark:bg-zinc-800/40 rounded-2xl p-5 border border-slate-200 dark:border-zinc-700 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70 dark:border-zinc-700/70">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 print:hidden">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block"></span>
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 ml-1">
                        <FileCheck2 className="w-4 h-4 text-blue-600" />
                        全量复盘精要与讲义
                      </span>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      <button
                        onClick={handlePrintReport}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                        title="打印或保存为 PDF"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" />
                        <span>导出 PDF</span>
                      </button>
                      <button
                        onClick={handleCopyReport}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedSuccess ? "已复制 ✓" : "复制 Markdown"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed max-h-80 overflow-y-auto pr-2">
                    <MarkdownView content={session.stage_content.markdown_report} />
                  </div>
                </div>
              )}

              {/* 底部联动导航与全量答卷复盘入口 */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSaveToNotes}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{savedNotesSuccess ? "已存入笔记 ✓" : "一键存入个人笔记"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectRecordId(2)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>查看往期模考答卷与 AI 建议 (47题)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <Link
                    href="/user/exam-hall"
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold text-xs hover:bg-slate-50 transition-all flex items-center gap-1"
                  >
                    <span>全真模考实战检验</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/user/wrong-notebook"
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 font-semibold text-xs hover:bg-slate-100 transition-all flex items-center gap-1"
                  >
                    <span>查看错题复盘本</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 47题全卷答卷明细与 AI 专属复盘模态窗 */}
      <ExamAnswerSheetModal 
        testRecordId={inspectRecordId} 
        onClose={() => setInspectRecordId(null)} 
      />
    </div>
  );
}
