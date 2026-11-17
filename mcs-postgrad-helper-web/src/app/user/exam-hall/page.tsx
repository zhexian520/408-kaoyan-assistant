"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  Clock, 
  Send, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Award, 
  FileText,
  ChevronRight,
  Sparkles,
  BarChart3,
  Bookmark,
  Shuffle,
  Calendar,
  Layers,
  ArrowRight,
  Printer,
  Brain,
  Download,
  ExternalLink,
  FileCheck2,
  CheckCircle2,
  CalendarDays
} from "lucide-react";
import MarkdownView from "@/components/MarkdownView";
import ExamAnswerSheetModal from "@/components/ExamAnswerSheetModal";

interface OptionItem {
  key: string;
  text: string;
}

interface QuestionItem {
  id: string;
  questionNumber: number;
  score: number;
  questionType: string;
  subjectCode: string;
  subjectName: string;
  chapterName: string;
  stem: string;
  options: OptionItem[];
  answer: string;
  explanation?: string;
  examPointAnalysis?: string;
  originYear?: number;
}

interface PaperData {
  paper: {
    id: number;
    year: number;
    title: string;
    totalScore: number;
    durationMinutes: number;
    questionCount: number;
  };
  questions: QuestionItem[];
}

interface TestDetailVO {
  questionId: string;
  questionNumber: number;
  questionType: string;
  subjectCode: string;
  stem: string;
  maxScore: number;
  standardAnswer: string;
  userAnswer: string;
  isCorrect: number | null;
  scoreEarned: number;
  aiFeedback: string;
  missingPoints?: string[];
  errorAnalysis?: string;
  optimizationAdvice?: string;
  explanation?: string;
}

interface GradingResult {
  testRecordId: number;
  paperId: number;
  testTitle: string;
  totalScore: number;
  userScore: number;
  timeSpentSeconds: number;
  totalCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;
  subjectScores: Record<string, number>;
  details: TestDetailVO[];
  weakPoints: string[];
  aiReportSummary: string;
}

function ExamHallContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialYear = searchParams.get("year") ? Number(searchParams.get("year")) : 2026;

  // 模考两种模式: 'ai_mixed' (历届题目混合出题) vs 'yearly_full' (历届整套真题全卷模考)
  const [examMode, setExamMode] = useState<"ai_mixed" | "yearly_full">("ai_mixed");
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [paperData, setPaperData] = useState<PaperData | null>(null);
  const [loading, setLoading] = useState(true);

  // 答题状态
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(180 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // 测评报告状态
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState<GradingResult | null>(null);

  // 往期模考记录与复盘报告档案
  const [hallTab, setHallTab] = useState<"EXAM" | "RECORDS">("EXAM");
  const [pastRecords, setPastRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [inspectRecordId, setInspectRecordId] = useState<number | null>(null);

  const loadPastRecords = async () => {
    try {
      setRecordsLoading(true);
      const uid = user?.userId || 2;
      const res = await fetch(`/api/test/records?userId=${uid}`, {
        headers: { Authorization: `Bearer ${user?.token || localStorage.getItem("408_auth_token") || ""}` },
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setPastRecords(json.data);
      }
    } catch (e) {
      console.error("加载模考历史记录失败:", e);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    loadPastRecords();
  }, [user]);

  const yearsList = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];

  // 加载试卷
  const loadPaper = async () => {
    setLoading(true);
    setReport(null);
    setAnswers({});
    setSecondsRemaining(180 * 60);

    try {
      if (examMode === "ai_mixed") {
        // 模式一：AI 智能抽卷历届混合模考
        const res = await fetch("/ai-api/api/ai/exams/mixed-paper");
        const json = await res.json();
        if (json.code === 200 && json.data) {
          setPaperData(json.data);
        }
      } else {
        // 模式二：历届单年整套真题
        const res = await fetch(`/api/exams/year/${selectedYear}`);
        const json = await res.json();
        if (json.code === 200 && json.data) {
          setPaperData(json.data);
        }
      }
    } catch (err) {
      console.error("加载模考试卷失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaper();
  }, [examMode, selectedYear]);

  // 计时器
  useEffect(() => {
    if (!isTimerRunning || report !== null) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, report]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (questionId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubjectiveChange = (questionId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const scrollToQuestion = (qNum: number) => {
    const el = document.getElementById(`q-${qNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSubmit = async () => {
    if (!paperData) return;
    const confirmSubmit = window.confirm("确定现在交卷吗？系统将立即进行客观题判分与主观大题 AI 采分点阅卷，错题将自动沉淀至错题本。");
    if (!confirmSubmit) return;

    setSubmitting(true);
    const timeSpent = 180 * 60 - secondsRemaining;

    const answerPayload = Object.entries(answers).map(([qid, ans]) => ({
      questionId: qid,
      userAnswer: ans,
    }));

    try {
      const currentUid = user?.userId || 2;
      if (examMode === "ai_mixed") {
        // 模式一提交给 Python 混合判分引擎
        const res = await fetch("/ai-api/api/ai/exams/submit-hybrid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUid,
            paperId: 999999,
            testTitle: "408 统考历届真题混合模拟卷 (AI智能组卷)",
            timeSpentSeconds: timeSpent,
            answers: answerPayload,
          }),
        });
        const json = await res.json();
        if (json.code === 200 && json.data) {
          setReport(json.data);
          loadPastRecords();
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          alert(json.message || "交卷失败");
        }
      } else {
        // 模式二提交给 Java 业务网关
        const res = await fetch("/api/test/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token || localStorage.getItem("408_auth_token") || ""}`,
          },
          body: JSON.stringify({
            userId: currentUid,
            paperId: paperData.paper.id,
            testTitle: `${paperData.paper.year}年408全真模拟考`,
            testType: "FULL_MOCK",
            timeSpentSeconds: timeSpent,
            answers: answerPayload,
          }),
        });
        const json = await res.json();
        if (json.code === 200 && json.data) {
          setReport(json.data);
          loadPastRecords();
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          alert(json.message || "交卷失败");
        }
      }
    } catch (err) {
      console.error("提交试卷失败:", err);
      alert("提交异常，请检查后端服务");
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).filter((k) => answers[k] && answers[k].trim() !== "").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 考场顶级主导航：在线全真模考 VS 往期模考记录与复盘报告档案 */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-2.5 sm:p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHallTab("EXAM")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              hallTab === "EXAM"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>✍️ 408 全真模拟考答题区</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setHallTab("RECORDS");
              loadPastRecords();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              hallTab === "RECORDS"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>📜 往期模考记录与复盘报告</span>
            {pastRecords.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                hallTab === "RECORDS" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
              }`}>
                {pastRecords.length} 场
              </span>
            )}
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400 font-medium pr-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>全卷 47 题 AI 采分点自动判分 · 详细答卷可一键导出 PDF 报告</span>
        </div>
      </div>

      {hallTab === "RECORDS" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <span>往期 408 全真模拟考试卷档案与复盘报告</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold border border-blue-200">
                  共 {pastRecords.length} 场测评
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                点击任意考试记录即可回看 47 题全卷考生原始作答、标准答案、AI 采分点评语及导出标准 PDF 档案
              </p>
            </div>
            <button
              onClick={() => setHallTab("EXAM")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>开启新一场模考</span>
            </button>
          </div>

          {recordsLoading ? (
            <div className="py-20 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 font-bold">正在提取历史模考档案与 AI 评卷建议...</p>
            </div>
          ) : pastRecords.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">暂无历史模考记录</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                完成一场 408 全真模考后，系统将自动留存 47 题原始答卷、AI 采分点阅卷明细与专属攻坚建议。
              </p>
              <button
                onClick={() => setHallTab("EXAM")}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                进入全真模考 (180分钟)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pastRecords.map((rec) => {
                let weakPoints: string[] = [];
                try {
                  if (rec.weakPointsJson) weakPoints = JSON.parse(rec.weakPointsJson);
                } catch (e) {}

                return (
                  <div
                    key={rec.id}
                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-blue-400/80 rounded-2xl p-5 sm:p-6 shadow-xs transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md border border-blue-200">
                            #{rec.id}
                          </span>
                          <h3 className="text-base font-black text-slate-900 dark:text-zinc-100">
                            {rec.testTitle}
                          </h3>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 font-medium">
                            {rec.testType === "FULL_MOCK" ? "408 全真模考" : "专项突破"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          交卷时间: {rec.submitTime ? new Date(rec.submitTime).toLocaleString("zh-CN") : rec.createdAt} · 答题用时: {Math.max(1, Math.round(rec.timeSpentSeconds / 60))} 分钟
                        </p>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 dark:bg-zinc-800/60 px-4 py-2.5 rounded-xl border border-slate-200/80 shrink-0">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">测试得分</span>
                          <span className="text-xl sm:text-2xl font-black text-blue-600 font-mono">
                            {rec.userScore}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">/ {rec.totalScore}分</span>
                        </div>
                        <div className="h-7 w-px bg-slate-200 dark:bg-zinc-700"></div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">状态</span>
                          <span className="text-xs font-bold text-emerald-600">已智能判卷</span>
                        </div>
                      </div>
                    </div>

                    {/* AI 诊断评语 */}
                    {rec.aiReportSummary && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed space-y-1.5">
                        <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>AI 本次考试综合评定与诊断摘要：</span>
                        </div>
                        <p>{rec.aiReportSummary}</p>
                      </div>
                    )}

                    {/* 薄弱考点标签 */}
                    {weakPoints.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-400 font-semibold mr-1">失分薄弱考点:</span>
                        {weakPoints.slice(0, 8).map((wp, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                            {wp}
                          </span>
                        ))}
                        {weakPoints.length > 8 && (
                          <span className="text-[10px] text-slate-400">+{weakPoints.length - 8}个薄弱点</span>
                        )}
                      </div>
                    )}

                    {/* 操作按钮区 */}
                    <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setInspectRecordId(rec.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>查看具体答卷与 AI 建议 (47题)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectRecordId(rec.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" />
                        <span>导出 PDF 报告</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 模式选择导航选项卡 */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => {
              if (report === null || confirm("切换模式将重新开启新试卷，确定切换吗？")) {
                setExamMode("ai_mixed");
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              examMode === "ai_mixed"
                ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-xs ring-1 ring-zinc-200 dark:ring-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <Shuffle className="w-4 h-4 text-blue-600" />
            <span>模式一：历届题目混合组卷 (AI智能抽卷模考)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (report === null || confirm("切换模式将重新开启新试卷，确定切换吗？")) {
                setExamMode("yearly_full");
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              examMode === "yearly_full"
                ? "bg-white dark:bg-zinc-900 text-purple-600 shadow-xs ring-1 ring-zinc-200 dark:ring-zinc-700"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            }`}
          >
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>模式二：历届整套真题全卷模考 (历年原卷)</span>
          </button>
        </div>

        {/* 模式切换辅助动作 */}
        {examMode === "ai_mixed" ? (
          <button
            onClick={loadPaper}
            disabled={loading || submitting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-all cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>🎲 AI 重新组一套新卷</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500">选择统考年份:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              disabled={report !== null}
              className="bg-zinc-100 dark:bg-zinc-800 font-bold text-xs rounded-xl px-3 py-2 border border-zinc-300 dark:border-zinc-700 cursor-pointer"
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  {y} 年 408 统考原卷 (150分)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 顶部模考控制栏 (吸顶) */}
      <div className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-16 z-30 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
            {paperData?.paper.title || "408 全真模拟考场"}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
            全卷 47 题 · 满分 150 分
          </span>
          <span className="text-[11px] text-zinc-400">
            {report === null ? "⚠️ 答案与解析在交卷前严格隐藏，交卷后由 AI 依据采分点全量评定" : "✅ 已交卷，答案解析与采分点已解锁"}
          </span>
        </div>

        {report === null ? (
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* 倒计时与已作答进度 */}
            <div className="flex shrink-0 items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-mono text-sm font-bold border border-blue-200 dark:border-blue-900">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            <div className="shrink-0 text-xs font-semibold text-zinc-500">
              已作答: <span className="text-blue-600 font-bold text-sm">{answeredCount}</span> / 47
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "AI 采分点批改中..." : "立即交卷"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
              ✓ 智能评卷报告已生成
            </span>
            <button
              onClick={loadPaper}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              再测一次
            </button>
          </div>
        )}
      </div>

      {/* 测评报告展示卡片（交卷后显示，优雅白底质感） */}
      {report && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-900 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                408 全真模拟考 AI 智能阅卷报告
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-100">{report.testTitle}</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">耗时: {Math.floor(report.timeSpentSeconds / 60)} 分钟 · 满分 150 分</p>
            </div>

            <div className="flex items-center gap-5 bg-slate-50 dark:bg-zinc-800/60 px-5 py-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-700/80">
              <div>
                <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">考生最终得分</span>
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{report.userScore}</span>
                <span className="text-xs text-slate-400 ml-1">/ 150 分</span>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-zinc-700"></div>
              <div>
                <span className="text-xs text-slate-500 dark:text-zinc-400 block font-medium">全卷正确率</span>
                <span className="text-2xl font-bold text-slate-800 dark:text-zinc-100">{report.accuracyRate}%</span>
                <span className="text-xs text-slate-400 block">{report.correctCount} 对 · {report.wrongCount} 错</span>
              </div>
            </div>
          </div>

          {/* 四科小分分布 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { code: "ds", label: "数据结构", score: report.subjectScores?.ds || 0, max: 45 },
              { code: "co", label: "组成原理", score: report.subjectScores?.co || 0, max: 45 },
              { code: "os", label: "操作系统", score: report.subjectScores?.os || 0, max: 35 },
              { code: "cn", label: "计算机网络", score: report.subjectScores?.cn || 0, max: 25 },
            ].map((sub) => (
              <div key={sub.code} className="bg-slate-50 dark:bg-zinc-800/40 rounded-xl p-3 border border-slate-200/60 dark:border-zinc-800">
                <div className="flex justify-between text-xs text-slate-600 dark:text-zinc-400 font-medium mb-1.5">
                  <span>{sub.label}</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">{sub.score} / {sub.max}分</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (sub.score / sub.max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 综合评价与薄弱点 */}
          <div className="bg-slate-50 dark:bg-zinc-800/40 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-700 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              AI 备考诊断与学情复盘
            </h3>
            <div className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
              <MarkdownView content={report.aiReportSummary} />
            </div>
            {report.weakPoints && report.weakPoints.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-slate-500 font-semibold mr-1">失分薄弱考点已自动录入错题本:</span>
                {report.weakPoints.map((wp, idx) => (
                  <span key={idx} className="text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-200 font-medium">
                    {wp}
                  </span>
                ))}
              </div>
            )}

            {/* 核心操作动作栏 */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-zinc-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Brain className="w-4 h-4 text-purple-600" />
                <span>AI 已完成全卷 47 题客观题与采分点判卷，已生成专属攻坚建议</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setInspectRecordId(report.testRecordId)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>查看全卷 47 题答卷明细与 AI 建议</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectRecordId(report.testRecordId)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>导出本场 PDF 报告</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 答题区与答题卡主网格 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* 试题列表主区域 (占 3 列) */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="py-24 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-zinc-500">正在生成 408 全真模拟考试卷与题目...</p>
            </div>
          ) : paperData ? (
            paperData.questions.map((q) => {
              const uAns = answers[q.id] || "";
              const reportDetail = report?.details.find((d) => d.questionId === q.id);
              const isChoice = q.questionType === "choice" || q.questionType === "SINGLE_CHOICE";

              return (
                <div
                  key={q.id}
                  id={`q-${q.questionNumber}`}
                  className={`bg-white dark:bg-zinc-900 rounded-2xl p-5 sm:p-6 border transition-all space-y-4 ${
                    reportDetail
                      ? reportDetail.isCorrect === 1 || (reportDetail.scoreEarned >= q.score * 0.6)
                        ? "border-emerald-300 dark:border-emerald-800 shadow-xs"
                        : "border-red-300 dark:border-red-800 shadow-xs"
                      : "border-zinc-200 dark:border-zinc-800 shadow-xs"
                  }`}
                >
                  {/* 题头 */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-zinc-900 dark:text-zinc-100">
                        第 {q.questionNumber} 题
                      </span>
                      {q.originYear && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold">
                          {q.originYear}年原题
                        </span>
                      )}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                        {q.subjectName}
                      </span>
                      <span className="text-xs text-zinc-500">
                        ({isChoice ? "单选题" : "综合应用题"} · {q.score} 分)
                      </span>
                    </div>

                    {reportDetail && (
                      <div className="flex items-center gap-1.5">
                        {reportDetail.isCorrect === 1 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg">
                            <CheckCircle className="w-3.5 h-3.5" /> 得 {reportDetail.scoreEarned} 分
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/50 px-2.5 py-1 rounded-lg">
                            <XCircle className="w-3.5 h-3.5" /> 得 {reportDetail.scoreEarned} 分
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 题干 (渲染 KaTeX & Markdown) */}
                  <div className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed font-normal">
                    <MarkdownView content={q.stem} />
                  </div>

                  {/* 客观单选题选项答题交互 */}
                  {isChoice ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-2">
                      {q.options?.map((opt) => {
                        const isSelected = uAns === opt.key;
                        const isCorrectOption = report && q.answer === opt.key;
                        const isUserWrongOption = report && isSelected && q.answer !== opt.key;

                        let cardStyle = "border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 hover:bg-zinc-100";
                        if (isSelected && !report) {
                          cardStyle = "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500 font-bold";
                        } else if (isCorrectOption) {
                          cardStyle = "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold text-emerald-900";
                        } else if (isUserWrongOption) {
                          cardStyle = "border-red-500 bg-red-50/70 dark:bg-red-950/40 line-through opacity-80 text-red-900";
                        }

                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => !report && handleSelectOption(q.id, opt.key)}
                            disabled={report !== null}
                            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${cardStyle}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                              }`}
                            >
                              {opt.key}
                            </span>
                            <span className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed pt-0.5">
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    // 主观大题作答交互区
                    <div className="space-y-3 my-2">
                      <label className="text-xs font-semibold text-zinc-500 block">
                        请在此书写解题思路、核心推导或伪代码（提交后将由 AI 依据 408 采分点进行细粒度阅卷）：
                      </label>
                      <textarea
                        rows={5}
                        value={uAns}
                        disabled={report !== null}
                        onChange={(e) => handleSubjectiveChange(q.id, e.target.value)}
                        placeholder="在此输入您的作答..."
                        className="w-full text-xs sm:text-sm p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition-all outline-hidden resize-y"
                      />
                    </div>
                  )}

                  {/* 交卷后：详细智能阅卷评语与官方解析与采分点展示 */}
                  {reportDetail && (
                    <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          AI 智能评卷分析与采分点
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {reportDetail.aiFeedback}
                      </p>

                      {/* 官方标准答案 */}
                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                        <span className="font-bold text-emerald-600 text-xs block mb-1">【标准参考答案】：</span>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-zinc-100 border border-zinc-200/60">
                          {q.answer || reportDetail.standardAnswer}
                        </div>
                      </div>

                      {/* 官方详细解析 */}
                      {q.explanation && (
                        <div className="pt-2">
                          <span className="font-bold text-blue-600 text-xs block mb-1">【官方详细解析】：</span>
                          <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200/60">
                            <MarkdownView content={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : null}
        </div>

        {/* 侧边答题卡栏 (占 1 列) */}
        <div className="lg:col-span-1 space-y-4 sticky top-36">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
              <span>全卷答题卡</span>
              <span className="text-xs text-zinc-400 font-normal">共 47 题</span>
            </h3>

            {/* 状态图例 */}
            <div className="flex items-center gap-3 text-[11px] text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                <span>已作答</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full border border-zinc-300"></span>
                <span>未答</span>
              </div>
              {report && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span>正解</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span>失分</span>
                  </div>
                </>
              )}
            </div>

            {/* 题目编号网格 */}
            <div className="grid grid-cols-6 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {paperData?.questions.map((q) => {
                const isAnswered = !!(answers[q.id] && answers[q.id].trim() !== "");
                const reportDetail = report?.details.find((d) => d.questionId === q.id);

                let btnStyle = "border-zinc-200 dark:border-zinc-700 text-zinc-600 hover:bg-zinc-100";
                if (reportDetail) {
                  if (reportDetail.isCorrect === 1 || (reportDetail.scoreEarned >= q.score * 0.6)) {
                    btnStyle = "bg-emerald-500 text-white border-emerald-500 font-bold";
                  } else {
                    btnStyle = "bg-rose-500 text-white border-rose-500 font-bold";
                  }
                } else if (isAnswered) {
                  btnStyle = "bg-blue-600 text-white border-blue-600 font-bold shadow-xs";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => scrollToQuestion(q.questionNumber)}
                    className={`h-8 rounded-lg border text-xs flex items-center justify-center transition-all cursor-pointer ${btnStyle}`}
                  >
                    {q.questionNumber}
                  </button>
                );
              })}
            </div>

            {report === null && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                {submitting ? "正在阅卷..." : "交卷查看成绩"}
              </button>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {/* 全真模考答卷明细与 AI 专属复盘弹窗 (47题标准试卷) */}
      <ExamAnswerSheetModal
        testRecordId={inspectRecordId}
        onClose={() => setInspectRecordId(null)}
      />
    </div>
  );
}

export default function ExamHallPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">加载模考考场中...</div>}>
      <ExamHallContent />
    </Suspense>
  );
}
