"use client";

import React, { useEffect, useState, useMemo } from "react";
import MarkdownView from "@/components/MarkdownView";
import { 
  X, 
  ExternalLink, 
  BookOpen, 
  Clock, 
  Award, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Search,
  Eye,
  EyeOff,
  Filter,
  Check,
  FileText
} from "lucide-react";

interface QuestionOption {
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

export interface ExamQuestionItem {
  id: string;
  paperId: number;
  year: number;
  questionNumber: number;
  score: number;
  questionType: string; // 'choice' | 'comprehensive'
  subjectCode: string;  // 'ds' | 'co' | 'os' | 'cn'
  subjectName: string;
  chapterName?: string;
  stem: string;
  options?: QuestionOption[];
  answer?: string;
  difficulty?: number;
  tags?: string[];
  explanation?: string;
  subQuestions?: SubQuestion[];
}

interface AdminExamPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number | null;
  paperTitle?: string;
}

const SUBJECT_BADGES: Record<string, { label: string; color: string; border: string }> = {
  ds: { label: "数据结构", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  co: { label: "组成原理", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  os: { label: "操作系统", color: "bg-sky-50 text-sky-900 dark:bg-sky-950/60 dark:text-sky-300", border: "border-sky-200 dark:border-sky-800" },
  cn: { label: "计算机网络", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
};

export default function AdminExamPaperModal({
  isOpen,
  onClose,
  year,
  paperTitle
}: AdminExamPaperModalProps) {
  const [questions, setQuestions] = useState<ExamQuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});
  const [expandAll, setExpandAll] = useState(false);
  const [activeHighlightQid, setActiveHighlightQid] = useState<string | null>(null);

  // 加载该年份的全部题目 (47 题)
  useEffect(() => {
    if (!isOpen || !year) return;

    let isMounted = true;
    setLoading(true);
    setQuestions([]);
    setExpandedAnswers({});
    setExpandAll(false);

    fetch(`/api/exams/questions?year=${year}&pageSize=100`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.code === 200 && json.data?.list) {
          // 按照题号正序排列
          const sorted = [...json.data.list].sort((a, b) => a.questionNumber - b.questionNumber);
          setQuestions(sorted);
        }
      })
      .catch((err) => {
        console.error("加载真题试卷异常:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, year]);

  // ESC 按键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 筛选试题列表
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSub = selectedSubject === "ALL" || (q.subjectCode || "").toLowerCase() === selectedSubject.toLowerCase();
      const matchType = selectedType === "ALL" || q.questionType === selectedType;
      const matchSearch = !searchTerm || 
        q.stem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.questionNumber.toString() === searchTerm.trim() ||
        (q.explanation || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.chapterName || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchSub && matchType && matchSearch;
    });
  }, [questions, selectedSubject, selectedType, searchTerm]);

  // 全部展开/折叠答案
  const handleToggleExpandAll = () => {
    const next = !expandAll;
    setExpandAll(next);
    const map: Record<string, boolean> = {};
    questions.forEach((q) => {
      map[q.id] = next;
    });
    setExpandedAnswers(map);
  };

  const toggleSingleAnswer = (id: string) => {
    setExpandedAnswers((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 快速滚动定位到题号
  const scrollToQuestion = (questionNumber: number) => {
    const el = document.getElementById(`admin-q-${questionNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const targetQ = questions.find((q) => q.questionNumber === questionNumber);
      if (targetQ) {
        setActiveHighlightQid(targetQ.id);
        setTimeout(() => setActiveHighlightQid(null), 2000);
      }
    }
  };

  if (!isOpen || !year) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/60 animate-in fade-in duration-150"
    >
      <div 
        className="w-full max-w-6xl h-[92vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-slate-50/70 dark:bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-900 text-white shadow-md shadow-sky-700/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100">
                  {paperTitle || `${year} 年全国硕士研究生招生考试 408 计算机真题全卷`}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  统考真题 · 47 题全量收录 (弹窗浏览)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                试卷满分 150 分 · 考试时长 180 分钟 · 单项选择 40 题 (80分) + 综合应用大题 7 题 (70分) · 无需跳转
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="关闭弹窗 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 过滤控制栏与题号导航胶囊 */}
        <div className="px-6 py-3 border-b border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* 科目与题型筛选 */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> 筛选:
              </span>
              {[
                { code: "ALL", label: "全部科目" },
                { code: "ds", label: "数据结构" },
                { code: "co", label: "组成原理" },
                { code: "os", label: "操作系统" },
                { code: "cn", label: "计算机网络" }
              ].map((sub) => (
                <button
                  key={sub.code}
                  type="button"
                  onClick={() => setSelectedSubject(sub.code)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedSubject === sub.code
                      ? "bg-sky-900 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-sky-900"
                  }`}
                >
                  {sub.label}
                </button>
              ))}

              <div className="h-3 w-px bg-slate-200 dark:bg-zinc-700 mx-1 hidden sm:block" />

              {[
                { code: "ALL", label: "全部题型" },
                { code: "choice", label: "单项选择 (1-40)" },
                { code: "comprehensive", label: "综合大题 (41-47)" }
              ].map((t) => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setSelectedType(t.code)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedType === t.code
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-blue-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 搜索框与全部展开答案开关 */}
            <div className="flex items-center gap-2.5">
              <div className="relative min-w-[180px] max-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索题号、考点或题干..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs focus:outline-hidden focus:ring-1 focus:ring-sky-700"
                />
              </div>

              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                {expandAll ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-sky-900" />}
                <span>{expandAll ? "全部折叠答案" : "全部展开答案"}</span>
              </button>
            </div>
          </div>

          {/* 题号快速定位胶囊 (1-47) */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[11px] text-slate-400 font-bold shrink-0">快捷定位:</span>
            {questions.map((q) => {
              const subMeta = SUBJECT_BADGES[(q.subjectCode || "").toLowerCase()];
              const isComprehensive = q.questionType === "comprehensive";
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => scrollToQuestion(q.questionNumber)}
                  className={`shrink-0 w-6 h-6 rounded-md text-[11px] font-bold font-mono transition-all flex items-center justify-center cursor-pointer ${
                    isComprehensive
                      ? "bg-sky-100 text-sky-800 hover:bg-sky-900 hover:text-white dark:bg-sky-950 dark:text-sky-300"
                      : "bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                  title={`第 ${q.questionNumber} 题 (${q.score}分) · ${subMeta?.label || q.subjectName}`}
                >
                  {q.questionNumber}
                </button>
              );
            })}
          </div>
        </div>

        {/* 试题主体列表区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50 dark:bg-zinc-950/40">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-9 h-9 border-3 border-sky-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-500">正在快速装载 {year} 年 408 全卷试题与官方答案解析...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400 space-y-2">
              <p>未找到符合筛选条件的试题</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSubject("ALL");
                  setSelectedType("ALL");
                  setSearchTerm("");
                }}
                className="text-sky-900 font-bold hover:underline cursor-pointer"
              >
                重置所有筛选
              </button>
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const subMeta = SUBJECT_BADGES[(q.subjectCode || "").toLowerCase()];
              const isChoice = q.questionType === "choice";
              const isExpanded = !!expandedAnswers[q.id];
              const isHighlighted = activeHighlightQid === q.id;

              return (
                <div
                  key={q.id}
                  id={`admin-q-${q.questionNumber}`}
                  className={`bg-white dark:bg-zinc-900 rounded-2xl border p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                    isHighlighted
                      ? "border-sky-700 ring-2 ring-sky-700/30 scale-[1.005]"
                      : "border-slate-200 dark:border-zinc-800"
                  }`}
                >
                  {/* 题目头部信息 */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-mono font-black">
                        第 {q.questionNumber} 题
                      </span>
                      {subMeta && (
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${subMeta.color} ${subMeta.border}`}>
                          {subMeta.label}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold">
                        {isChoice ? "单项选择题" : "综合应用大题"} ({q.score} 分)
                      </span>
                      {q.chapterName && (
                        <span className="text-xs text-slate-400 hidden sm:inline-block">
                          · {q.chapterName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isChoice && q.answer && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900">
                          标准答案: <strong className="font-mono text-sm">{q.answer}</strong>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleSingleAnswer(q.id)}
                        className="text-xs font-bold text-sky-900 hover:text-sky-900 flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors"
                      >
                        <span>{isExpanded ? "收起答案与解析" : "查看官方答案与解析"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* 题干 (支持 Markdown & LaTeX 公式) */}
                  <div className="text-sm text-slate-900 dark:text-zinc-100 leading-relaxed font-normal">
                    <MarkdownView content={q.stem} />
                  </div>

                  {/* 选择题选项 A/B/C/D */}
                  {isChoice && q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {q.options.map((opt) => {
                        const isCorrectOpt = (q.answer || "").trim().toUpperCase() === opt.key.trim().toUpperCase();
                        return (
                          <div
                            key={opt.key}
                            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-colors ${
                              isCorrectOpt
                                ? "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-medium"
                                : "bg-slate-50/60 border-slate-200/80 dark:bg-zinc-800/40 dark:border-zinc-800 text-slate-700 dark:text-zinc-300"
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-md font-mono font-bold flex items-center justify-center shrink-0 ${
                              isCorrectOpt
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-200"
                            }`}>
                              {opt.key}
                            </span>
                            <div className="flex-1 break-words">
                              <MarkdownView content={opt.text} />
                            </div>
                            {isCorrectOpt && (
                              <span className="text-[10px] text-emerald-600 font-bold shrink-0">
                                (正确项)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 综合大题子问列表 */}
                  {!isChoice && q.subQuestions && q.subQuestions.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                      <span className="text-xs font-bold text-slate-400 block">设问小项：</span>
                      <div className="space-y-2">
                        {q.subQuestions.map((sub, i) => (
                          <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-800 text-xs flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-700 dark:text-zinc-300">
                                ({sub.subNumber || i + 1}) {sub.subStem}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-sky-900 shrink-0">
                              {sub.score} 分
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 官方参考答案与采分点精析折叠面板 */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-slate-200/80 dark:border-zinc-800 space-y-3 animate-in fade-in duration-200">
                      {q.answer && (
                        <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1">
                          <span className="font-extrabold text-emerald-800 dark:text-emerald-300 block">
                            【官方参考答案】：
                          </span>
                          <div className="text-emerald-900 dark:text-emerald-200 font-bold">
                            {q.answer}
                          </div>
                        </div>
                      )}

                      {q.explanation && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 text-xs leading-relaxed space-y-1.5">
                          <span className="font-extrabold text-sky-900 dark:text-sky-300 block">
                            【标准采分点推导与详细解析】：
                          </span>
                          <div className="text-slate-800 dark:text-zinc-200">
                            <MarkdownView content={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 底部 Footer 统计信息 */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span>当前展示试题数：</span>
            <strong className="text-sky-900 font-bold">{filteredQuestions.length} / {questions.length}</strong>
            <span className="text-slate-400">· 408 统考标准化试卷结构</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-all cursor-pointer"
          >
            关闭预览
          </button>
        </div>
      </div>
    </div>
  );
}

