"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import MarkdownView from "@/components/MarkdownView";
import { 
  FileEdit, 
  Plus, 
  Trash2, 
  Sparkles, 
  Tag, 
  Search, 
  BookOpen, 
  Save, 
  CheckCircle2, 
  Code2, 
  Clock, 
  Share2,
  AlertCircle
} from "lucide-react";

interface UserNoteItem {
  id: number;
  title: string;
  subjectCode: string;
  contentMd: string;
  tagsJson: string;
  relatedKnowledgeId?: string;
  relatedQuestionId?: string;
  excerptSource?: string;
  isAiSummarized: number;
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export default function UserNotesPage() {
  const authToken = () => user?.token || (typeof window !== "undefined" ? localStorage.getItem("408_auth_token") || "" : "");
  const { user } = useAuth();
  const [notes, setNotes] = useState<UserNoteItem[]>([]);
  const [activeNote, setActiveNote] = useState<UserNoteItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("ALL");

  // 编辑态
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubject, setEditSubject] = useState("DS");
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showNotice = (type: "success" | "error", text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 3200);
  };

  const noteStats = useMemo(() => {
    const subjects = new Set(notes.map((n) => n.subjectCode).filter(Boolean));
    const aiCount = notes.filter((n) => n.isAiSummarized === 1).length;
    const latest = notes[0]?.updatedAt
      ? new Date(notes[0].updatedAt).toLocaleDateString("zh-CN")
      : "暂无";
    return { total: notes.length, subjects: subjects.size, aiCount, latest };
  }, [notes]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const token = authToken();
      let url = "/api/user/notes?";
      if (selectedSubject !== "ALL") url += `subjectCode=${selectedSubject}&`;
      if (searchKeyword.trim()) url += `keyword=${encodeURIComponent(searchKeyword.trim())}&`;
      
      const res = await fetch(url, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      const json = await res.json();
      if (json.code === 200) {
        const list: UserNoteItem[] = json.data || [];
        setNotes(list);
        if (list.length > 0) {
          const stillThere = activeNote ? list.find((n) => n.id === activeNote.id) : null;
          if (!stillThere) selectNote(list[0]);
        } else {
          setActiveNote(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [selectedSubject]);

  const selectNote = (n: UserNoteItem) => {
    setActiveNote(n);
    setEditTitle(n.title);
    setEditContent(n.contentMd);
    setEditSubject(n.subjectCode);
  };

  const handleCreateNew = () => {
    const newNote: UserNoteItem = {
      id: 0,
      title: "新建 408 考点笔记",
      subjectCode: "DS",
      contentMd: "# 新考点重点整理\n\n## 1. 概念定义\n请输入知识点核心定义与核心公式：\n$$\\sum_{i=1}^{n} x_i$$\n\n## 2. 算法与考查易错点\n- 易错陷阱 1\n- 易错陷阱 2",
      tagsJson: "[\"复习笔记\", \"408\"]",
      isAiSummarized: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setActiveNote(newNote);
    setEditTitle(newNote.title);
    setEditContent(newNote.contentMd);
    setEditSubject(newNote.subjectCode);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) {
      showNotice("error", "请先填写笔记标题");
      return;
    }
    setSaving(true);
    try {
      const token = authToken();
      const isNew = !activeNote || activeNote.id === 0;
      const url = isNew
        ? "/api/user/notes"
        : `/api/user/notes/${activeNote.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          subjectCode: editSubject,
          contentMd: editContent,
          tagsJson: activeNote?.tagsJson || "[\"考研笔记\"]"
        })
      });
      const json = await res.json();
      if (json.code === 200) {
        await fetchNotes();
        if (json.data) selectNote(json.data);
        showNotice("success", isNew ? "笔记已创建并保存" : "笔记已保存");
      } else {
        showNotice("error", json.message || "笔记保存失败");
      }
    } catch (err) {
      console.error(err);
      showNotice("error", "笔记保存失败，请确认后端服务已启动");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除该笔记？")) return;
    try {
      const res = await fetch(`/api/user/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken()}` },
      });
      const json = await res.json().catch(() => ({}));
      if (json.code === 200) {
        setActiveNote(null);
        await fetchNotes();
        showNotice("success", "笔记已删除");
      } else {
        showNotice("error", json.message || "删除失败");
      }
    } catch (err) {
      console.error(err);
      showNotice("error", "删除失败，请稍后重试");
    }
  };

  const handleAiSummarize = async () => {
    if (!activeNote || activeNote.id === 0) return;
    setSummarizing(true);
    try {
      const res = await fetch(`/api/user/notes/${activeNote.id}/ai-summarize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken()}` },
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        selectNote(json.data);
        setNotes((prev) => prev.map((n) => (n.id === json.data.id ? json.data : n)));
        showNotice("success", "AI 精简总结已生成");
      } else {
        showNotice("error", json.message || "AI 精简总结失败");
      }
    } catch (err) {
      console.error(err);
      showNotice("error", "AI 精简总结失败，请稍后重试");
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 顶部沉浸式笔记工作台 */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-300/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-blue-500/15 dark:border-blue-900">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em]">
              <FileEdit className="h-3.5 w-3.5" />
              Note Workspace
            </div>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl">408 个人考研云笔记</h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-blue-50/90 sm:text-sm">
              支持 LaTeX 数学公式、代码高亮、真题/知识库一键摘录与 AI 精简总结。把零散考点沉淀成自己的考前速记。
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg shadow-blue-950/20 transition-all hover:-translate-y-0.5 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
            新建云笔记
          </button>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "笔记总数", value: noteStats.total, unit: "篇", icon: BookOpen },
            { label: "覆盖学科", value: noteStats.subjects, unit: "科", icon: Tag },
            { label: "AI 提炼", value: noteStats.aiCount, unit: "篇", icon: Sparkles },
            { label: "最近更新", value: noteStats.latest, unit: "", icon: Clock },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between text-[10px] font-bold text-blue-100/80">
                  <span>{item.label}</span>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p className="mt-2 text-xl font-black">
                  {item.value}
                  {item.unit && <span className="ml-1 text-[10px] font-normal text-blue-100/70">{item.unit}</span>}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
          }`}
        >
          {notice.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {notice.text}
        </div>
      )}

      {/* 左右分栏：左侧笔记列表，右侧沉浸式编辑器与预览 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* 左侧笔记列表 */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs flex flex-col space-y-3">
          {/* 筛选与搜索 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="搜索笔记标题或内容..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchNotes()}
              className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-hidden"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
            {["ALL", "DS", "CO", "OS", "NET"].map((code) => (
              <button
                key={code}
                onClick={() => setSelectedSubject(code)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedSubject === code
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          {/* 笔记卡片 */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="animate-pulse rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="h-3 w-14 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="mt-3 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                ))}
              </div>
            ) : notes.length > 0 ? (
              notes.map((n) => {
                const isSelected = activeNote?.id === n.id;
                const preview = n.contentMd
                  .replace(/[#>*`$]/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 72);
                return (
                  <div
                    key={n.id}
                    onClick={() => selectNote(n)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-xs"
                        : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold font-mono">
                        {n.subjectCode}
                      </span>
                      {n.isAiSummarized === 1 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                          <Sparkles className="w-3 h-3" /> 已提炼
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                      {n.title}
                    </h4>
                    <p className="text-[10px] leading-relaxed text-zinc-400 line-clamp-2">
                      {preview || "暂无正文内容"}
                    </p>
                    {n.excerptSource && (
                      <div className="text-[10px] text-zinc-400 truncate">
                        🔗 {n.excerptSource}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>{n.updatedAt ? new Date(n.updatedAt).toLocaleDateString("zh-CN") : "刚刚"}</span>
                      <span>{n.contentMd.length} 字</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  <FileEdit className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">还没有笔记</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    从课程中心、真题或知识库一键摘录，或者新建第一篇。
                  </p>
                </div>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" /> 新建第一篇笔记
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 右侧富文本与 Markdown 预览 */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs flex flex-col space-y-4">
          {activeNote ? (
            <>
              {/* 标题与学科 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="笔记标题..."
                  className="text-lg font-black text-zinc-900 dark:text-zinc-100 bg-transparent border-none focus:outline-hidden flex-1"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold border-none"
                  >
                    <option value="DS">数据结构 (DS)</option>
                    <option value="CO">计算机组成原理 (CO)</option>
                    <option value="OS">操作系统 (OS)</option>
                    <option value="NET">计算机网络 (NET)</option>
                  </select>

                  <button
                    onClick={handleAiSummarize}
                    disabled={summarizing || activeNote.id === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{summarizing ? "提炼中..." : "AI精简总结"}</span>
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? "保存中..." : "保存"}</span>
                  </button>

                  {activeNote.id !== 0 && (
                    <button
                      onClick={() => handleDelete(activeNote.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* AI 精炼卡片提示 */}
              {activeNote.aiSummary && (
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                  <div className="flex items-center gap-1 font-bold text-purple-700 dark:text-purple-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI 考点速记摘要：</span>
                  </div>
                  <p className="leading-relaxed">{activeNote.aiSummary}</p>
                </div>
              )}

              {/* 编辑与实时预览双区 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div className="space-y-1 flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
                    Markdown 编辑器 (支持 LaTeX 公式与代码)
                  </span>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="在此编写笔记，支持 Markdown 与 LaTeX 公式：$$WPL = \sum w_i \times l_i$$"
                    className="w-full flex-1 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 resize-none min-h-[350px]"
                  ></textarea>
                </div>

                <div className="space-y-1 flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
                    渲染预览效果
                  </span>
                  <div className="w-full flex-1 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 overflow-y-auto text-xs leading-relaxed min-h-[350px]">
                    <MarkdownView content={editContent} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-24 text-zinc-400 space-y-2">
              <FileEdit className="w-10 h-10 opacity-30" />
              <p className="text-xs">选择左侧笔记进行阅读，或点击右上角新建</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

