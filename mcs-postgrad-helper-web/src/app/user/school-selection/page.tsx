"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GraduationCap,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Flame,
  Gauge,
  BookOpen,
  Search,
  CheckCircle2,
  Target,
  MapPin,
  Layers,
  Award,
  TrendingUp,
  ChevronRight,
  Info,
  Building2,
  Code2,
  SlidersHorizontal,
} from "lucide-react";
import MarkdownView from "@/components/MarkdownView";
import { useAuth } from "@/context/AuthContext";
import {
  MAJOR_OPTIONS,
  REGIONS,
  SCHOOL_LEVELS,
  SCHOOL_PROGRAMS,
  getMajorsByDegree,
  groupRecommendations,
  recommendPrograms,
  type DegreeType,
  type RecommendedProgram,
  type SchoolProgram,
} from "@/data/schoolSelectionData";

interface Evidence {
  title: string;
  url: string;
  snippet?: string;
  source_label?: string;
  year?: number;
}

interface SchoolResult {
  school: string;
  major: string;
  major_code?: string | null;
  degree_type?: string | null;
  generated_at: string;
  trend: {
    data_sufficient: boolean;
    predicted_range?: [number, number] | null;
    message?: string;
    scores?: number[];
    years?: number[];
    source?: string;
  };
  heat: { score: number; level: string; result_count?: number; source_diversity?: number };
  institution_consensus: { available: boolean; range?: [number, number] | null; median?: number | null; note?: string };
  learning_readiness: {
    available: boolean;
    score?: number | null;
    level: string;
    attempted?: number;
    accuracy?: number;
    note?: string;
    weak_subjects?: string[];
  };
  risk: { score: number; level: string; confidence: number; reasons: string[] };
  summary: string;
  evidence: Evidence[];
  methodology?: string;
  disclaimer?: string;
  reference?: {
    school: string;
    scores: number[];
    years: number[];
    heat: number;
    level: string;
    note: string;
  } | null;
}

const CATEGORY_META: Record<
  RecommendedProgram["category"],
  { label: string; tone: string; badge: string; desc: string; color: string }
> = {
  冲: {
    label: "冲刺档",
    tone: "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20",
    badge: "bg-rose-600 text-white",
    desc: "目标分略低于参考上沿，适合用冲刺复习换空间",
    color: "#e11d48",
  },
  稳: {
    label: "稳妥档",
    tone: "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
    badge: "bg-amber-500 text-white",
    desc: "目标分覆盖参考区间，兼顾院校层次与上岸概率",
    color: "#d97706",
  },
  保: {
    label: "保底档",
    tone: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20",
    badge: "bg-emerald-600 text-white",
    desc: "目标分明显高于参考上沿，用于控制整体风险",
    color: "#059669",
  },
};

const SCHOOL_NAMES = Array.from(new Set(SCHOOL_PROGRAMS.map((item) => item.school))).sort();

export default function SchoolSelectionPage() {
  const { user } = useAuth();
  const [degreeType, setDegreeType] = useState<DegreeType>("学硕");
  const [majorCode, setMajorCode] = useState("081200");
  const [school, setSchool] = useState(user?.targetSchool || "南京航空航天大学");
  const [targetScore, setTargetScore] = useState(
    user?.targetScore && user.targetScore > 200 ? String(user.targetScore) : "350"
  );
  const [region, setRegion] = useState("全部");
  const [level, setLevel] = useState("全部");
  const [scores, setScores] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SchoolResult | null>(null);
  const [readinessScore, setReadinessScore] = useState(55);
  const [readinessInfo, setReadinessInfo] = useState<{ attempted: number; accuracy: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const majors = useMemo(() => getMajorsByDegree(degreeType), [degreeType]);
  const selectedMajor = MAJOR_OPTIONS.find((item) => item.code === majorCode) || majors[0];

  useEffect(() => {
    if (!user) return;
    setSchool((current) => current || user.targetSchool || "南京航空航天大学");
    setTargetScore((current) =>
      current || (user.targetScore && user.targetScore > 200 ? String(user.targetScore) : "350")
    );
  }, [user]);

  useEffect(() => {
    if (!majors.some((item) => item.code === majorCode) && majors[0]) {
      setMajorCode(majors[0].code);
    }
  }, [degreeType, majors, majorCode]);

  useEffect(() => {
    const token = localStorage.getItem("408_auth_token") || "";
    if (!token) return;
    fetch("/api/user/dashboard/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((json) => {
        const stats = json?.data;
        if (!stats?.subjectMastery?.length) return;
        let attempted = 0;
        let correct = 0;
        for (const item of stats.subjectMastery) {
          const practiced = Number(item.practicedCount || 0);
          attempted += practiced;
          correct += Math.round((practiced * Number(item.correctRate || 0)) / 100);
        }
        const accuracy = attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0;
        setReadinessInfo({ attempted, accuracy });
        setReadinessScore(
          attempted > 0
            ? Math.round(Math.min(95, 35 + accuracy * 0.55 + Math.min(20, attempted / 10)))
            : 55
        );
      })
      .catch(() => undefined);
  }, []);

  const recommendationInput = useMemo(
    () => ({
      degreeType,
      majorCode,
      targetScore: Number(targetScore) || 350,
      region,
      level,
      readinessScore,
    }),
    [degreeType, majorCode, targetScore, region, level, readinessScore]
  );

  const recommendations = useMemo(
    () => groupRecommendations(recommendPrograms(recommendationInput)),
    [recommendationInput]
  );

  const totalRecommended =
    recommendations.冲.length + recommendations.稳.length + recommendations.保.length;

  const buildLearningProfile = async (signal?: AbortSignal) => {
    try {
      const token = localStorage.getItem("408_auth_token") || "";
      const statsRes = await fetch("/api/user/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      const statsJson = await statsRes.json();
      const stats = statsJson?.data;
      if (!stats?.subjectMastery?.length) return null;
      const subjects: Record<string, any> = {};
      let attempted = 0;
      let correct = 0;
      let totalQuestions = 0;
      for (const item of stats.subjectMastery) {
        const practiced = Number(item.practicedCount || 0);
        const total = Number(item.totalQuestions || 0);
        const rate = Number(item.correctRate || 0);
        const subjectCorrect = Math.round((practiced * rate) / 100);
        attempted += practiced;
        correct += subjectCorrect;
        totalQuestions += total;
        subjects[item.subjectName] = {
          attempted: practiced,
          total,
          accuracy: rate,
          progress: total > 0 ? Math.round((practiced / total) * 1000) / 10 : 0,
        };
      }
      return {
        total_answered: attempted,
        total_correct: correct,
        total_questions: totalQuestions,
        accuracy: attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0,
        progress: totalQuestions > 0 ? Math.round((attempted / totalQuestions) * 1000) / 10 : 0,
        subjects,
        sample_confidence: Math.min(0.95, 0.2 + attempted / 100),
      };
    } catch (err) {
      if ((err as any)?.name === "AbortError") throw err;
      return null;
    }
  };

  const analyzeTarget = async (target: {
    school: string;
    majorName: string;
    majorCode: string;
    degreeType: DegreeType;
    historicalScores?: number[];
    years?: number[];
  }) => {
    setError("");
    setLoading(true);
    setResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const learningProfile = await buildLearningProfile(controller.signal);
      const typedScores = scores
        .split(/[,，\s]+/)
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item >= 100 && item <= 500);
      const historicalScores = target.historicalScores?.length ? target.historicalScores : typedScores;
      const res = await fetch("/pilot/school-selection/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("408_auth_token") || ""}`,
        },
        body: JSON.stringify({
          school: target.school.trim(),
          major: target.majorName,
          major_code: target.majorCode,
          degree_type: target.degreeType,
          target_score: targetScore ? Number(targetScore) : null,
          historical_scores: historicalScores,
          score_years: target.years || [],
          learning_profile: learningProfile,
        }),
        signal: controller.signal,
      });
      if (res.status === 401) {
        setError("登录状态已失效，请重新登录后使用智能择校。");
        return;
      }
      if (res.status === 429) {
        setError("分析请求过于频繁，请稍后再试。");
        return;
      }
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("已取消本次择校分析。");
      } else {
        setError(`择校分析失败：${err.message || "请确认 408 Pilot 引擎（8010）已启动"}`);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  };

  const analyzeCurrent = (event: React.FormEvent) => {
    event.preventDefault();
    if (!school.trim()) {
      setError("请先填写目标院校");
      return;
    }
    void analyzeTarget({
      school: school.trim(),
      majorName: selectedMajor?.name || "计算机相关专业",
      majorCode: selectedMajor?.code || majorCode,
      degreeType,
    });
  };

  const analyzeProgram = (program: RecommendedProgram) => {
    setSchool(program.school);
    setDegreeType(program.degreeType);
    setMajorCode(program.majorCode);
    void analyzeTarget({
      school: program.school,
      majorName: program.majorName,
      majorCode: program.majorCode,
      degreeType: program.degreeType,
      historicalScores: program.scores,
      years: program.years,
    });
  };

  const cancelAnalysis = () => abortRef.current?.abort();

  const resultRiskTone =
    result?.risk.level === "高风险"
      ? "border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/20"
      : result?.risk.level === "中等风险"
      ? "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20"
      : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20";
  const resultConclusion =
    result?.risk.level === "高风险"
      ? "这所学校可以冲，但分数和专业课都要再稳一点，不能只按今年的线准备。"
      : result?.risk.level === "中等风险"
      ? "目标分和院校层次基本匹配，接下来重点是把薄弱科目补上来。"
      : "这所学校相对稳妥，适合作为保底或稳健目标。";
  const resultRange = result?.trend.predicted_range
    ? `${result.trend.predicted_range[0]}–${result.trend.predicted_range[1]} 分`
    : "暂无可靠区间";

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      {/* 顶部说明 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
              <Sparkles className="h-3.5 w-3.5" />
              School Selection · 408 Pilot
            </div>
            <h1 className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">
              智能择校与专业匹配
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
              先区分学硕 / 专硕和专业代码，再结合目标分、院校层次、地区与学习画像生成冲 / 稳 / 保推荐；点击院校可直接进入单校风险分析。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {["01 选学位与专业", "02 看冲稳保推荐", "03 做单校分析"].map((step) => (
                <span key={step} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[9px] font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                  {step}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-extrabold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
              <Target className="h-3.5 w-3.5" />
              目标 {targetScore || 350} 分
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldAlert className="h-3.5 w-3.5" />
              仅供参考
            </span>
          </div>
        </div>
      </div>

      {/* 报考方向设置 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">报考方向</h2>
          </div>
          {readinessInfo && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:border-zinc-700 dark:bg-zinc-800">
              学习画像：已做 {readinessInfo.attempted} 题 · 正确率 {readinessInfo.accuracy}%
            </span>
          )}
        </div>

        <form onSubmit={analyzeCurrent} className="mt-4 space-y-4">
          {/* 学硕/专硕 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300">学位类型</label>
              <div className="grid grid-cols-2 gap-2">
                {(["学硕", "专硕"] as DegreeType[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDegreeType(item)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                      degreeType === item
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/10 dark:border-blue-700 dark:bg-blue-950/30"
                        : "border-slate-200 bg-slate-50 hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-800/50"
                    }`}
                  >
                    <p className="text-xs font-black text-zinc-900 dark:text-zinc-100">{item}</p>
                    <p className="mt-0.5 text-[9px] text-zinc-500">
                      {item === "学硕" ? "偏科研 / 代码 081200 等" : "偏工程 / 代码 085404 等"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300">专业代码与名称</label>
              <select
                value={majorCode}
                onChange={(event) => setMajorCode(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
              >
                {majors.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </select>
              <p className="text-[9px] text-zinc-400">{selectedMajor?.examSubjects}</p>
            </div>
          </div>

          {/* 学校 / 分数 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300">目标院校</label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  list="school-options"
                  value={school}
                  onChange={(event) => setSchool(event.target.value)}
                  required
                  placeholder="输入或选择院校，如：南京航空航天大学"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3.5 text-xs outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
                />
                <datalist id="school-options">
                  {SCHOOL_NAMES.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300">目标总分（500 分制）</label>
              <input
                type="number"
                value={targetScore}
                onChange={(event) => setTargetScore(event.target.value)}
                placeholder="如 350"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300">近三年复试线（选填）</label>
              <input
                value={scores}
                onChange={(event) => setScores(event.target.value)}
                placeholder="350, 355, 362"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* 地区 / 层次 / 操作 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300">偏好地区</label>
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
              >
                <option value="全部">全部地区</option>
                {REGIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300">院校层次</label>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100"
              >
                <option value="全部">全部层次</option>
                {SCHOOL_LEVELS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end lg:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? "分析中..." : "分析当前院校"}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        )}
      </div>

      {/* 推荐院校 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-zinc-900 dark:text-zinc-100">
              <Award className="h-4 w-4 text-amber-500" />
              智能推荐院校
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              按 {degreeType} · {selectedMajor?.code} {selectedMajor?.name} · 目标 {targetScore || 350} 分生成，共 {totalRecommended} 所
            </p>
            <p className="mt-1 text-[9px] text-slate-400">
              推荐依据：目标分差、近三年参考线、院校层次、地区偏好与当前学习画像综合计算
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:border-zinc-700 dark:bg-zinc-900">
            冲 {recommendations.冲.length} · 稳 {recommendations.稳.length} · 保 {recommendations.保.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {(["冲", "稳", "保"] as const).map((category) => {
            const meta = CATEGORY_META[category];
            const items = recommendations[category];
            return (
              <div key={category} className={`rounded-3xl border p-4 ${meta.tone}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${meta.badge}`}>
                      {meta.label}
                    </span>
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{meta.desc}</p>
                  </div>
                  <span className="font-mono text-lg font-black text-slate-700 dark:text-zinc-200">{items.length}</span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-3 py-6 text-center text-[10px] text-slate-400 dark:border-zinc-700 dark:bg-zinc-900/40">
                      当前筛选条件下暂无该档院校
                    </div>
                  ) : (
                    items.map((program) => (
                      <div
                        key={`${program.school}-${program.majorCode}`}
                        className="rounded-2xl border border-white/70 border-t-4 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
                        style={{ borderTopColor: meta.color }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="truncate text-[12px] font-black text-zinc-900 dark:text-zinc-100">{program.school}</h3>
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:border-zinc-700 dark:bg-zinc-800">{program.level}</span>
                              <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">{program.region}</span>
                            </div>
                            <p className="mt-1 text-[10px] text-slate-500">
                              {program.majorCode} · {program.majorName} · {program.degreeType}
                            </p>
                          </div>
                          <div className="shrink-0 text-center">
                            <div
                              className="flex h-12 w-12 items-center justify-center rounded-full border-4 bg-white font-mono text-sm font-black dark:bg-zinc-900"
                              style={{ borderColor: `${meta.color}33`, color: meta.color }}
                            >
                              {program.matchScore}
                            </div>
                            <p className="mt-0.5 text-[8px] text-slate-400">匹配度</p>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {program.tags.map((tag) => (
                            <span key={tag} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">{tag}</span>
                          ))}
                        </div>

                        <div className="mt-2 rounded-xl bg-slate-50 px-2.5 py-2 text-[9px] text-slate-500 dark:bg-zinc-800/60">
                          <p>近三年参考：{program.scores.join(" / ")} 分</p>
                          <p className="mt-0.5 truncate">{program.examSubjects}</p>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className={`text-[9px] font-bold ${program.gap >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                            {program.gap >= 0 ? `高于参考上沿 ${program.gap} 分` : `低于参考上沿 ${Math.abs(program.gap)} 分`}
                          </span>
                          <button
                            type="button"
                            onClick={() => analyzeProgram(program)}
                            disabled={loading}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            分析这所 <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 加载中 */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs text-zinc-500">正在计算目标院校风险、参考线与学习适配度...</p>
          <button
            type="button"
            onClick={cancelAnalysis}
            className="mt-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            取消分析
          </button>
        </div>
      )}

      {/* 分析结果 */}
      {result && !loading && (
        <>
          <div className={`rounded-3xl border p-5 sm:p-6 ${resultRiskTone}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{result.school}</h2>
                  <span className="rounded-full border border-white/70 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-blue-300">
                    {result.degree_type || degreeType}
                  </span>
                  <span className="rounded-full border border-white/70 bg-white/80 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {result.major_code || selectedMajor?.code}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{result.major}</p>
                <p className="mt-3 max-w-2xl text-[13px] font-bold leading-6 text-zinc-800 dark:text-zinc-100">
                  {resultConclusion}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <span className="block text-[9px] font-bold text-slate-400">报考风险</span>
                  <span className="mt-0.5 block font-mono text-sm font-black text-zinc-800 dark:text-zinc-100">{result.risk.level}</span>
                </span>
                <span className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <span className="block text-[9px] font-bold text-slate-400">参考区间</span>
                  <span className="mt-0.5 block font-mono text-sm font-black text-blue-700 dark:text-blue-300">{resultRange}</span>
                </span>
                <span className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <span className="block text-[9px] font-bold text-slate-400">目标分</span>
                  <span className="mt-0.5 block font-mono text-sm font-black text-zinc-800 dark:text-zinc-100">{targetScore || 350}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-400">网络热度</span>
                <Flame className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-100">
                {result.heat.score}
                <span className="ml-1 text-xs font-normal text-zinc-400">/ 100</span>
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">{result.heat.level} · 公开网页关注度代理</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-400">报考风险</span>
                <ShieldAlert className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-100">
                {result.risk.score}
                <span className="ml-1 text-xs font-normal text-zinc-400">/ 100</span>
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">
                {result.risk.level} · 置信度 {Math.round(result.risk.confidence * 100)}%
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-400">学习准备度</span>
                <Gauge className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-3 text-2xl font-black text-zinc-900 dark:text-zinc-100">
                {result.learning_readiness.available ? result.learning_readiness.score : "--"}
                {result.learning_readiness.available && <span className="ml-1 text-xs font-normal text-zinc-400">/ 100</span>}
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">
                {result.learning_readiness.level} · 已做 {result.learning_readiness.attempted ?? 0} 题
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                近三年参考线与目标分差
              </h2>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                {result.trend?.source === "curated_reference"
                  ? "平台内置参考线"
                  : result.trend?.source === "online_evidence"
                  ? "公开来源提取"
                  : result.trend?.source === "user_input"
                  ? "用户填写"
                  : "数据不足"}
              </span>
            </div>
            {result.trend?.scores?.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(result.trend.years || []).map((year, index) => (
                  <div key={`${year}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <p className="text-[10px] font-bold text-slate-400">{year} 年参考</p>
                    <p className="mt-1 font-mono text-xl font-black text-slate-800 dark:text-zinc-100">
                      {result.trend.scores?.[index] ?? "--"}
                      <span className="ml-1 text-[10px] font-normal text-slate-400">分</span>
                    </p>
                  </div>
                ))}
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-300">预测区间</p>
                  <p className="mt-1 font-mono text-xl font-black text-blue-700 dark:text-blue-300">
                    {result.trend.predicted_range ? `${result.trend.predicted_range[0]}–${result.trend.predicted_range[1]}` : "--"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">暂无该院校参考线，可在上方补充近三年复试线后重新分析。</p>
            )}
            {result.reference?.note && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                {result.reference.note}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
                <GraduationCap className="h-4 w-4 text-blue-600" />
                综合判断与备考建议
              </h2>
            </div>
            <div className="prose prose-sm max-w-none text-[13px] leading-7 dark:prose-invert">
              <MarkdownView content={result.summary} />
            </div>
          </div>

          {result.evidence.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
                <BookOpen className="h-4 w-4 text-blue-600" />
                公开证据来源
              </h3>
              <div className="mt-3 space-y-2">
                {result.evidence.slice(0, 6).map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-800/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-zinc-800 dark:text-zinc-200">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-zinc-500">
                        {item.snippet || item.source_label || item.url}
                      </p>
                    </div>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400 transition-colors group-hover:text-blue-500" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] leading-relaxed text-slate-500 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              {result.disclaimer || result.methodology}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
