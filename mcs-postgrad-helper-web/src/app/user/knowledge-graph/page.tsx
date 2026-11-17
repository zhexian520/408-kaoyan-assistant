"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  BookOpen,
  Sparkles,
  RefreshCw,
  X,
  Network,
  Target,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Info,
  Lightbulb,
  SlidersHorizontal,
} from "lucide-react";
import MarkdownView from "@/components/MarkdownView";
import KnowledgeGraphCanvas, {
  type GraphChapter,
  type GraphPoint,
  type GraphSubject,
} from "@/components/KnowledgeGraphCanvas";

interface PointDetail {
  id: string;
  title: string;
  content: string;
  subject: string;
  chapter_title?: string;
  score_points?: string[];
  knowledge_points?: string[];
  detailed_explanation?: string;
  exam_questions?: Array<{ year?: string; type?: string; stem?: string; answer?: string; analysis?: string }>;
}

const SUBJECT_CODES: Record<string, string> = {
  数据结构: "DS",
  计算机组成原理: "CO",
  操作系统: "OS",
  计算机网络: "CN",
};

const pointToCourseSection = (pointId: string) => {
  const match = /^course_pt_[A-Za-z]+_(\d+)_(\d+)$/.exec(pointId || "");
  return match ? `${match[1]}.${match[2]}` : "";
};

const SUBJECT_ACCENTS: Record<string, { color: string; soft: string; ring: string }> = {
  数据结构: { color: "#7c3aed", soft: "#f3e8ff", ring: "ring-violet-500/15" },
  计算机组成原理: { color: "#2563eb", soft: "#dbeafe", ring: "ring-blue-500/15" },
  操作系统: { color: "#059669", soft: "#d1fae5", ring: "ring-emerald-500/15" },
  计算机网络: { color: "#d97706", soft: "#fef3c7", ring: "ring-amber-500/15" },
};

export default function KnowledgeGraphPage() {
  const [subjects, setSubjects] = useState<GraphSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [graphMode, setGraphMode] = useState<"overview" | "detail">("detail");
  const [showList, setShowList] = useState(false);
  const [importantOnly, setImportantOnly] = useState(false);
  const [layoutSeed, setLayoutSeed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<PointDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/kb/course/graph");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data: GraphSubject[] = json.data || [];
      setSubjects(data);
      if (data.length > 0 && !selectedSubject) {
        setSelectedSubject(data[0].subject);
        setGraphMode("detail");
        const first: Record<string, boolean> = {};
        data[0].chapters.slice(0, 3).forEach((chapter) => {
          first[chapter.chapter_id] = true;
        });
        setExpanded(first);
      }
    } catch (err: any) {
      setError(`知识图谱加载失败：${err.message || "请确认 Java / Python 服务已启动"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = useMemo(
    () => subjects.find((subject) => subject.subject === selectedSubject),
    [subjects, selectedSubject]
  );

  const totalPoints = useMemo(
    () => subjects.reduce((sum, subject) => sum + subject.point_count, 0),
    [subjects]
  );
  const totalChapters = useMemo(
    () => subjects.reduce((sum, subject) => sum + subject.chapter_count, 0),
    [subjects]
  );

  const filteredChapters = useMemo(() => {
    if (!current) return [];
    const keyword = query.trim().toLowerCase();
    return current.chapters
      .map((chapter) => ({
        ...chapter,
        points: chapter.points.filter(
          (point) =>
            !keyword ||
            point.title.toLowerCase().includes(keyword) ||
            chapter.chapter_title.toLowerCase().includes(keyword)
        ),
      }))
      .filter((chapter) => chapter.points.length > 0);
  }, [current, query]);

  const openPoint = async (point: GraphPoint, subjectName?: string) => {
    setDetailLoading(true);
    setDetail({
      id: point.id,
      title: point.title,
      content: "",
      subject: subjectName || selectedSubject,
      chapter_title: "",
    });
    try {
      const res = await fetch(`/api/kb/course/point/${encodeURIComponent(point.id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.code === 200 && json.data) setDetail(json.data);
      }
    } catch {
      // 保留标题占位
    } finally {
      setDetailLoading(false);
    }
  };

  const detailMarkdown = useMemo(() => {
    if (!detail) return "";
    const parts = [detail.content || ""];
    if (detail.score_points?.length) {
      parts.push("", "## 408 采分点", ...detail.score_points.map((item) => `- ${item}`));
    }
    if (detail.exam_questions?.length) {
      parts.push("", "## 关联真题");
      detail.exam_questions.slice(0, 5).forEach((question) => {
        parts.push("", `### ${question.year || ""} ${question.type || ""}`.trim());
        if (question.stem) parts.push(question.stem);
        if (question.answer) parts.push(`**答案：** ${question.answer}`);
        if (question.analysis) parts.push(`**解析：** ${question.analysis}`);
      });
    }
    return parts.join("\n");
  }, [detail]);

  const accent = SUBJECT_ACCENTS[selectedSubject] || SUBJECT_ACCENTS["数据结构"];

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 pb-10">
      {/* 顶部标题与搜索 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
              <Network className="h-3.5 w-3.5" />
              Knowledge Graph · 408 Pilot
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
              408 知识图谱
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
              把 412 个考点、25 个章节和四科关联关系放进一张图里。点击节点查看精讲，右侧直接跳到课程中心、知识库或 AI 追问。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/60 sm:w-72">
              <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索知识点或章节..."
                className="w-full bg-transparent text-xs text-zinc-700 outline-none placeholder:text-zinc-400 dark:text-zinc-200"
              />
            </div>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={loading}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              title="刷新图谱"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-xs text-zinc-500">
            <RefreshCw className="h-4 w-4 animate-spin" /> 正在加载知识图谱...
          </div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "核心考点", value: totalPoints, icon: Layers, tone: "text-violet-600" },
                { label: "章节节点", value: totalChapters, icon: BookOpen, tone: "text-blue-600" },
                { label: "学科数量", value: subjects.length, icon: Network, tone: "text-emerald-600" },
                { label: "当前科目", value: current?.point_count || 0, icon: Target, tone: "text-amber-600" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400">{item.label}</span>
                      <Icon className={`h-3.5 w-3.5 ${item.tone}`} />
                    </div>
                    <p className="mt-1 font-mono text-lg font-black text-slate-900 dark:text-zinc-100">{item.value}</p>
                  </div>
                );
              })}
            </div>

            {/* 学科切换 */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {subjects.map((subject) => {
                const active = subject.subject === selectedSubject;
                const itemAccent = SUBJECT_ACCENTS[subject.subject] || SUBJECT_ACCENTS["数据结构"];
                return (
                  <button
                    key={subject.subject}
                    onClick={() => {
                      setSelectedSubject(subject.subject);
                      setGraphMode("detail");
                      setDetail(null);
                      const next: Record<string, boolean> = {};
                      subject.chapters.slice(0, 3).forEach((chapter) => {
                        next[chapter.chapter_id] = true;
                      });
                      setExpanded(next);
                    }}
                    className={`flex min-w-[180px] shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      active
                        ? "border-transparent bg-white shadow-sm ring-2 dark:bg-zinc-800"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-zinc-700 dark:bg-zinc-800/50"
                    }`}
                    style={active ? { boxShadow: `0 0 0 2px ${itemAccent.color}22`, borderColor: itemAccent.color } : undefined}
                  >
                    <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: itemAccent.color }} />
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-black text-slate-800 dark:text-zinc-100">
                        {subject.subject}
                      </span>
                      <span className="mt-0.5 block text-[9px] text-slate-500">
                        {subject.chapter_count} 章 · {subject.point_count} 个考点
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {!loading && !error && current && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          {/* 图谱区 */}
          <div className="min-w-0 space-y-3">
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setGraphMode("overview")}
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold transition-colors ${
                    graphMode === "overview"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  四科总览
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMode("detail")}
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-extrabold transition-colors ${
                    graphMode === "detail"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  当前学科网络
                </button>
                <button
                  type="button"
                  onClick={() => setImportantOnly((value) => !value)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                    importantOnly
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  <Sparkles className="h-3 w-3" /> 只看重点
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLayoutSeed((value) => value + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <SlidersHorizontal className="h-3 w-3" /> 重新布局
                </button>
                <button
                  type="button"
                  onClick={() => setShowList((value) => !value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {showList ? "隐藏章节" : "章节列表"}
                </button>
              </div>
            </div>

            <KnowledgeGraphCanvas
              subjects={subjects}
              selectedSubject={selectedSubject}
              mode={graphMode}
              query={query}
              selectedPointId={detail?.id}
              importantOnly={importantOnly}
              layoutSeed={layoutSeed}
              onSelectSubject={(subject) => {
                setSelectedSubject(subject);
                setGraphMode("detail");
                setDetail(null);
              }}
              onOpenPoint={(point, subject) => {
                setSelectedSubject(subject);
                void openPoint(point, subject);
              }}
            />

            {showList && (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
                    <Layers className="h-4 w-4 text-blue-600" /> 章节与考点列表
                  </h3>
                  <span className="text-[10px] text-slate-400">{filteredChapters.length} 章</span>
                </div>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {filteredChapters.map((chapter) => {
                    const open = expanded[chapter.chapter_id] ?? !!query.trim();
                    return (
                      <div key={chapter.chapter_id} className="rounded-2xl border border-slate-200 dark:border-zinc-700">
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => ({ ...prev, [chapter.chapter_id]: !open }))}
                          className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: accent.color }} />
                            <span className="truncate text-[11px] font-bold text-slate-800 dark:text-zinc-200">
                              {chapter.chapter_title}
                            </span>
                            <span className="shrink-0 text-[9px] text-slate-400">{chapter.points.length} 个考点</span>
                          </span>
                          {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                        </button>
                        {open && (
                          <div className="grid grid-cols-1 gap-1.5 border-t border-slate-100 p-2 sm:grid-cols-2 dark:border-zinc-800">
                            {chapter.points.map((point) => (
                              <button
                                key={point.id}
                                type="button"
                                onClick={() => void openPoint(point)}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[10px] font-bold text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300"
                              >
                                {point.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 右侧知识点详情 */}
          <aside className="h-fit xl:sticky xl:top-4">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              {detail ? (
                <>
                  <div className="border-b border-slate-100 px-5 py-4 dark:border-zinc-800">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em]" style={{ color: accent.color }}>
                          {detail.subject}
                          {detail.chapter_title ? ` · ${detail.chapter_title}` : ""}
                        </p>
                        <h2 className="mt-1 text-lg font-black text-zinc-900 dark:text-zinc-100">
                          {detail.title}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDetail(null)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800"
                        aria-label="关闭知识点详情"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[560px] overflow-y-auto px-5 py-4">
                    {detailLoading ? (
                      <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400">
                        <RefreshCw className="h-4 w-4 animate-spin" /> 正在加载知识点精讲...
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none text-[13px] leading-7 dark:prose-invert">
                        <MarkdownView content={detailMarkdown} />
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-100 px-5 py-3 dark:border-zinc-800">
                    <div className="grid grid-cols-1 gap-2">
                      <Link
                        href={`/user/courses?subject=${SUBJECT_CODES[detail.subject] || "DS"}&keyword=${encodeURIComponent(detail.title)}${
                          pointToCourseSection(detail.id)
                            ? `&section=${encodeURIComponent(pointToCourseSection(detail.id))}`
                            : ""
                        }`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-700"
                      >
                        <BookOpen className="h-3.5 w-3.5" /> 在课程中心查看
                      </Link>
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/user/knowledge?keyword=${encodeURIComponent(detail.title)}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <Layers className="h-3 w-3" /> 知识库
                        </Link>
                        <Link
                          href={`/user/agent?point=${encodeURIComponent(detail.title)}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          <Sparkles className="h-3 w-3" /> AI 精讲
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: accent.soft, color: accent.color }}>
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <h2 className="mt-3 text-base font-black text-zinc-900 dark:text-zinc-100">
                    点击一个知识点
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    图谱里的小圆点是具体考点，章节圆环是知识模块。点击后会在这里显示精讲、采分点和关联真题，不会跳走。
                  </p>

                  <div className="mt-4 space-y-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/20">
                    <p className="flex items-center gap-1.5 text-[10px] font-extrabold text-blue-700 dark:text-blue-300">
                      <Info className="h-3.5 w-3.5" /> 使用方式
                    </p>
                    <p className="text-[10px] leading-relaxed text-blue-700/80 dark:text-blue-200/80">
                      1. 先看四科总览，理解 408 四门课怎么互相支撑。
                      <br />
                      2. 切到当前学科网络，按章节找具体考点。
                      <br />
                      3. 点击节点，在右侧读精讲，再跳到课程或 AI 追问。
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href="/user/courses"
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      去课程中心
                    </Link>
                    <Link
                      href="/user/knowledge"
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      去知识库
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
