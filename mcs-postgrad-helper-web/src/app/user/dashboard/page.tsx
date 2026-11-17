"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import TargetConfigModal from "@/components/TargetConfigModal";
import ExamAnswerSheetModal from "@/components/ExamAnswerSheetModal";
import { 
  FileText, 
  Trophy, 
  TrendingUp, 
  AlertCircle, 
  Bot, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Target, 
  RefreshCw, 
  ChevronRight,
  Award,
  Zap,
  Layers,
  Code2,
  Cpu,
  Globe2,
  Calendar,
  CalendarCheck,
  PlayCircle,
  HelpCircle,
  CheckCircle,
  CheckSquare,
  Square,
  Sliders,
  Flame,
  Quote
} from "lucide-react";

interface UserDashboardData {
  userId: number;
  username: string;
  nickname: string;
  targetSchool: string;
  targetScore: number;
  examYear?: number;
  prepStage?: string;
  daysUntilExam: number;
  totalTestsTaken: number;
  highestScore: number;
  avgScore: number;
  wrongQuestionsCount: number;
  masteredQuestionsCount: number;
  subjectMastery: Array<{
    subjectCode: string;
    subjectName: string;
    totalQuestions: number;
    practicedCount: number;
    correctRate: number;
    masteryLevel: string;
    icon: string;
  }>;
  recentRecords: Array<{
    id: number;
    testTitle: string;
    userScore: number;
    totalScore: number;
    timeSpentSeconds: number;
    createdAt: string;
  }>;
  weakKnowledgePoints: string[];
}

interface DailyChecklistTask {
  id: string;
  category: "COURSE" | "EXAM" | "VARIANT" | "WRONG" | "MOCK" | "AGENT" | string;
  category_name: string;
  subject: string;
  subject_name: string;
  title: string;
  guidance: string;
  action_url: string;
  action_text: string;
  estimated_minutes: number;
  priority: "HIGH" | "MEDIUM" | "NORMAL";
  is_completed?: boolean;
}

interface DailyChecklistData {
  diagnosis: string;
  focus_subject: string;
  focus_subject_name: string;
  daily_quote: string;
  estimated_total_minutes: number;
  target_school: string;
  target_score: number;
  exam_year: number;
  days_until_exam: number;
  tasks: DailyChecklistTask[];
}

interface UserStudyPlanInfo {
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

interface UserStudyPlanTaskInfo {
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
  priority?: number;
  isAuto?: number;
}

const STAGES_META: Record<string, { name: string; badge: string; color: string; desc: string }> = {
  BASIC: { name: "基础阶段", badge: "第1阶段", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300", desc: "地毯式夯实 408 核心概念，打通四大教材知识脉络" },
  ENHANCE: { name: "强化阶段", badge: "第2阶段", color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300", desc: "高频算法与硬核算力专项突破，攻克跨科目综合大题" },
  TRUE_EXAM: { name: "真题阶段", badge: "第3阶段", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300", desc: "18届 846 道历年统考真题精刷与全卷限时模考" },
  SPRINT: { name: "冲刺阶段", badge: "第4阶段", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300", desc: "薄弱考点雷达图靶向消灭，易错陷阱回炉与考前密押" },
};

export default function UserDashboardPage() {
  const { user } = useAuth();

  const fallbackDaysUntilExam = useMemo(() => {
    const examYear = user?.examYear || 2027;
    const now = new Date();
    let target = new Date(examYear - 1, 11, 21);
    if (target.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
      target = new Date(examYear, 11, 21);
    }
    if (target.getTime() < now.getTime()) {
      target = new Date(examYear + 1, 11, 21);
    }
    return Math.max(1, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, [user?.examYear]);
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  // AI 每日提分清单与诊断状态
  const [checklist, setChecklist] = useState<DailyChecklistData | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  // 个性化四阶段备考规划状态
  const [studyPlan, setStudyPlan] = useState<UserStudyPlanInfo | null>(null);
  const [planTasks, setPlanTasks] = useState<UserStudyPlanTaskInfo[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [activeCommandTab, setActiveCommandTab] = useState<"daily" | "stages">("daily");
  const [showAllDailyTasks, setShowAllDailyTasks] = useState(false);
  const [selectedPlanStage, setSelectedPlanStage] = useState<string>("ALL");
  const [planStageInitialized, setPlanStageInitialized] = useState(false);
  const [inspectRecordId, setInspectRecordId] = useState<number | null>(null);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  }, []);

  // 获取个性化四阶段备考规划与里程碑任务
  const fetchStudyPlan = async (silent = false) => {
    try {
      if (!silent) setLoadingPlan(true);
      const token = user?.token || localStorage.getItem("408_auth_token") || localStorage.getItem("token") || "";
      const res = await fetch("/api/user/study-plan", {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setStudyPlan(json.data.plan);
        setPlanTasks(json.data.tasks || []);
        if (!planStageInitialized && json.data.plan?.currentStage) {
          setSelectedPlanStage(json.data.plan.currentStage);
          setPlanStageInitialized(true);
        }
      }
    } catch (err) {
      console.warn("加载备考规划异常:", err);
    } finally {
      if (!silent) setLoadingPlan(false);
    }
  };

  // 打卡完成/撤回四阶段周任务
  const togglePlanTask = async (taskId: number, currentStatus: number, isAuto?: number) => {
    if (isAuto === 1) return;
    const nextStatus = currentStatus === 1 ? 0 : 1;
    setPlanTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isCompleted: nextStatus } : t))
    );
    try {
      const token = user?.token || localStorage.getItem("408_auth_token") || localStorage.getItem("token") || "";
      await fetch(`/api/user/study-plan/tasks/${taskId}/complete`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ isCompleted: nextStatus })
      });
    } catch (err) {
      console.error("更新备考周任务状态异常:", err);
    }
  };

  // 获取用户基础看板数据
  const fetchStats = async () => {
    try {
      const token = user?.token || localStorage.getItem("408_auth_token") || "";
      const res = await fetch("/api/user/dashboard/stats", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setData(json.data);
        return json.data as UserDashboardData;
      }
    } catch (err) {
      console.error("Failed to load user dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    return null;
  };

  // 生成或恢复今日 AI 学习清单
  const fetchAiDailyChecklist = async (userData?: UserDashboardData | null, forceRefresh = false) => {
    const currentData = userData || data;
    const targetSchool = currentData?.targetSchool || user?.targetSchool || "目标院校";
    const targetScore = currentData?.targetScore || user?.targetScore || 125;
    const examYear = currentData?.examYear || user?.examYear || 2027;
    const daysUntilExam = currentData?.daysUntilExam || fallbackDaysUntilExam;
    const cacheKey = `408_daily_checklist_${user?.userId || 2}_${todayStr}_${targetSchool}_${targetScore}_${examYear}`;

    // 检查缓存
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed: DailyChecklistData = JSON.parse(cached);
          setChecklist(parsed);
          // 恢复已完成状态
          const savedCompleted = localStorage.getItem(`${cacheKey}_completed`);
          if (savedCompleted) {
            setCompletedTaskIds(JSON.parse(savedCompleted));
          }
          return;
        }
      } catch (e) {
        console.error("Failed to parse cached checklist:", e);
      }
    }

    setLoadingChecklist(true);
    try {
      const res = await fetch("/ai-api/api/ai/plan/daily-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.userId || 2,
          target_school: targetSchool,
          target_score: targetScore,
          exam_year: examYear,
          days_until_exam: daysUntilExam,
          total_tests: currentData?.totalTestsTaken || 0,
          avg_score: currentData?.avgScore || 0.0,
          wrong_count: currentData?.wrongQuestionsCount || 0,
          weak_points: currentData?.weakKnowledgePoints || [],
          subject_mastery: currentData?.subjectMastery || []
        }),
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setChecklist(json.data);
        localStorage.setItem(cacheKey, JSON.stringify(json.data));
        // 重置打卡状态
        if (forceRefresh) {
          setCompletedTaskIds({});
          localStorage.removeItem(`${cacheKey}_completed`);
        }
      }
    } catch (e) {
      console.error("AI Checklist generation failed:", e);
    } finally {
      setLoadingChecklist(false);
    }
  };

  useEffect(() => {
    fetchStats().then((latestData) => {
      fetchAiDailyChecklist(latestData);
    });
    fetchStudyPlan();

    // 检查是否有外部定位锚点或 Tab 请求
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes("study-plan") || search.includes("stages") || search.includes("study-plan")) {
        setActiveCommandTab("stages");
        setTimeout(() => {
          const el = document.getElementById("study-plan");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 300);
      }
    }
  }, [user]);

  // 真实作答/模考/错题变化后，回到首页或停留 30 秒自动刷新规划进度。
  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchStudyPlan(true);
      fetchStats();
    }, 30000);
    const onFocus = () => {
      fetchStudyPlan(true);
      fetchStats();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.token]);

  // 任务勾选完成打卡
  const toggleTaskCompletion = (taskId: string) => {
    const next = { ...completedTaskIds, [taskId]: !completedTaskIds[taskId] };
    setCompletedTaskIds(next);
    const targetSchool = data?.targetSchool || user?.targetSchool || "目标院校";
    const examYear = data?.examYear || user?.examYear || 2027;
    const cacheKey = `408_daily_checklist_${user?.userId || 2}_${todayStr}_${targetSchool}_${data?.targetScore || user?.targetScore || 125}_${examYear}_completed`;
    localStorage.setItem(cacheKey, JSON.stringify(next));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const updated = await fetchStats();
    await Promise.all([
      fetchAiDailyChecklist(updated, true),
      fetchStudyPlan()
    ]);
  };

  // 计算今日任务完成度
  const totalTasksCount = checklist?.tasks.length || 0;
  const completedCount = useMemo(() => {
    if (!checklist?.tasks) return 0;
    return checklist.tasks.filter(t => !!completedTaskIds[t.id]).length;
  }, [checklist, completedTaskIds]);

  const completionPercent = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;
  const visibleDailyTasks = useMemo(() => {
    const list = checklist?.tasks || [];
    return showAllDailyTasks ? list : list.slice(0, 3);
  }, [checklist?.tasks, showAllDailyTasks]);

  // 计算四阶段全局里程碑完成度
  const planCompletedCount = useMemo(() => {
    return planTasks.filter((t) => t.isCompleted === 1).length;
  }, [planTasks]);
  const planProgressPercent = useMemo(() => {
    return planTasks.length > 0 ? Math.round((planCompletedCount / planTasks.length) * 100) : 0;
  }, [planCompletedCount, planTasks.length]);

  const recentReportStats = useMemo(() => {
    const list = data?.recentRecords || [];
    const scores = list.map((record) => Number(record.userScore || 0));
    return {
      count: list.length,
      best: scores.length ? Math.max(...scores) : 0,
      avg: scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : 0,
      latest: scores.length ? scores[0] : 0,
    };
  }, [data?.recentRecords]);

  const statCards = [
    {
      title: "统考倒计时",
      value: data?.daysUntilExam ?? fallbackDaysUntilExam,
      unit: "天",
      sub: `${data?.examYear || user?.examYear || 2027} 考研初试`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgLight: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200/80 dark:border-amber-900",
    },
    {
      title: "全真模拟考场实战",
      value: data?.totalTestsTaken ?? 0,
      unit: "次",
      sub: `最高分: ${data?.highestScore ?? 0} 分 (满分150)`,
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bgLight: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200/80 dark:border-blue-900",
    },
    {
      title: "全真模考综合均分",
      value: data?.avgScore ?? 0,
      unit: "分",
      sub: `目标基准: ${data?.targetScore ?? 125} 分`,
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/80 dark:border-emerald-900",
    },
    {
      title: "错题待攻克与复盘",
      value: data?.wrongQuestionsCount ?? 0,
      unit: "题",
      sub: `已掌握消除 ${data?.masteredQuestionsCount ?? 0} 道错题`,
      icon: AlertCircle,
      color: "text-rose-600 dark:text-rose-400",
      bgLight: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200/80 dark:border-rose-900",
    },
  ];

  return (
    <div className="space-y-7 max-w-6xl mx-auto pb-12">
      {/* 顶部考生伴学总览 Banner (清爽蓝白卡片，避免喧宾夺主) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-extrabold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {data?.prepStage === "SPRINT" ? "冲刺押题期" : data?.prepStage === "ENHANCE" ? "专题强化期" : "基础强化与大纲攻坚期"}
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                目标高校：<strong className="text-slate-900 dark:text-zinc-100">{data?.targetSchool || user?.targetSchool || "目标院校"}</strong> · 目标分数 <strong className="text-blue-600 dark:text-blue-400 font-extrabold">{data?.targetScore || user?.targetScore || 125} 分</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
              你好，{data?.nickname || user?.nickname || "408 考研学子"}！
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
              距离 <strong className="text-blue-600 dark:text-blue-400 font-bold">{data?.examYear || user?.examYear || 2027} 考研初试</strong> 还有 <strong className="text-blue-600 dark:text-blue-400 font-extrabold text-base">{data?.daysUntilExam || fallbackDaysUntilExam}</strong> 天。系统已根据你的目标高校标准与历史薄弱考点，由 DeepSeek 伴学引擎生成今日专属行动清单！
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* 修改备考目标按钮 */}
            <button
              type="button"
              onClick={() => setShowTargetModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer shadow-2xs"
            >
              <Target className="w-4 h-4 text-amber-500" />
              <span>设置目标与年份</span>
            </button>

            <Link
              href="/user/exams"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>408 全真试题</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleRefresh}
              disabled={refreshing || loadingChecklist}
              title="刷新数据与 AI 清单"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${(refreshing || loadingChecklist) ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 大核心指标卡片 (白底、轻质感微阴影) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="truncate pr-1 text-[11px] font-bold text-slate-500 dark:text-zinc-400 sm:text-xs">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl ${card.bgLight}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-zinc-100 font-mono tracking-tight sm:text-3xl">
                    {card.value}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {card.unit}
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 truncate">
                  {card.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 核心重构：AI 个性化备考规划与今日提分任务清单深度一体化作战指挥中心 */}
      <div id="study-plan" className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* 一体化顶栏：长远规划档案与作战大局 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 dark:border-zinc-800 pb-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                今日提分作战中心
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900 text-[11px] font-extrabold">
                AI 今日行动
              </span>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
              这里不是课程列表，而是 AI 根据你的目标院校、当前阶段、错题和模考表现，算出的“今天最值得做的 3-5 个动作”。做完可以打卡，也可以直接跳到对应功能。
            </p>

            {/* 核心备考档案指标条 */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold flex items-center gap-1">
                <span>🎯 目标高校:</span>
                <strong className="text-blue-600 dark:text-blue-400 font-extrabold">{data?.targetSchool || user?.targetSchool || "目标院校"}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold flex items-center gap-1">
                <span>🏆 目标分数:</span>
                <strong className="text-amber-600 dark:text-amber-400 font-extrabold">{data?.targetScore || user?.targetScore || 125} 分</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold flex items-center gap-1">
                <span>⏳ 统考倒计时:</span>
                <strong className="text-rose-600 dark:text-rose-400 font-extrabold">{data?.daysUntilExam ?? fallbackDaysUntilExam} 天</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 font-bold flex items-center gap-1">
                <span>🚩 当前阶段:</span>
                <strong>{STAGES_META[studyPlan?.currentStage || data?.prepStage || "SPRINT"]?.name || "冲刺阶段"}</strong>
              </span>
            </div>
          </div>

          {/* 右上角操作区：调整规划与刷新 */}
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setShowTargetModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>调整备考目标与规划</span>
            </button>
            <button
              type="button"
              onClick={() => fetchAiDailyChecklist(data, true)}
              disabled={loadingChecklist}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingChecklist ? "animate-spin text-blue-600" : ""}`} />
              <span>重推今日任务</span>
            </button>
            <Link
              href="/user/daily-push"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>每日补给</span>
            </Link>
            <Link
              href="/user/study-plan"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>完整备考规划</span>
            </Link>
          </div>
        </div>

        {/* AI 专属考情诊断与名师战略建议卡片 */}
        {checklist && (
          <div className="bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                  名师 AI 考情动态研判与提分指南
                </h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold">
                今日聚焦：{checklist.focus_subject_name}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
              {checklist.diagnosis}
            </p>
            <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 flex items-center gap-2 text-xs text-slate-500 italic">
              <Quote className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{checklist.daily_quote}</span>
            </div>
          </div>
        )}

        {/* 双维度作战视图 Tabs 切换器 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 w-fit">
            <button
              type="button"
              onClick={() => setActiveCommandTab("daily")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCommandTab === "daily"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-xs ring-1 ring-slate-200/80 dark:ring-zinc-700"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>今日提分必做清单 ({completedCount}/{totalTasksCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCommandTab("stages")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeCommandTab === "stages"
                  ? "bg-white dark:bg-zinc-900 text-purple-600 shadow-xs ring-1 ring-slate-200/80 dark:ring-zinc-700"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>四阶段周里程碑规划 ({planCompletedCount}/{planTasks.length})</span>
            </button>
          </div>

          {/* 进度说明 */}
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {activeCommandTab === "daily" ? (
              <>
                <span>今日完成度:</span>
                <strong className="text-blue-600 font-bold">{completionPercent}%</strong>
                <span className="text-slate-400">· 预估 {checklist?.estimated_total_minutes || 95} 分钟</span>
              </>
            ) : (
              <>
                <span>全局里程碑进度:</span>
                <strong className="text-purple-600 font-bold">{planProgressPercent}%</strong>
                <span className="text-slate-400">· 已达成 {planCompletedCount} 项</span>
              </>
            )}
          </div>
        </div>

        {/* 视图一：今日 AI 提分行动清单 (落地闭环) */}
        {activeCommandTab === "daily" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 今日进度条 */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>

            {loadingChecklist ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-7 h-7 mx-auto text-blue-600 animate-spin" />
                <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                  DeepSeek 伴学引擎正在基于您的目标高校与考点数据生成今日清单...
                </p>
              </div>
            ) : checklist?.tasks && checklist.tasks.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-zinc-100">
                    今天优先做这几件
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">
                    已选 {visibleDailyTasks.length} / {checklist.tasks.length} 项
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {visibleDailyTasks.map((task) => {
                  const isCompleted = !!completedTaskIds[task.id];
                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCompleted
                          ? "bg-slate-50/70 dark:bg-zinc-800/40 border-slate-200/60 dark:border-zinc-800 opacity-75"
                          : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700/80 hover:border-blue-400 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* 左侧：打卡框与任务详情 */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleTaskCompletion(task.id)}
                            className="mt-1 shrink-0 p-1 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            title={isCompleted ? "标为未完成" : "点击完成打卡"}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                            ) : (
                              <div className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-zinc-600 hover:border-blue-500 transition-colors" />
                            )}
                          </button>

                          <div className="space-y-1.5 min-w-0">
                            {/* 标签与学科分类 */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900">
                                {task.category_name}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {task.subject_name}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                约 {task.estimated_minutes} 分钟
                              </span>
                              {task.priority === "HIGH" && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950 dark:text-rose-300">
                                  今日核心
                                </span>
                              )}
                            </div>

                            {/* 任务标题 */}
                            <h4 className={`text-sm sm:text-base font-bold leading-snug ${
                              isCompleted
                                ? "line-through text-slate-400 dark:text-zinc-500"
                                : "text-slate-900 dark:text-zinc-100"
                            }`}>
                              {task.title}
                            </h4>

                            {/* 深度指导说明 */}
                            <p className={`line-clamp-2 text-xs leading-relaxed ${
                              isCompleted ? "text-slate-400 dark:text-zinc-500" : "text-slate-500 dark:text-zinc-400"
                            }`}>
                              {task.guidance}
                            </p>
                          </div>
                        </div>

                        {/* 右侧：直达动作按钮 */}
                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto pl-8 sm:pl-0">
                          {isCompleted ? (
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>已打卡</span>
                            </div>
                          ) : (
                            <Link
                              href={task.action_url}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm shadow-blue-500/20 transition-all hover:scale-102"
                            >
                              <span>{task.action_text || "立即前往"}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
                {checklist.tasks.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllDailyTasks((value) => !value)}
                    className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-500 hover:border-blue-400 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-400"
                  >
                    {showAllDailyTasks ? "收起，只看今日核心任务" : `展开全部 ${checklist.tasks.length} 项今日任务`}
                  </button>
                )}
              </div>
            ) : (
              <div className="py-10 text-center space-y-2">
                <p className="text-xs text-slate-400">暂无今日清单数据，请点击上方按钮由 AI 重新推演生成</p>
              </div>
            )}
          </div>
        )}

        {/* 视图二：四阶段周里程碑规划 (大局长远推进) */}
        {activeCommandTab === "stages" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 全局进度条 */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${planProgressPercent}%` }}
              />
            </div>

            {/* 阶段过滤器胶囊 */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { code: "ALL", label: "全部阶段" },
                  { code: "BASIC", label: "基础阶段" },
                  { code: "ENHANCE", label: "强化阶段" },
                  { code: "TRUE_EXAM", label: "真题阶段" },
                  { code: "SPRINT", label: "冲刺阶段" }
                ].map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => setSelectedPlanStage(s.code)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      selectedPlanStage === s.code
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-purple-600"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400">
                日均目标专注：<strong>{studyPlan?.dailyTargetHours || 4.5} 小时</strong>
              </span>
            </div>

            {/* 当前选中阶段说明 */}
            {selectedPlanStage !== "ALL" && STAGES_META[selectedPlanStage] && (
              <div className="p-3.5 rounded-xl border border-purple-200/80 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 text-xs text-purple-900 dark:text-purple-300 flex items-center justify-between">
                <span>{STAGES_META[selectedPlanStage].desc}</span>
                <span className="font-bold">{STAGES_META[selectedPlanStage].badge}</span>
              </div>
            )}

            {/* 周里程碑任务列表 */}
            {loadingPlan ? (
              <div className="py-10 text-center space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto text-purple-600 animate-spin" />
                <p className="text-xs text-slate-500">正在装载备考阶段周计划...</p>
              </div>
            ) : planTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {planTasks
                  .filter((t) => selectedPlanStage === "ALL" || t.stage === selectedPlanStage)
                  .map((task) => {
                    const isDone = task.isCompleted === 1;
                    return (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          isDone
                            ? "bg-slate-50 dark:bg-zinc-800/40 border-slate-200/70 dark:border-zinc-800 opacity-80"
                            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700/80 hover:border-purple-400 shadow-xs"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => togglePlanTask(task.id, task.isCompleted, task.isAuto)}
                            disabled={task.isAuto === 1}
                            title={task.isAuto === 1 ? "该任务由真实学习数据自动统计" : "点击打卡"}
                            className={`mt-0.5 shrink-0 p-0.5 transition-colors ${
                              task.isAuto === 1 ? "cursor-default text-slate-300 dark:text-zinc-600" : "cursor-pointer text-slate-400 hover:text-purple-600"
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 fill-emerald-50" />
                            ) : (
                              <div className="w-4.5 h-4.5 rounded-md border-2 border-slate-300 dark:border-zinc-600" />
                            )}
                          </button>
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                第 {task.weekNumber} 周
                              </span>
                              <span className="text-slate-400">· {task.subjectCode}</span>
                              <span className="text-[10px] text-slate-400">({STAGES_META[task.stage]?.name || task.stage})</span>
                              <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                task.isAuto === 1
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                              }`}>
                                {task.isAuto === 1 ? "自动同步" : "手动打卡"}
                              </span>
                            </div>
                            <p className={`text-xs font-bold leading-relaxed ${
                              isDone ? "line-through text-slate-400 dark:text-zinc-500" : "text-slate-800 dark:text-zinc-200"
                            }`}>
                              {task.title}
                            </p>
                            {!!task.targetCount && (
                              <div className="mt-1.5">
                                <div className="flex justify-between text-[9px] text-slate-400">
                                  <span>真实进度</span>
                                  <span className="font-mono">{task.progressCurrent || 0}/{task.targetCount} {task.progressUnit || "题"}</span>
                                </div>
                                <div className="mt-1 h-1 rounded-full bg-slate-100 dark:bg-zinc-800">
                                  <div
                                    className={`h-1 rounded-full ${isDone ? "bg-emerald-500" : "bg-purple-500"}`}
                                    style={{ width: `${Math.min(100, Math.round(((task.progressCurrent || 0) / task.targetCount) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-md shrink-0 font-bold ${
                          isDone ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {isDone ? "已达成" : "待攻关"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">
                暂无周任务，请点击上方调整按钮重新生成四阶段周规划
              </div>
            )}
          </div>
        )}
      </div>

      {/* 四大学科掌握度看板 (DS / CO / OS / NET) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              408 四大学科掌握度与能力画像
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              基于历年真题研炼正确率、全真模考主观题采分点失分项与错题重做频次综合判定
            </p>
          </div>
          <Link
            href="/user/exams"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            前往真题专区强化 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {data?.subjectMastery.map((sub) => {
            const levelColors: Record<string, string> = {
              精通: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
              良好: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
              待巩固: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
              薄弱: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
            };
            const barColors: Record<string, string> = {
              精通: "bg-emerald-500",
              良好: "bg-blue-600",
              待巩固: "bg-amber-500",
              薄弱: "bg-rose-500",
            };

            return (
              <div
                key={sub.subjectCode}
                className="p-4 rounded-2xl bg-slate-50/60 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/80 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{sub.icon}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${levelColors[sub.masteryLevel] || levelColors["良好"]}`}>
                      {sub.masteryLevel}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100">
                      {sub.subjectName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      已练 {sub.practicedCount} / {sub.totalQuestions} 题
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">答题正确率</span>
                    <span className="font-bold text-slate-900 dark:text-zinc-100 font-mono">
                      {sub.correctRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${barColors[sub.masteryLevel] || "bg-blue-600"}`}
                      style={{ width: `${sub.correctRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部两栏：薄弱考点归因诊断 & 模考实战战报 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 左侧：AI 薄弱考点归因 */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
                AI 诊断薄弱考点 (错题归因)
              </h2>
            </div>
            <span className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md font-bold">
              针对性特训
            </span>
          </div>

          <div className="space-y-2.5">
            {data?.weakKnowledgePoints && data.weakKnowledgePoints.length > 0 ? (
              data.weakKnowledgePoints.map((point, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-700/70 flex items-center justify-between gap-3 group hover:border-blue-400 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                      {point}
                    </span>
                  </div>
                  <Link
                    href={`/user/agent?point=${encodeURIComponent(point)}`}
                    className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>AI辅导</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                暂未检测到明显薄弱知识点，继续保持！
              </p>
            )}
          </div>
        </div>

        {/* 右侧：最近全真模考流水战报 */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
                最近模考实战战报
              </h2>
            </div>
            <Link
              href="/user/exam-reports"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              全部战报
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "最高分", value: recentReportStats.best, tone: "text-amber-600" },
              { label: "平均分", value: recentReportStats.avg, tone: "text-emerald-600" },
              { label: "最近得分", value: recentReportStats.latest, tone: "text-blue-600" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-50 px-2.5 py-2 text-center dark:bg-zinc-800/50">
                <p className="text-[9px] font-bold text-slate-400">{item.label}</p>
                <p className={`mt-0.5 font-mono text-lg font-black ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {data?.recentRecords && data.recentRecords.length > 0 ? (
              data.recentRecords.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  onClick={() => setInspectRecordId(r.id)}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 hover:bg-blue-50/50 dark:hover:bg-zinc-800/80 border border-slate-200/70 hover:border-blue-300 dark:border-zinc-700/70 flex items-center justify-between gap-3 transition-all cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 truncate flex items-center gap-1.5">
                      <span>{r.testTitle}</span>
                      <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-normal">
                        点击查看47题答卷与AI建议 →
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      交卷时间: {r.createdAt ? r.createdAt.substring(0, 10) : "近期"} · 用时 {Math.round((r.timeSpentSeconds || 0) / 60)} 分钟
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <span className="font-extrabold text-base text-blue-600 dark:text-blue-400 font-mono">
                        {r.userScore}
                      </span>
                      <span className="text-xs text-slate-400 font-mono"> / {r.totalScore}分</span>
                      <div className="mt-1 w-20">
                        <div className="h-1 rounded-full bg-slate-200 dark:bg-zinc-700">
                          <div
                            className="h-1 rounded-full bg-blue-500"
                            style={{ width: `${Math.min(100, Math.round((Number(r.userScore || 0) / Math.max(1, Number(r.totalScore || 150))) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-slate-400">尚未参加全真模考</p>
                <Link
                  href="/user/exam-hall"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 text-xs font-bold"
                >
                  <span>立即参加首场模拟</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 备考目标设置弹窗 */}
      <TargetConfigModal
        isOpen={showTargetModal}
        onClose={() => setShowTargetModal(false)}
        onSaved={handleRefresh}
      />

      {/* 全真模考答卷明细与 AI 专属复盘弹窗 (47题标准试卷) */}
      <ExamAnswerSheetModal
        testRecordId={inspectRecordId}
        onClose={() => setInspectRecordId(null)}
      />
    </div>
  );
}
