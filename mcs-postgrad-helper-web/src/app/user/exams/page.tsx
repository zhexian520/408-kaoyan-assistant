"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Search, 
  Bookmark, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  ArrowRight, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Award, 
  Zap, 
  BookOpen,
  Target,
  Clock,
  Layers,
  Flame,
  Check,
  ExternalLink,
  RotateCcw,
  BookMarked
} from "lucide-react";
import MarkdownView from "@/components/MarkdownView";
import { useAuth } from "@/context/AuthContext";

interface OptionItem {
  key: string;
  text: string;
}

interface SubQuestion {
  id: number;
  subNumber: number;
  subStem: string;
  score: number;
  standardAnswer?: string;
}

interface QuestionItem {
  id: string;
  paperId: number;
  year: number;
  questionNumber: number;
  score: number;
  questionType: string;
  subjectCode: string;
  subjectName: string;
  chapterName: string;
  stem: string;
  options: OptionItem[];
  answer: string;
  difficulty: number;
  tags: string[];
  explanation: string;
  examPointAnalysis: string;
  subQuestions: SubQuestion[];
  isFavorited: boolean;
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  ds: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", label: "数据结构" },
  co: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800", label: "组成原理" },
  os: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800", label: "操作系统" },
  cn: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", label: "计算机网络" },
  net: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", label: "计算机网络" }
};

function UserExamsContent() {
  const { user } = useAuth();
  const authToken = () => user?.token || (typeof window !== "undefined" ? localStorage.getItem("408_auth_token") || "" : "");
  const recordedAttempts = useRef<Record<string, boolean>>({});

  const recordAttempt = async (q: QuestionItem, isCorrect: boolean, userAns: string) => {
    if (recordedAttempts.current[q.id]) return;
    recordedAttempts.current[q.id] = true;
    try {
      await fetch("/api/exams/attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken()}`,
        },
        body: JSON.stringify({
          questionId: q.id,
          subjectCode: q.subjectCode,
          isCorrect,
          userAnswer: userAns,
          sourceType: "PRACTICE",
        }),
      });
    } catch (err) {
      console.warn("记录练习作答失败:", err);
    }
  };
  const searchParams = useSearchParams();
  const initialYear = searchParams.get("year");
  const initialQNumber = searchParams.get("qNumber");
  const initialSubject = searchParams.get("subject");
  const initialKeyword = searchParams.get("keyword");
  const initialKnowledgePoint = searchParams.get("knowledgePoint");

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 筛选状态
  const [year, setYear] = useState<number | "">(initialYear ? Number(initialYear) : "");
  const [subject, setSubject] = useState<string>(initialSubject ? initialSubject.toLowerCase() : "");
  const [qType, setQType] = useState<string>("");
  const [difficulty, setDifficulty] = useState<number | "">("");
  const [keyword, setKeyword] = useState<string>(initialKeyword || "");
  const [knowledgePoint, setKnowledgePoint] = useState<string>(initialKnowledgePoint || "");
  const [knowledgePoints, setKnowledgePoints] = useState<Array<{ name: string; count: number }>>([]);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(initialQNumber ? 50 : 10);
  const [targetQNumber, setTargetQNumber] = useState<number | null>(initialQNumber ? Number(initialQNumber) : null);

  // 控制单题展开答案解析
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // 核心功能：模式切换
  // 'quick_drill' (练题模式: 做完直接给答案，不计入错题本)
  // 'exam_practice' (练习模式: 实战作答判分，做错自动录入错题本)
  const [studyMode, setStudyMode] = useState<"quick_drill" | "exam_practice">("quick_drill");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submittedStatus, setSubmittedStatus] = useState<Record<string, { isCorrect: boolean; userAns: string }>>({});
  const [wrongSavedMap, setWrongSavedMap] = useState<Record<string, boolean>>({});

  // 综合大题在练习模式下的手写要点状态
  const [subjectiveAnswers, setSubjectiveAnswers] = useState<Record<string, string>>({});
  const [subjectiveSubmitted, setSubjectiveSubmitted] = useState<Record<string, boolean>>({});

  const yearsList = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];

  const subjectsList = [
    { code: "ds", label: "数据结构" },
    { code: "co", label: "计算机组成原理" },
    { code: "os", label: "操作系统" },
    { code: "cn", label: "计算机网络" }
  ];

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year) params.append("year", String(year));
      if (subject) params.append("subjectCode", subject);
      if (qType) params.append("questionType", qType);
      if (difficulty) params.append("difficulty", String(difficulty));
      if (keyword.trim()) params.append("keyword", keyword.trim());
      if (knowledgePoint.trim()) params.append("knowledgePoint", knowledgePoint.trim());
      params.append("pageNum", String(pageNum));
      params.append("pageSize", String(pageSize));

      const res = await fetch(`/api/exams/questions?${params.toString()}`);
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setQuestions(json.data.list || []);
        setTotal(json.data.total || 0);
      }
    } catch (err) {
      console.error("加载真题失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [year, subject, qType, difficulty, knowledgePoint, pageNum, pageSize]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (subject) params.append("subjectCode", subject);
    fetch(`/api/exams/knowledge-points?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.code === 200 && Array.isArray(json.data)) {
          setKnowledgePoints(json.data);
        }
      })
      .catch(() => setKnowledgePoints([]));
  }, [subject]);

  // 当带有 targetQNumber 且题目列表装载后，自动高亮展开并平滑滚动
  useEffect(() => {
    if (targetQNumber && questions.length > 0) {
      const matched = questions.find((q) => q.questionNumber === targetQNumber);
      if (matched) {
        setExpandedIds((prev) => ({ ...prev, [matched.id]: true }));
        setTimeout(() => {
          const el = document.getElementById(`q-item-${targetQNumber}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 350);
      }
    }
  }, [questions, targetQNumber]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPageNum(1);
    fetchQuestions();
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFavorite = async (questionId: string) => {
    try {
      const res = await fetch("/api/exams/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({ userId: user?.userId || 2, questionId })
      });
      const json = await res.json();
      if (json.code === 200) {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, isFavorited: json.data } : q));
      }
    } catch (err) {
      console.error("切换收藏失败:", err);
    }
  };

  // 选项点击逻辑：区分 练题模式(即选即看，不计错题) 与 练习模式(选中待提交，判错自动收录)
  const handleOptionClick = (q: QuestionItem, optKey: string) => {
    if (studyMode === "quick_drill") {
      // 练题模式：做完直接给答案，不计入错题本
      setSelectedAnswers((prev) => ({ ...prev, [q.id]: optKey }));
      const isRight = optKey.trim().toUpperCase() === (q.answer || "").trim().toUpperCase();
      setSubmittedStatus((prev) => ({ ...prev, [q.id]: { isCorrect: isRight, userAns: optKey } }));
      setExpandedIds((prev) => ({ ...prev, [q.id]: true }));
      recordAttempt(q, isRight, optKey);
    } else {
      // 练习模式：仅记录当前选中项，已提交后不允许修改
      if (!submittedStatus[q.id]) {
        setSelectedAnswers((prev) => ({ ...prev, [q.id]: optKey }));
      }
    }
  };

  // 练习模式：确认提交作答
  const handleExerciseSubmit = async (q: QuestionItem) => {
    const userAns = selectedAnswers[q.id];
    if (!userAns) {
      alert("请先点击选择一个选项后再提交！");
      return;
    }
    const isRight = userAns.trim().toUpperCase() === (q.answer || "").trim().toUpperCase();
    setSubmittedStatus((prev) => ({ ...prev, [q.id]: { isCorrect: isRight, userAns } }));
    setExpandedIds((prev) => ({ ...prev, [q.id]: true }));
    recordAttempt(q, isRight, userAns);

    // 练习模式核心功能：做错自动计入错题本！
    if (!isRight) {
      try {
        await fetch("/ai-api/api/ai/wrong-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.userId || 2,
            question_id: q.id,
            subject_code: q.subjectCode.toLowerCase(),
            source_type: "EXAM_PRACTICE",
            error_reason_tag: "CONCEPT_CONFUSION",
            user_notes: `${q.year === 2027 ? "AI练习" : `${q.year}年统考`}第${q.questionNumber}题实战演练错题（选 ${userAns}，正解 ${q.answer}）`,
            last_wrong_answer: userAns
          })
        });
        setWrongSavedMap((prev) => ({ ...prev, [q.id]: true }));
      } catch (e) {
        console.error("保存错题失败:", e);
      }
    }
  };

  // 综合大题在练习模式下提交或收录错题
  const handleComprehensiveSubmit = (qId: string) => {
    setSubjectiveSubmitted(prev => ({ ...prev, [qId]: true }));
    setExpandedIds(prev => ({ ...prev, [qId]: true }));
  };

  const handleRecordSubjectiveWrong = async (q: QuestionItem) => {
    try {
      const uAns = subjectiveAnswers[q.id] || "考生综合大题作答失分";
      await fetch("/ai-api/api/ai/wrong-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.userId || 2,
          question_id: q.id,
          subject_code: q.subjectCode.toLowerCase(),
          source_type: "EXAM_PRACTICE",
          error_reason_tag: "CODE_BUG",
          user_notes: `${q.year === 2027 ? "AI练习" : `${q.year}年统考`}第${q.questionNumber}题大题自评失误收录`,
          last_wrong_answer: uAns
        })
      });
      setWrongSavedMap((prev) => ({ ...prev, [q.id]: true }));
      alert("该大题已成功收录至【错题本】！");
    } catch (e) {
      console.error(e);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* 顶部现代化紧凑标题栏与模式控制器整合 (去除厚重大黑长条) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                  408 全真试题专区
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900 font-bold">
                  统考真题 846 + AI 练习 2083
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 font-medium">
                  采分点精析
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                历年统考真题与 AI 智能练习题库精细检索，配备官方采分点推导、命题陷阱剖析与变式巩固
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/user/exam-hall"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>进入全真模考</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href="/user/wrong-notebook"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold text-xs border border-slate-200 dark:border-zinc-700 transition-all"
            >
              <BookMarked className="w-3.5 h-3.5 text-rose-500" />
              <span>个人错题本</span>
            </Link>
          </div>
        </div>

        {/* 下排：学科题量分布与刷题双模式切换 */}
        <div className="pt-3.5 border-t border-slate-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* 四科学科分布胶囊 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">题库构成:</span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-200/80 dark:border-emerald-900/50">
              数据结构 233 题
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-[11px] font-semibold border border-blue-200/80 dark:border-blue-900/50">
              组成原理 235 题
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 text-[11px] font-semibold border border-purple-200/80 dark:border-purple-900/50">
              操作系统 216 题
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[11px] font-semibold border border-amber-200/80 dark:border-amber-900/50">
              计算机网络 162 题
            </span>
          </div>

          {/* 练题/练习模式控制器 */}
          <div className="flex w-full flex-col gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100 p-1 dark:border-zinc-700 dark:bg-zinc-800 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setStudyMode("quick_drill")}
              className={`flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-xs font-bold transition-all cursor-pointer sm:w-auto sm:flex-row sm:items-center sm:py-1.5 ${
                studyMode === "quick_drill"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-slate-200/60 dark:ring-zinc-700"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <span className="whitespace-nowrap">📖 练题模式</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-normal sm:text-[10px] ${
                studyMode === "quick_drill" ? "bg-blue-50 dark:bg-blue-950/80 text-blue-600" : "text-slate-400"
              }`}>
                做完直接给答案 · 不计错题本
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode("exam_practice")}
              className={`flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-xs font-bold transition-all cursor-pointer sm:w-auto sm:flex-row sm:items-center sm:py-1.5 ${
                studyMode === "exam_practice"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
              }`}
            >
              <span className="whitespace-nowrap">✍️ 练习模式</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-normal sm:text-[10px] ${
                studyMode === "exam_practice" ? "bg-white/20 text-white" : "text-slate-400"
              }`}>
                实战判分 · 做错计入错题本
              </span>
            </button>
          </div>
        </div>

        {/* 模式工作说明 */}
        <div className={`p-3.5 rounded-xl text-xs leading-relaxed border transition-all ${
          studyMode === "quick_drill"
            ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900 text-blue-900 dark:text-blue-200"
            : "bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-900 text-purple-900 dark:text-purple-200"
        }`}>
          <div className="flex items-start gap-2.5">
            {studyMode === "quick_drill" ? (
              <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            ) : (
              <Target className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            )}
            <div>
              <strong className="font-extrabold block mb-0.5">
                {studyMode === "quick_drill" ? "当前运行：【练题模式（速刷直看）】" : "当前运行：【练习模式（实战评测）】"}
              </strong>
              <span>
                {studyMode === "quick_drill"
                  ? "在该模式下，点击任何单选题选项后，系统将立即用绿色标注正确答案、红色标注错误选项，并自动展开官方参考解答与得分点解析。该模式不会向错题本写入记录，适合第一轮概念扫盲与快速真题串讲！"
                  : "在该模式下，所有官方答案、得分点与推导过程默认严格隐藏。必须点击选择选项后点击【提交此题作答】；若回答错误，系统将立即自动收录至您的【个人错题本】并沉淀薄弱考点，适合第二三轮真题实战检验！"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 定向考点直达提示 */}
      {targetQNumber && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-bold">
            <Target className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              已从考纲知识点精准直达：<strong>{year ? `${year} 年` : ""}统考第 {targetQNumber} 题</strong>（已自动高亮并定位）
            </span>
          </div>
          <button
            onClick={() => {
              setTargetQNumber(null);
              setPageSize(10);
            }}
            className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer shrink-0 ml-3"
          >
            清除定向，查看全部试题
          </button>
        </div>
      )}

      {/* 多维真题筛选栏 */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 font-black text-base text-zinc-900 dark:text-zinc-100">
            <Filter className="w-4 h-4 shrink-0 text-blue-600" />
            <span>真题多维检索与过滤</span>
          </div>

          <div className="text-left text-xs leading-relaxed text-zinc-500 sm:text-right">
            共检索到 <strong className="text-zinc-900 dark:text-zinc-100 font-black text-sm">{total}</strong> 道题（真题 + AI 练习）
            {year && ` · ${year}年`}
            {subject && ` · ${subjectsList.find(s => s.code === subject)?.label}`}
            {knowledgePoint && ` · 知识点：${knowledgePoint}`}
            {qType && ` · ${qType === "choice" ? "单选题" : "综合大题"}`}
          </div>
        </div>

        {/* 年份按钮组 */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">年份 / 题库筛选：</span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              onClick={() => { setYear(""); setPageNum(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                year === ""
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
              }`}
            >
              全部年份
            </button>
            <button
              onClick={() => { setYear(2027); setPageNum(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                Number(year) === 2027
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
              }`}
            >
              AI 练习题库
            </button>
            {yearsList.map((y) => (
              <button
                key={y}
                onClick={() => { setYear(y); setPageNum(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  year === y
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                {y}年
              </button>
            ))}
          </div>
        </div>

        {/* 学科按钮组 */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">学科专业：</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSubject(""); setPageNum(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subject === ""
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
              }`}
            >
              全部四门专业课
            </button>
            {subjectsList.map((s) => (
              <button
                key={s.code}
                onClick={() => { setSubject(s.code); setPageNum(1); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  subject === s.code
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 知识点分类 */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              知识点分类：
            </span>
            {knowledgePoint && (
              <button
                type="button"
                onClick={() => { setKnowledgePoint(""); setPageNum(1); }}
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                清除知识点筛选
              </button>
            )}
          </div>
          <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-2xl border border-zinc-100 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/30">
            <button
              onClick={() => { setKnowledgePoint(""); setPageNum(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                knowledgePoint === ""
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
              }`}
            >
              全部知识点
            </button>
            {knowledgePoints.map((item) => (
              <button
                key={item.name}
                onClick={() => { setKnowledgePoint(item.name); setPageNum(1); }}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  knowledgePoint === item.name
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                }`}
                title={`${item.name} · ${item.count} 道题`}
              >
                {item.name}
                <span className={`font-mono text-[9px] ${knowledgePoint === item.name ? "text-blue-100" : "text-zinc-400"}`}>
                  {item.count}
                </span>
              </button>
            ))}
            {knowledgePoints.length === 0 && (
              <span className="px-2 py-1.5 text-[10px] text-zinc-400">当前学科暂无知识点标签数据</span>
            )}
          </div>
        </div>

        {/* 题型、难度与搜索输入 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">题型筛选：</label>
            <select
              value={qType}
              onChange={(e) => { setQType(e.target.value); setPageNum(1); }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
            >
              <option value="">全部题型 (单选题 + 综合大题)</option>
              <option value="choice">单项选择题 (1-40题)</option>
              <option value="comprehensive">综合应用大题 (41-47题)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">难度等级：</label>
            <select
              value={difficulty}
              onChange={(e) => { setDifficulty(e.target.value ? Number(e.target.value) : ""); setPageNum(1); }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
            >
              <option value="">全部难度</option>
              <option value="1">1星 - 基础概念题</option>
              <option value="2">2星 - 经典推演题</option>
              <option value="3">3星 - 统考高频题</option>
              <option value="4">4星 - 复杂综合题</option>
              <option value="5">5星 - 拔高压轴题</option>
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">题干/考点搜索：</label>
              <input
                type="text"
                placeholder="搜索考点，如：Cache组相联、WPL、TLB..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              检索
            </button>
          </form>
        </div>
      </div>

      {/* 题目列表卡片流 */}
      {loading ? (
        <div className="py-24 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-zinc-500 font-medium">正在检索历年统考真题库...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-3">
          <HelpCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-zinc-700 dark:text-zinc-300">未找到符合条件的真题</h3>
          <p className="text-xs text-zinc-500">请尝试清空筛选条件重新搜索</p>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((q) => {
            const isExpanded = !!expandedIds[q.id];
            const isTarget = targetQNumber === q.questionNumber;
            const subColor = SUBJECT_COLORS[q.subjectCode.toLowerCase()] || { bg: "bg-zinc-100", text: "text-zinc-800", border: "border-zinc-200", label: "408专业课" };
            
            // 是否单选客观题 (注意支持 choice 与 SINGLE_CHOICE 两种命名)
            const isChoice = q.questionType === "choice" || q.questionType === "SINGLE_CHOICE" || (q.options && q.options.length > 0);
            const qSubmission = submittedStatus[q.id];
            const currentSelected = selectedAnswers[q.id];
            const isWrongSaved = wrongSavedMap[q.id];

            return (
              <div
                key={q.id}
                id={`q-item-${q.questionNumber}`}
                className={`bg-white dark:bg-zinc-900 border rounded-3xl p-6 sm:p-8 shadow-xs transition-all duration-300 space-y-5 ${
                  isTarget
                    ? "border-blue-500 ring-4 ring-blue-500/20 bg-blue-50/15"
                    : "border-zinc-200/90 dark:border-zinc-800 hover:shadow-md hover:border-zinc-300"
                }`}
              >
                {/* 题目标头 */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-black shadow-xs">
                      {q.year === 2027 ? "AI 练习" : `${q.year} 年统考`}第 {q.questionNumber} 题
                    </span>
                    {isTarget && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-black text-[10px] animate-pulse">
                        🎯 考纲直达题
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-xl border text-xs font-bold ${subColor.bg} ${subColor.text} ${subColor.border}`}>
                      {q.subjectName || subColor.label}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold">
                      {isChoice ? "单项选择题" : "综合应用大题"} ({q.score} 分)
                    </span>
                    {q.chapterName && (
                      <span className="text-xs text-zinc-500 font-medium px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60">
                        {q.chapterName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* 收藏按钮 */}
                    <button
                      onClick={() => toggleFavorite(q.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        q.isFavorited
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 border border-amber-300"
                          : "text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent"
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${q.isFavorited ? "fill-amber-500 text-amber-500" : ""}`} />
                      <span>{q.isFavorited ? "已收藏" : "收藏"}</span>
                    </button>

                    {/* AI 变式练习直达 */}
                    <Link
                      href={`/user/variant?qid=${q.id}&year=${q.year}&num=${q.questionNumber}&sub=${q.subjectCode}`}
                      onClick={() => {
                        try {
                          sessionStorage.setItem("active_variant_question", JSON.stringify(q));
                        } catch (e) {}
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-all hover:scale-105"
                    >
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
                      <span>AI 变式练习</span>
                    </Link>
                  </div>
                </div>

                {/* 题干 (支持 Markdown & LaTeX 公式排版) */}
                <div className="text-sm sm:text-base text-zinc-900 dark:text-zinc-100 leading-relaxed font-normal">
                  <MarkdownView content={q.stem} />
                </div>

                {/* ===================== 客观单选题作答区 ===================== */}
                {isChoice && q.options && q.options.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt) => {
                        const isSelected = currentSelected === opt.key;
                        const isStd = (q.answer || "").trim().toUpperCase() === opt.key;

                        let cardStyle = "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 hover:border-blue-400 hover:bg-white dark:hover:bg-zinc-800";

                        if (qSubmission) {
                          if (isStd) {
                            cardStyle = "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30";
                          } else if (isSelected && !qSubmission.isCorrect) {
                            cardStyle = "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/30";
                          }
                        } else if (isSelected) {
                          cardStyle = "bg-blue-50/90 dark:bg-blue-950/60 border-blue-600 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30";
                        }

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleOptionClick(q, opt.key)}
                            className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all cursor-pointer ${cardStyle}`}
                          >
                            <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                            }`}>
                              {opt.key}
                            </span>
                            <div className="flex-1">
                              <MarkdownView content={opt.text} />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* 练习模式下的专属确认提交按钮 */}
                    {studyMode === "exam_practice" && !qSubmission && (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900">
                        <span className="text-xs font-semibold text-purple-900 dark:text-purple-300">
                          {currentSelected ? `当前已选 [${currentSelected}]，请确认后提交作答` : "实战练习：请先在上方点击一个选项"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleExerciseSubmit(q)}
                          disabled={!currentSelected}
                          className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-black text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer hover:scale-105"
                        >
                          提交此题作答
                        </button>
                      </div>
                    )}

                    {/* 判分反馈提示条 */}
                    {qSubmission && (
                      <div className={`p-4 rounded-2xl text-xs flex flex-wrap items-center justify-between gap-3 ${
                        qSubmission.isCorrect
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800"
                      }`}>
                        <div className="flex items-center gap-2">
                          {qSubmission.isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
                          <span className="font-extrabold text-sm">
                            {qSubmission.isCorrect
                              ? `作答正确！(+${q.score}分)`
                              : `作答失误 (你的选择: ${qSubmission.userAns} · 正确答案: ${q.answer})`}
                          </span>
                        </div>

                        {/* 练习模式下答错提示错题本联动 */}
                        {studyMode === "exam_practice" && !qSubmission.isCorrect && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-rose-600 text-white font-extrabold shadow-xs">
                              {isWrongSaved ? "✓ 已自动收录至错题本" : "正在收录错题..."}
                            </span>
                            <Link
                              href="/user/wrong-notebook"
                              className="text-xs text-rose-700 dark:text-rose-300 underline font-bold flex items-center gap-0.5 hover:text-rose-900"
                            >
                              <span>前往错题本查看</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ===================== 综合大题子问与练习作答区 ===================== */}
                {!isChoice && (
                  <div className="space-y-4 pt-2">
                    {q.subQuestions && q.subQuestions.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                          综合大题子问题 ({q.subQuestions.length} 问)：
                        </span>
                        {q.subQuestions.map((sub) => (
                          <div
                            key={sub.id}
                            className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2 text-xs sm:text-sm"
                          >
                            <div className="flex items-center justify-between font-bold text-zinc-800 dark:text-zinc-200">
                              <span>第 ({sub.subNumber}) 小问</span>
                              <span className="text-xs text-blue-600 font-mono">[{sub.score} 分]</span>
                            </div>
                            <MarkdownView content={sub.subStem} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 练习模式下的草稿作答交互 */}
                    {studyMode === "exam_practice" && (
                      <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/60 space-y-3">
                        <label className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                          实战演练作答（在草稿纸完成推导后，可在此记录核心步骤或算法思想）：
                        </label>
                        <textarea
                          rows={3}
                          value={subjectiveAnswers[q.id] || ""}
                          onChange={(e) => setSubjectiveAnswers({ ...subjectiveAnswers, [q.id]: e.target.value })}
                          placeholder="输入解题核心步骤、关键公式或时间/空间复杂度..."
                          className="w-full text-xs p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-purple-500 outline-hidden font-mono"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-400">
                            完成草稿推导后点击提交，核对官方答案与细化采分点
                          </span>
                          {!subjectiveSubmitted[q.id] ? (
                            <button
                              type="button"
                              onClick={() => handleComprehensiveSubmit(q.id)}
                              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                            >
                              提交大题并核对答案
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRecordSubjectiveWrong(q)}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-all cursor-pointer"
                            >
                              发现漏洞，收录至错题本巩固
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ===================== 官方参考答案与采分点折叠区 ===================== */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => toggleExpand(q.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <span>{isExpanded ? "收起官方解析与采分点" : "展开官方答案、得分点与命题思路"}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 space-y-4 text-xs">
                      <div>
                        <span className="font-extrabold text-emerald-600 text-xs block mb-1 uppercase tracking-wider">
                          【标准参考答案】
                        </span>
                        <div className="text-zinc-900 dark:text-zinc-100 font-bold text-sm bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700">
                          {q.answer || "详见下方得分采分点解析"}
                        </div>
                      </div>

                      {q.explanation && (
                        <div className="space-y-1">
                          <span className="font-extrabold text-blue-600 text-xs block uppercase tracking-wider">
                            【官方命题解析与推导过程】
                          </span>
                          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 leading-relaxed">
                            <MarkdownView content={q.explanation} />
                          </div>
                        </div>
                      )}

                      {q.examPointAnalysis && (
                        <div className="space-y-1">
                          <span className="font-extrabold text-amber-600 text-xs block uppercase tracking-wider">
                            【408 核心采分点与命题陷阱】
                          </span>
                          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                            <MarkdownView content={q.examPointAnalysis} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 分页控制栏 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
          <div className="text-zinc-500">
            显示第 {(pageNum - 1) * pageSize + 1} - {Math.min(pageNum * pageSize, total)} 题 · 共 {total} 题
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPageNum((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={pageNum <= 1}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold disabled:opacity-40 hover:bg-zinc-50 cursor-pointer"
            >
              上一页
            </button>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {pageNum} / {totalPages}
            </span>
            <button
              onClick={() => { setPageNum((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={pageNum >= totalPages}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold disabled:opacity-40 hover:bg-zinc-50 cursor-pointer"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserExamsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">加载 408 全真试题专区...</div>}>
      <UserExamsContent />
    </Suspense>
  );
}
