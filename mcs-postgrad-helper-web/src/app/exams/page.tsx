"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
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
  HelpCircle
} from "lucide-react";
import MarkdownView from "@/components/MarkdownView";

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

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ds: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  co: { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  os: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  cn: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" }
};

export default function ExamsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/user/exams");
    }
  }, [user, router]);

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 筛选状态
  const [year, setYear] = useState<number | "">("");
  const [subject, setSubject] = useState<string>("");
  const [qType, setQType] = useState<string>("");
  const [difficulty, setDifficulty] = useState<number | "">("");
  const [keyword, setKeyword] = useState<string>("");
  const [pageNum, setPageNum] = useState(1);
  const pageSize = 10;

  // 控制单题展开答案解析
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

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
  }, [year, subject, qType, difficulty, pageNum]);

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || localStorage.getItem("408_auth_token") || ""}`,
        },
        body: JSON.stringify({ userId: user?.userId || 1, questionId })
      });
      const json = await res.json();
      if (json.code === 200) {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, isFavorited: json.data } : q));
      }
    } catch (err) {
      console.error("切换收藏失败:", err);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* 顶部标题区 (去除厚重深色条) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
              408 统考真题专区
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-bold">
              2009 - 2026 全年真题 (846 题)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            支持按年份、学科、题型与考点精细检索，配备官方采分点剖析与命题陷阱预警
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <Link
            href="/user/exam-hall"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all"
          >
            <span>进入全真模考</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/user/agent"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold text-xs border border-slate-200 dark:border-zinc-700 transition-all"
          >
            <span>AI 智能体带练</span>
          </Link>
        </div>
      </div>

      {/* 多维筛选栏 */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
        {/* 年份选择 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 w-16">考试年份:</span>
          <button
            onClick={() => { setYear(""); setPageNum(1); }}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              year === ""
                ? "bg-blue-600 text-white font-bold shadow-sm"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
            }`}
          >
            全部年份
          </button>
          {yearsList.map((y) => (
            <button
              key={y}
              onClick={() => { setYear(y); setPageNum(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                year === y
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* 科目选择 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500 w-16">学科分类:</span>
          <button
            onClick={() => { setSubject(""); setPageNum(1); }}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              subject === ""
                ? "bg-blue-600 text-white font-bold shadow-sm"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
            }`}
          >
            全部四科
          </button>
          {subjectsList.map((s) => (
            <button
              key={s.code}
              onClick={() => { setSubject(s.code); setPageNum(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                subject === s.code
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 题型与难度 + 搜索 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500">题型:</span>
              <select
                value={qType}
                onChange={(e) => { setQType(e.target.value); setPageNum(1); }}
                className="bg-zinc-100 dark:bg-zinc-800 border-none text-xs rounded-lg px-2.5 py-1.5 font-medium text-zinc-700 dark:text-zinc-300"
              >
                <option value="">全部题型</option>
                <option value="choice">单项选择题 (1~40)</option>
                <option value="comprehensive">综合应用题 (41~47)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500">难度:</span>
              <select
                value={difficulty}
                onChange={(e) => { setDifficulty(e.target.value ? Number(e.target.value) : ""); setPageNum(1); }}
                className="bg-zinc-100 dark:bg-zinc-800 border-none text-xs rounded-lg px-2.5 py-1.5 font-medium text-zinc-700 dark:text-zinc-300"
              >
                <option value="">全部难度</option>
                <option value="1">1 星 · 基础送分</option>
                <option value="2">2 星 · 概念考查</option>
                <option value="3">3 星 · 标准难度</option>
                <option value="4">4 星 · 进阶计算</option>
                <option value="5">5 星 · 压轴攻坚</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="搜索考点/题干关键字 (如: 快排, Cache, 拓扑)..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full text-xs pl-8 pr-16 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition-all outline-none"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-3 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all"
            >
              检索
            </button>
          </form>
        </div>
      </div>

      {/* 列表总览与题目卡片 */}
      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <div>
          筛选找到 <span className="font-bold text-zinc-900 dark:text-white">{total}</span> 道符合条件的真题
        </div>
        <div>
          第 {pageNum} / {totalPages || 1} 页
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-zinc-500">正在检索 408 真题数据...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 text-center border border-zinc-200 dark:border-zinc-800">
          <HelpCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">未找到符合筛选条件的题目</p>
          <p className="text-xs text-zinc-400 mt-1">请尝试放宽年份或学科条件重新搜索</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const subStyle = SUBJECT_COLORS[q.subjectCode] || SUBJECT_COLORS.ds;
            const isExpanded = !!expandedIds[q.id];

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* 题头元信息 */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                      {q.year} 年第 {q.questionNumber} 题
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {q.score} 分
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${subStyle.bg} ${subStyle.text} ${subStyle.border}`}>
                      {q.subjectName}
                    </span>
                    {q.chapterName && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700">
                        {q.chapterName}
                      </span>
                    )}
                    <span className="text-xs text-amber-500 font-mono">
                      {"★".repeat(q.difficulty)}{"☆".repeat(5 - q.difficulty)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(q.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        q.isFavorited
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                          : "text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${q.isFavorited ? "fill-amber-500" : ""}`} />
                      {q.isFavorited ? "已收藏" : "收藏"}
                    </button>
                    <Link
                      href={`/exam-hall?year=${q.year}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/50"
                    >
                      从本卷模考
                    </Link>
                  </div>
                </div>

                {/* 题干内容 */}
                <div className="py-4">
                  <MarkdownView content={q.stem} />
                </div>

                {/* 选择题选项 */}
                {(q.questionType === "choice" || q.questionType === "SINGLE_CHOICE" || (q.options && q.options.length > 0)) && q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 my-3">
                    {q.options.map((opt) => (
                      <div
                        key={opt.key}
                        className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                      >
                        <span className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-200 shrink-0">
                          {opt.key}
                        </span>
                        <div className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed pt-0.5">
                          <MarkdownView content={opt.text} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 综合大题子题列表 */}
                {q.questionType !== "choice" && q.subQuestions && q.subQuestions.length > 0 && (
                  <div className="my-3 space-y-2 border-l-2 border-blue-500 pl-4 py-1">
                    {q.subQuestions.map((sub) => (
                      <div key={sub.id} className="text-sm text-zinc-700 dark:text-zinc-300">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          ({sub.subNumber})
                        </span>{" "}
                        {sub.subStem}
                        {sub.score > 0 && (
                          <span className="text-xs text-zinc-400 ml-1">({sub.score}分)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 考点标签 */}
                {q.tags && q.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    {q.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* 展开/收起详解折叠按钮 */}
                <div className="pt-4 mt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <button
                    onClick={() => toggleExpand(q.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 py-1"
                  >
                    {isExpanded ? (
                      <>
                        收起参考答案与解析 <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        查看参考答案与采分点剖析 <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-zinc-400">
                    ID: {q.id}
                  </span>
                </div>

                {/* 答案与采分点解析抽屉 */}
                {isExpanded && (
                  <div className="mt-4 p-5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/60 space-y-3.5 animate-in fade-in duration-200">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                        【标准答案】
                      </span>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800">
                        {q.answer ? q.answer : "详见下方核心算法与步骤论述"}
                      </div>
                    </div>

                    {q.explanation && (
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                          【答案详解与推导】
                        </span>
                        <div className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white/70 dark:bg-zinc-800/70 p-3 rounded-lg">
                          <MarkdownView content={q.explanation} />
                        </div>
                      </div>
                    )}

                    {q.examPointAnalysis && (
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                          【408 命题意图与易错避坑指南】
                        </span>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900">
                          {q.examPointAnalysis}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 分页控制栏 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setPageNum(p => Math.max(1, p - 1))}
            disabled={pageNum === 1}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 hover:bg-zinc-50"
          >
            上一页
          </button>
          <span className="text-xs text-zinc-500 px-3">
            第 {pageNum} / {totalPages} 页
          </span>
          <button
            onClick={() => setPageNum(p => Math.min(totalPages, p + 1))}
            disabled={pageNum === totalPages}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 hover:bg-zinc-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

