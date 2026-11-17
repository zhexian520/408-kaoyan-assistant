"use client";

import React, { useEffect, useRef, useState } from "react";
import { 
  X, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  Award, 
  FileText, 
  Brain,
  Download,
  Zap,
  Bookmark
} from "lucide-react";
import MarkdownView from "@/components/MarkdownView";

interface TestDetailItem {
  questionId: string;
  questionNumber: number;
  questionType: string;
  subjectCode: string;
  stem: string;
  score: number;
  maxScore?: number;
  standardAnswer: string;
  userAnswer: string;
  isCorrect: number | null;
  scoreEarned: number;
  aiFeedback?: string;
  missingPoints?: string[];
  errorAnalysis?: string;
  optimizationAdvice?: string;
  explanation?: string;
}

interface TestReportData {
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
  details: TestDetailItem[];
  weakPoints?: string[];
  aiReportSummary?: string;
}

interface ExamAnswerSheetModalProps {
  testRecordId: number | null;
  onClose: () => void;
  autoPrint?: boolean;
}

const SUBJECT_NAMES: Record<string, string> = {
  ds: "数据结构",
  co: "组成原理",
  os: "操作系统",
  cn: "计算机网络"
};

export default function ExamAnswerSheetModal({ testRecordId, onClose, autoPrint = false }: ExamAnswerSheetModalProps) {
  const [data, setData] = useState<TestReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "WRONG" | "CORRECT">("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [pdfBusy, setPdfBusy] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!testRecordId) {
      setData(null);
      return;
    }
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/test/report/${testRecordId}`);
        const json = await res.json();
        if (json.code === 200 && json.data) {
          setData(json.data);
        }
      } catch (err) {
        console.error("获取测评报告答卷失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [testRecordId]);

  const handleDownloadPdf = async () => {
    if (!data || !reportContentRef.current || pdfBusy) return;
    setPdfBusy(true);
    const wasDark = document.documentElement.classList.contains("dark");
    let clone: HTMLElement | null = null;
    let safeStyle: HTMLStyleElement | null = null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      clone = reportContentRef.current.cloneNode(true) as HTMLElement;
      clone.style.width = "980px";
      clone.style.maxWidth = "980px";
      clone.style.padding = "28px";
      clone.style.background = "#ffffff";
      clone.style.color = "#111827";
      clone.style.position = "fixed";
      clone.style.left = "0";
      clone.style.top = "0";
      clone.style.zIndex = "99999";
      clone.style.pointerEvents = "none";
      clone.style.overflow = "visible";
      clone.id = "pdf-export-root";
      document.body.appendChild(clone);

      document.documentElement.classList.remove("dark");

      safeStyle = document.createElement("style");
      safeStyle.id = "pdf-safe-color-style";
      safeStyle.textContent = `
        html, body, body * {
          color: #334155 !important;
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          background-image: none !important;
          box-shadow: none !important;
          outline-color: #cbd5e1 !important;
          text-decoration-color: #334155 !important;
        }
        body *::before, body *::after { display: none !important; }
        #pdf-export-root h1, #pdf-export-root h2, #pdf-export-root h3, #pdf-export-root strong { color: #0f172a !important; }
        #pdf-export-root .text-blue-600, #pdf-export-root .text-blue-700 { color: #1d4ed8 !important; }
        #pdf-export-root .text-rose-500, #pdf-export-root .text-rose-600 { color: #be123c !important; }
        #pdf-export-root .text-emerald-600 { color: #047857 !important; }
      `;
      document.head.appendChild(safeStyle);

      const canvas = await html2canvas(clone, {
        scale: 0.75,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1040,
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const pageContentHeight = pageHeight - margin * 2;
      const pxPerMm = canvas.width / contentWidth;
      const maxSlicePx = Math.max(1, Math.floor(pageContentHeight * pxPerMm));
      let cursorY = margin;

      for (let offset = 0; offset < canvas.height; offset += maxSlicePx) {
        const sliceHeight = Math.min(maxSlicePx, canvas.height - offset);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sliceHeight;
        const ctx = slice.getContext("2d");
        if (!ctx) continue;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, -offset);

        const imageHeight = sliceHeight / pxPerMm;
        if (cursorY + imageHeight > pageHeight - margin) {
          pdf.addPage();
          cursorY = margin;
        }
        pdf.addImage(
          slice.toDataURL("image/jpeg", 0.92),
          "JPEG",
          margin,
          cursorY,
          contentWidth,
          imageHeight
        );
        cursorY += imageHeight + 2;
      }

      pdf.save(`408模考报告_${data.testTitle || "模拟考"}_${testRecordId}.pdf`);
    } catch (err) {
      console.error("PDF 导出失败:", err);
      alert("PDF 生成失败，请稍后重试或使用浏览器打印另存为 PDF。");
    } finally {
      if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
      if (safeStyle && safeStyle.parentNode) safeStyle.parentNode.removeChild(safeStyle);
      if (wasDark) document.documentElement.classList.add("dark");
      setPdfBusy(false);
    }
  };

  useEffect(() => {
    if (!autoPrint || !data) return;
    const timer = window.setTimeout(() => {
      void handleDownloadPdf();
    }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, data]);

  if (!testRecordId) return null;

  const handlePrint = () => {
    void handleDownloadPdf();
  };

  const scrollToQuestion = (qNum: number) => {
    const el = document.getElementById(`modal-q-${qNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const filteredDetails = data?.details.filter((q) => {
    if (filterType === "WRONG") {
      const isOk = q.isCorrect === 1 || q.scoreEarned >= (q.score || 2);
      if (isOk) return false;
    } else if (filterType === "CORRECT") {
      const isOk = q.isCorrect === 1 || q.scoreEarned >= (q.score || 2);
      if (!isOk) return false;
    }
    if (subjectFilter !== "ALL" && q.subjectCode?.toLowerCase() !== subjectFilter.toLowerCase()) {
      return false;
    }
    return true;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="print-report bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 顶部工具栏 (打印时自动隐藏) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                全真模考答卷明细与 AI 专属复盘
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold border border-blue-200">
                  Record #{testRecordId}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                完整 47 题考生答卷比对、主观题 AI 采分点判定及提分建议
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={pdfBusy}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="导出或打印为 PDF 格式"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>{pdfBusy ? "正在生成 PDF..." : "导出 PDF 报告"}</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 模态框主体内容区 (可滚动) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 font-bold">正在提取全卷 47 题原始答卷与采分点明细...</p>
            </div>
          ) : data ? (
            <div ref={reportContentRef} className="space-y-6">
              
              {/* 打印专用正式文头 */}
              <div className="hidden print:block text-center pb-4 border-b border-slate-300">
                <h1 className="text-xl font-black text-slate-900">408 计算机考研智能助手 · 全真模拟考答卷与学情诊断报告</h1>
                <p className="text-xs text-slate-500 mt-1">
                  试卷: {data.testTitle} · 满分: {data.totalScore} 分 · 考生成绩: {data.userScore} 分 · 用时: {Math.floor(data.timeSpentSeconds / 60)} 分钟
                </p>
              </div>

              {/* 成绩核心概览看板 */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-zinc-800/40 dark:to-zinc-800/20 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/70 dark:border-zinc-700">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">统考模拟考场档案</span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100 mt-0.5">
                      {data.testTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xs text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">考生最终得分</span>
                      <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                        {data.userScore}
                        <span className="text-xs text-slate-400 font-normal"> / {data.totalScore}分</span>
                      </span>
                    </div>

                    <div className="px-4 py-2 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xs text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">全卷正确率</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-zinc-100 font-mono">
                        {data.accuracyRate}%
                      </span>
                    </div>

                    <div className="px-4 py-2 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xs text-center">
                      <span className="text-[10px] text-slate-400 font-bold block">答题耗时</span>
                      <span className="text-lg font-black text-slate-700 dark:text-zinc-200 font-mono">
                        {Math.floor(data.timeSpentSeconds / 60)} 分钟
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 科得分明细网格 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { code: "ds", name: "数据结构", max: 45, score: data.subjectScores?.ds || 0, color: "text-blue-600 bg-blue-50 border-blue-200" },
                    { code: "co", name: "组成原理", max: 45, score: data.subjectScores?.co || 0, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
                    { code: "os", name: "操作系统", max: 35, score: data.subjectScores?.os || 0, color: "text-purple-600 bg-purple-50 border-purple-200" },
                    { code: "cn", name: "计算机网络", max: 25, score: data.subjectScores?.cn || 0, color: "text-emerald-600 bg-emerald-50 border-emerald-200" }
                  ].map((sub) => {
                    const rate = Math.round((sub.score / sub.max) * 100);
                    return (
                      <div key={sub.code} className="p-3 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                          <span>{sub.name}</span>
                          <span className="font-mono text-blue-600">{sub.score} / {sub.max}分</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-zinc-700 overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block text-right font-mono">得分率 {rate}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 🤖 AI 考试深度诊断与提分建议专区 */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-zinc-100">
                        DeepSeek AI 为本次模考定制的提分与突破建议
                      </h4>
                      <p className="text-xs text-slate-400">基于 47 题卷面得失分特征智能归纳，点对点指引后向复习</p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 font-bold border border-purple-200">
                    专家级阅卷归因
                  </span>
                </div>

                {/* AI 诊断总结内容 */}
                {data.aiReportSummary && (
                  <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900 text-xs text-purple-950 dark:text-purple-200 leading-relaxed">
                    <MarkdownView content={data.aiReportSummary} />
                  </div>
                )}

                {/* 薄弱考点胶囊群 */}
                {data.weakPoints && data.weakPoints.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                      ⚠️ 本次模考失分重灾区考点 (共 {data.weakPoints.length} 处)：
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {data.weakPoints.map((wp, idx) => (
                        <span 
                          key={idx} 
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[11px] font-bold border border-rose-200/80"
                        >
                          {wp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 题号快速定位与过滤器导航 */}
              <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-3.5 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">题型过滤:</span>
                    <button
                      type="button"
                      onClick={() => setFilterType("ALL")}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filterType === "ALL" ? "bg-blue-600 text-white shadow-xs" : "bg-white dark:bg-zinc-800 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      全部试题 ({data.details.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType("WRONG")}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filterType === "WRONG" ? "bg-rose-600 text-white shadow-xs" : "bg-white dark:bg-zinc-800 text-rose-600 hover:bg-rose-50"
                      }`}
                    >
                      仅看失分错题 ({data.wrongCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType("CORRECT")}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filterType === "CORRECT" ? "bg-emerald-600 text-white shadow-xs" : "bg-white dark:bg-zinc-800 text-emerald-600 hover:bg-emerald-50"
                      }`}
                    >
                      正确题目 ({data.correctCount})
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">学科:</span>
                    {["ALL", "ds", "co", "os", "cn"].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setSubjectFilter(sc)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          subjectFilter === sc ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900" : "bg-white dark:bg-zinc-800 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {sc === "ALL" ? "全部" : SUBJECT_NAMES[sc]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1-47 题号矩阵速查 */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] text-slate-400 font-bold block mb-2">题号直通定位器 (绿色正确 / 红色失分):</span>
                  <div className="grid grid-cols-10 sm:grid-cols-16 md:grid-cols-24 gap-1.5">
                    {data.details.map((q) => {
                      const isOk = q.isCorrect === 1 || q.scoreEarned >= (q.score || 2);
                      return (
                        <button
                          key={q.questionNumber}
                          type="button"
                          onClick={() => scrollToQuestion(q.questionNumber)}
                          className={`h-7 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                            isOk
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                          }`}
                          title={`第 ${q.questionNumber} 题: 得 ${q.scoreEarned} 分`}
                        >
                          {q.questionNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 47 道题逐题答卷明细卡片列表 */}
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    卷面逐题作答明细 (当前展示 {filteredDetails.length} 题)
                  </h4>
                  <span className="text-xs text-slate-400">客观题 1-40 题 (每题2分) · 主观题 41-47 题 (大题采分点评阅)</span>
                </div>

                {filteredDetails.map((q) => {
                  const isOk = q.isCorrect === 1 || q.scoreEarned >= (q.score || 2);
                  const isChoice = q.questionType === "choice";

                  return (
                    <div
                      key={q.questionId}
                      id={`modal-q-${q.questionNumber}`}
                      className={`bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border transition-all space-y-4 shadow-xs ${
                        isOk ? "border-slate-200 dark:border-zinc-800" : "border-rose-200 dark:border-rose-900/60 bg-rose-50/10"
                      }`}
                    >
                      {/* 题目头部标签栏 */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono text-xs font-bold flex items-center justify-center">
                            {q.questionNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            {SUBJECT_NAMES[q.subjectCode?.toLowerCase()] || q.subjectCode?.toUpperCase()}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            {isChoice ? "单选题" : "综合应用题"}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">满分 {q.score} 分</span>
                        </div>

                        {/* 得分与正误徽章 */}
                        <div className="flex items-center gap-2">
                          {isOk ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>得分: {q.scoreEarned} 分 (正确)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs font-bold border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>得分: {q.scoreEarned} 分 (失分)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 题干内容 */}
                      <div className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 leading-relaxed">
                        <MarkdownView content={q.stem} />
                      </div>

                      {/* 作答比对区 (客观题 vs 主观题) */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                            <span className="text-[11px] font-bold text-slate-400 block mb-1">考生提交作答：</span>
                            <div className="text-xs font-mono font-bold">
                              {q.userAnswer ? (
                                <span className={isOk ? "text-emerald-600" : "text-rose-600"}>
                                  {q.userAnswer}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic font-normal">（未作答留白）</span>
                              )}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                            <span className="text-[11px] font-bold text-slate-400 block mb-1">官方标准答案：</span>
                            <div className="text-xs font-mono font-bold text-emerald-600">
                              {q.standardAnswer || "参考综合题评分细则"}
                            </div>
                          </div>
                        </div>

                        {/* 主观题 AI 采分点批语与缺失点 */}
                        {q.aiFeedback && (
                          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
                            <span className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                              <Brain className="w-3.5 h-3.5" />
                              AI 采分点评定反馈：
                            </span>
                            <p className="leading-relaxed">{q.aiFeedback}</p>
                            {q.missingPoints && q.missingPoints.length > 0 && (
                              <div className="pt-1">
                                <span className="font-bold text-rose-700 dark:text-rose-400">缺失采分点: </span>
                                <span className="text-rose-600 dark:text-rose-300">{q.missingPoints.join("；")}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 官方参考解析 */}
                      {q.explanation && (
                        <div className="p-4 rounded-2xl bg-blue-50/30 dark:bg-blue-950/20 border border-blue-200/50 space-y-2">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-400 block">
                            【官方标准答案与详细解析】
                          </span>
                          <div className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                            <MarkdownView content={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-slate-400">
              未检索到该场次的测评记录，请确认记录 ID 是否正确。
            </div>
          )}
        </div>

        {/* 底部关闭与快速操作栏 */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-xs text-slate-500">
            答卷记录编号: <span className="font-mono font-bold text-slate-900 dark:text-zinc-200">#REC-{testRecordId}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={pdfBusy}
              type="button"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{pdfBusy ? "正在生成 PDF..." : "导出 / 下载 PDF 报告"}</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              关闭答卷
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

