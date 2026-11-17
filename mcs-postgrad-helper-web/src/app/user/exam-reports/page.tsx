"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ExamAnswerSheetModal from "@/components/ExamAnswerSheetModal";
import {
  Award,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

interface TestRecord {
  id: number;
  paperId: number;
  testTitle: string;
  testType: string;
  subjectCode?: string;
  totalScore: number;
  userScore: number;
  timeSpentSeconds: number;
  status: string;
  createdAt: string;
  submitTime?: string;
  weakPointsJson?: string;
  aiReportSummary?: string;
}

const TYPE_LABELS: Record<string, string> = {
  FULL_MOCK: "全真模考",
  AI_MIXED: "AI 混合卷",
  MOCK: "模拟考",
  CHAPTER: "章节测试",
};

export default function ExamReportsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<TestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [inspectRecordId, setInspectRecordId] = useState<number | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);

  const token = () =>
    user?.token || (typeof window !== "undefined" ? localStorage.getItem("408_auth_token") || "" : "");

  const fetchRecords = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/test/records", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        setRecords(json.data || []);
      } else {
        setError(json.message || "模考战报加载失败");
      }
    } catch (err: any) {
      setError(`模考战报加载失败：${err.message || "请确认 Java 服务已启动"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [user?.token]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (typeFilter !== "ALL" && record.testType !== typeFilter) return false;
      if (keyword.trim() && !record.testTitle.toLowerCase().includes(keyword.toLowerCase())) return false;
      return true;
    });
  }, [records, typeFilter, keyword]);

  const stats = useMemo(() => {
    const scores = records.map((record) => Number(record.userScore || 0));
    const total = records.length;
    const best = scores.length ? Math.max(...scores) : 0;
    const avg = scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : 0;
    const latest = records.length ? Number(records[0].userScore || 0) : 0;
    return { total, best, avg, latest };
  }, [records]);

  const openReport = (record: TestRecord, print = false) => {
    setAutoPrint(print);
    setInspectRecordId(record.id);
  };

  const parseWeakPoints = (record: TestRecord) => {
    if (!record.weakPointsJson) return [];
    try {
      const parsed = JSON.parse(record.weakPointsJson);
      return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
              <FileCheck2 className="h-3.5 w-3.5" />
              Mock Exam Reports
            </div>
            <h1 className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">
              模考战报与学情复盘
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              汇总全真模考、AI 混合卷与章节测试记录，支持逐题答卷、AI 采分点复盘和 PDF 导出。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/user/exam-hall" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700">
              <FileText className="h-4 w-4" />
              进入考场
            </Link>
            <button onClick={fetchRecords} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {[
          { label: "累计模考", value: stats.total, unit: "次", icon: FileCheck2, tone: "text-blue-600" },
          { label: "历史最高", value: stats.best, unit: "分", icon: Award, tone: "text-amber-600" },
          { label: "平均得分", value: stats.avg, unit: "分", icon: TrendingUp, tone: "text-emerald-600" },
          { label: "最近一次", value: stats.latest, unit: "分", icon: Target, tone: "text-violet-600" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-400">{item.label}</span>
                <Icon className={`h-4 w-4 ${item.tone}`} />
              </div>
              <p className="mt-2 font-mono text-2xl font-black text-zinc-900 dark:text-zinc-100">
                {item.value}
                <span className="ml-1 text-[10px] font-normal text-zinc-400">{item.unit}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-bold text-zinc-500">
              <Filter className="h-3.5 w-3.5" />
              类型
            </span>
            {[{ code: "ALL", label: "全部" }, { code: "FULL_MOCK", label: "全真模考" }, { code: "AI_MIXED", label: "AI 混合卷" }].map((item) => (
              <button
                key={item.code}
                onClick={() => setTypeFilter(item.code)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  typeFilter === item.code
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-zinc-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex w-full items-center gap-2 sm:w-72">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/60">
              <Search className="h-3.5 w-3.5 text-zinc-400" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索试卷名称..."
                className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-400 dark:text-zinc-200"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white py-20 dark:border-zinc-800 dark:bg-zinc-900">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-xs text-zinc-500">正在加载模考战报...</span>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <FileCheck2 className="mx-auto mb-3 h-8 w-8 text-zinc-300" />
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200">暂无模考战报</p>
          <p className="mt-1 text-xs text-zinc-400">完成一次全真模考或 AI 混合卷后，战报会自动出现在这里。</p>
          <Link href="/user/exam-hall" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white">
            去参加模考 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const total = Number(record.totalScore || 150);
            const score = Number(record.userScore || 0);
            const percent = total > 0 ? Math.round((score / total) * 100) : 0;
            const weakPoints = parseWeakPoints(record);
            return (
              <div key={record.id} className="rounded-3xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                        {TYPE_LABELS[record.testType] || record.testType || "模考"}
                      </span>
                      <h2 className="truncate text-sm font-black text-zinc-900 dark:text-zinc-100">{record.testTitle}</h2>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-zinc-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{record.createdAt?.slice(0, 10) || "近期"}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />用时 {Math.round((record.timeSpentSeconds || 0) / 60)} 分钟</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />得分率 {percent}%</span>
                    </div>
                    {weakPoints.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> 薄弱点
                        </span>
                        {weakPoints.map((point) => (
                          <span key={point} className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            {point}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <p className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400">{score}</p>
                      <p className="text-[10px] text-zinc-400">/ {total} 分</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button onClick={() => openReport(record)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-700">
                        查看报告 <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openReport(record, true)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                        <Download className="h-3.5 w-3.5" /> 导出 PDF
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                  <div className={`h-1.5 rounded-full ${percent >= 70 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, percent)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ExamAnswerSheetModal
        testRecordId={inspectRecordId}
        autoPrint={autoPrint}
        onClose={() => {
          setInspectRecordId(null);
          setAutoPrint(false);
        }}
      />
    </div>
  );
}
