"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  BookOpen, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Bot, 
  Send, 
  Award, 
  FileText, 
  HelpCircle, 
  Code2, 
  Cpu, 
  Layers, 
  Globe2,
  RefreshCw,
  Compass,
  ArrowRight,
  BookmarkCheck,
  AlertTriangle,
  Zap,
  Bookmark,
  Search,
  X,
  History,
  Clock,
  Flame,
  CornerDownLeft,
  Copy,
  Check
} from "lucide-react";
import MarkdownView from "@/components/MarkdownView";
import CodeBlock from "@/components/CodeBlock";
import { useAuth } from "@/context/AuthContext";
import KatexFormula from "@/components/KatexFormula";
import CourseVisualizer from "@/components/CourseVisualizer";
import CourseAnimation, { hasCourseAnimation } from "@/components/CourseAnimation";
import { getFallbackCourseCode } from "@/data/408CourseEnhancements";
import SearchHighlight from "@/components/SearchHighlight";
import GlobalSearchModal from "@/components/GlobalSearchModal";
import { TEXTBOOKS_DATA, SectionContent, TextbookData } from "@/data/408TextbooksData";
import { 
  search408Knowledge, 
  SearchResultItem, 
  HOT_SEARCH_TOPICS,
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  setSearchBooks
} from "@/data/search/408SearchService";

function CourseCenterContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSubject = searchParams.get("subject");
  const urlSection = searchParams.get("section");
  const urlKeyword = searchParams.get("keyword");

  const [selectedSubject, setSelectedSubject] = useState<"DS" | "CO" | "OS" | "NET">("DS");
  const [books, setBooks] = useState<Record<string, TextbookData>>(TEXTBOOKS_DATA);
  const [activeSectionId, setActiveSectionId] = useState("2.2");
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string; isStreaming?: boolean }>>([
    {
      role: "assistant",
      content: "你好！我是你的 408 随堂伴学助教。当前你正在学习【数据结构 · 线性表的链式表示】。遇到不懂的概念、代码或考点，随时向我提问，我将为你进行流式实时解答！"
    }
  ]);
  const [loadingStream, setLoadingStream] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);
  const [courseConversationId, setCourseConversationId] = useState("");
  const [courseContextLoading, setCourseContextLoading] = useState(false);

  // 搜索相关状态
  const [sectionFilter, setSectionFilter] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [liveSuggestions, setLiveSuggestions] = useState<SearchResultItem[]>([]);
  const [searchHistoryList, setSearchHistoryList] = useState<string[]>([]);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 学科列表与题量考点统计
  const subjects = [
    { code: "DS" as const, name: "数据结构", icon: Code2, chapters: 8, points: 83, mastered: 20, tag: "代码与逻辑抽象", color: "from-blue-600 to-indigo-600" },
    { code: "CO" as const, name: "计算机组成原理", icon: Cpu, chapters: 6, points: 79, mastered: 18, tag: "硬件微架构与时序", color: "from-indigo-600 to-purple-600" },
    { code: "OS" as const, name: "操作系统", icon: Layers, chapters: 5, points: 80, mastered: 17, tag: "并发与虚存调度", color: "from-purple-600 to-pink-600" },
    { code: "NET" as const, name: "计算机网络", icon: Globe2, chapters: 6, points: 80, mastered: 23, tag: "分层通信协议栈", color: "from-amber-600 to-rose-600" },
  ];

  // 初始化 URL 参数
  useEffect(() => {
    let normalized: "DS" | "CO" | "OS" | "NET" = "DS";
    if (urlSubject) {
      const upper = urlSubject.toUpperCase();
      const candidate = upper === "CN" ? "NET" : upper;
      if (["DS", "CO", "OS", "NET"].includes(candidate)) {
        normalized = candidate as "DS" | "CO" | "OS" | "NET";
        setSelectedSubject(normalized);
      }
    }

    const book = books[normalized] || books.DS;
    let targetSectionId = urlSection || "";

    // 只有 keyword 时，尝试通过章节标题/考点名模糊定位到具体小节
    if (!targetSectionId && urlKeyword) {
      const normalize = (text: string) =>
        (text || "")
          .replace(/^第?\s*\d+(\.\d+)*\s*[章节]?\s*/, "")
          .replace(/[：:、（）()【】\s·\-—]/g, "")
          .toLowerCase();
      const keyword = normalize(urlKeyword);
      const allSections = (book?.chapters || []).flatMap((chapter: any) => chapter.sections || []);
      const exact = allSections.find(
        (section: any) =>
          normalize(section.title) === keyword ||
          normalize(section.sourceId) === keyword ||
          normalize(section.id) === keyword
      );
      const partial =
        exact ||
        allSections.find((section: any) => {
          const title = normalize(section.title);
          return title && keyword && (title.includes(keyword) || keyword.includes(title));
        });
      if (partial) {
        targetSectionId = partial.id;
      } else {
        // 知识点标题与课程小节标题不完全一致时，退回到所属章节的第一节
        const chapter = (book?.chapters || []).find((item: any) => {
          const title = normalize(item.title);
          if (!title || !keyword) return false;
          const head = title.slice(0, Math.min(4, title.length));
          return title.includes(keyword) || keyword.includes(title) || (head && keyword.includes(head));
        });
        if (chapter?.sections?.[0]) {
          targetSectionId = chapter.sections[0].id;
        }
      }
    }

    if (targetSectionId) {
      setActiveSectionId(targetSectionId);
      // 已定位到具体小节时清空搜索过滤，避免左侧目录把当前小节隐藏
      setSectionFilter("");
    } else if (urlKeyword) {
      setSectionFilter(urlKeyword);
    }
  }, [urlSubject, urlSection, urlKeyword, books]);

  // 全局快捷键 Cmd+K / Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsGlobalModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // 搜索建议与历史加载
  useEffect(() => {
    setSearchHistoryList(getSearchHistory());
  }, []);

  useEffect(() => {
    if (!sectionFilter.trim()) {
      setLiveSuggestions([]);
      return;
    }
    const hits = search408Knowledge(sectionFilter, "ALL", 8);
    setLiveSuggestions(hits);
  }, [sectionFilter]);

  // 点击外部关闭搜索下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetch("/api/kb/course/all")
      .then((res) => res.json())
      .then((json) => {
        if (json.code === 200 && json.data) {
          setBooks((prev) => {
            const next = { ...prev };
            Object.entries(json.data).forEach(([code, book]: [string, any]) => {
              const normalized = code.toUpperCase() === "CN" ? "NET" : code.toUpperCase();
              if (next[normalized] && book?.chapters) {
                next[normalized] = { ...next[normalized], ...book, chapters: book.chapters };
              }
            });
            setSearchBooks(next);
            return next;
          });
        }
      })
      .catch((err) => console.warn("课程知识库加载失败，使用内置教材数据:", err));
  }, []);

  const currentBook = books[selectedSubject] || books.DS;

  // 动态查找当前选中的小节
  let currentSection: SectionContent | undefined;
  let currentChapterTitle = "";
  for (const ch of currentBook.chapters) {
    const found = ch.sections.find((s: any) => s.id === activeSectionId || s.sourceId === activeSectionId);
    if (found) {
      currentSection = found;
      currentChapterTitle = ch.title;
      break;
    }
  }
  // 兜底返回该学科的第一小节
  if (!currentSection && currentBook.chapters[0]?.sections[0]) {
    currentSection = currentBook.chapters[0].sections[0];
    currentChapterTitle = currentBook.chapters[0].title;
  }

  const effectiveCodeSnippet =
    currentSection?.codeSnippet ||
    (currentSection ? getFallbackCourseCode(currentSection.title, selectedSubject) : null);

  const hasManimAnimation = currentSection
    ? hasCourseAnimation(currentSection.title, currentChapterTitle)
    : false;

  // 随堂助教：每个小节一个独立话题，自动恢复上下文
  const courseConversationKey =
    typeof window !== "undefined" && currentSection
      ? `408_course_chat_${user?.userId || 0}_${activeSectionId}`
      : "";

  useEffect(() => {
    if (!currentSection || !courseConversationKey) return;
    const saved = localStorage.getItem(courseConversationKey) || "";
    setCourseConversationId(saved);
    const welcome = {
      role: "assistant" as const,
      content: `你好！我是你的 408 随堂伴学助教。当前正在学习【${currentBook.name} · ${currentSection.title}】。\n\n本小节的提问会保留上下文，你可以连续追问概念、代码、公式和真题陷阱。`,
    };
    setChatMessages([welcome]);
    if (!saved) return;

    let cancelled = false;
    setCourseContextLoading(true);
    fetch(`/pilot/chat/history?conversation_id=${encodeURIComponent(saved)}&limit=30`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("408_auth_token") || ""}`,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const rows = Array.isArray(json.messages) ? json.messages : [];
        if (rows.length > 0) {
          setChatMessages(
            rows.map((row: any) => ({
              role: row.role === "user" ? ("user" as const) : ("assistant" as const),
              content: row.content,
            }))
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCourseContextLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSectionId, currentSection?.title, user?.userId]);

  const ensureCourseConversation = async () => {
    if (courseConversationId) return courseConversationId;
    try {
      const res = await fetch("/pilot/chat/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("408_auth_token") || ""}`,
        },
        body: JSON.stringify({
          title: `随堂问答 · ${currentSection?.title || "课程中心"}`,
        }),
      });
      const json = await res.json();
      const id = json?.conversation?.id || "";
      if (id) {
        setCourseConversationId(id);
        if (courseConversationKey) localStorage.setItem(courseConversationKey, id);
        return id;
      }
    } catch (err) {
      console.warn("创建随堂助教话题失败:", err);
    }
    return "";
  };

  const resetCourseConversation = () => {
    if (courseConversationKey) localStorage.removeItem(courseConversationKey);
    setCourseConversationId("");
    setChatMessages([
      {
        role: "assistant",
        content: `已开启新的随堂问答。当前小节：【${currentSection?.title || "课程中心"}】。你可以从第一个问题开始连续追问。`,
      },
    ]);
  };

  // 切换学科
  const handleSelectSubject = (code: "DS" | "CO" | "OS" | "NET") => {
    setSelectedSubject(code);
    setSectionFilter("");
    setIsSearchFocused(false);
    const targetBook = books[code];
    const firstSec = targetBook.chapters[0]?.sections[0];
    if (firstSec) {
      setActiveSectionId(firstSec.id);
    }
    setChatMessages([
      {
        role: "assistant",
        content: `已为你切换至【${targetBook.name}】课程。当前小节：${firstSec?.title || "第一节"}。遇到任何考点疑难、算法推导或真题问题，随时向我提问！`
      }
    ]);
  };

  // 选择搜索命中项直接跳转
  const handleSelectSearchResult = (item: SearchResultItem) => {
    const normalizedSubject = String(item.subjectCode).toUpperCase() === "CN" ? "NET" : item.subjectCode;
    setSelectedSubject(normalizedSubject as "DS" | "CO" | "OS" | "NET");
    setActiveSectionId(item.sectionId);
    setIsSearchFocused(false);
    setIsGlobalModalOpen(false);
    addSearchHistory(sectionFilter || item.title);
    setSearchHistoryList(getSearchHistory());

    setChatMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `已通过搜索直达【${item.subjectName} · ${item.chapterTitle} · ${item.title}】！已为你定位至教材考点，可直接查阅核心原理解析及考题避坑要点。`
      }
    ]);

    // 滚动正文至顶部
    setTimeout(() => {
      const readingEl = document.getElementById("course-reading-panel");
      if (readingEl) readingEl.scrollTop = 0;
    }, 50);
  };

  // 随堂流式伴学问答 (调用真实 DeepSeek SSE 接口)
  const handleAssistantSend = async (customText?: string) => {
    const textToSend = customText || assistantPrompt.trim();
    if (!textToSend) return;

    setAssistantPrompt("");
    setLoadingStream(true);

    const userMsg = { role: "user" as const, content: textToSend };
    const aiMsgPlaceholder = { role: "assistant" as const, content: "", isStreaming: true };

    setChatMessages((prev) => [...prev, userMsg, aiMsgPlaceholder]);

    try {
      const courseQuestion = `【课程中心：${currentBook.name} - 章节：${currentChapterTitle} - ${currentSection?.title}】${textToSend}`;
      const authToken = typeof window !== "undefined" ? localStorage.getItem("408_auth_token") || "" : "";
      const conversationId = await ensureCourseConversation();
      let response: Response;
      try {
        response = await fetch("/pilot/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            message: courseQuestion,
            conversation_id: conversationId || undefined,
            metadata: {
              subject: selectedSubject.toLowerCase(),
              is_socratic: false,
              course_context: {
                book: currentBook.name,
                chapter: currentChapterTitle,
                section: currentSection?.title,
              },
            },
          }),
        });
        if (!response.ok) throw new Error(`pilot ${response.status}`);
      } catch (pilotError) {
        console.warn("408 Pilot 不可用，课程伴学回退旧 AI 服务:", pilotError);
        response = await fetch("/ai-api/api/ai/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: courseQuestion,
            subject: selectedSubject.toLowerCase(),
            is_socratic: false
          })
        });
      }

      if (!response.body) throw new Error("No body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // 最后未完成的行暂存入 buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const dataStr = trimmed.slice(6).trim();
          if (dataStr === "[DONE]") {
            setLoadingStream(false);
            break;
          }
          try {
            const parsed = JSON.parse(dataStr);
            const isAnswerChunk = parsed.type === "chunk" || parsed.type === undefined;
            if (isAnswerChunk && parsed.content) {
              fullContent += parsed.content;
              setChatMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  last.content = fullContent;
                  last.isStreaming = true;
                }
                return updated;
              });
            }
          } catch {
            // 忽略未完整的 JSON 片段，绝不将 raw json 混入正文
          }
        }
      }

      setChatMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          last.isStreaming = false;
        }
        return updated;
      });
    } catch (err) {
      console.error("伴学助教流式对话异常:", err);
      setChatMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          last.content = "网络连接异常，未能获取助教回答，请检查后端 Python 服务的连通状态。";
          last.isStreaming = false;
        }
        return updated;
      });
    } finally {
      setLoadingStream(false);
    }
  };

  const handleSaveToNote = async () => {
    if (!currentSection) return;
    try {
      const res = await fetch("/api/user/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || localStorage.getItem("408_auth_token") || ""}`,
        },
        body: JSON.stringify({
          title: `${currentBook.name} · ${currentSection.title}`,
          subjectCode: selectedSubject,
          contentMd: `## 考纲要求\n${currentSection.syllabusRequirement}\n\n## 核心概念\n${currentSection.coreConcepts.slice(0, 1200)}`,
          tagsJson: JSON.stringify([currentBook.name, currentChapterTitle, "课程中心摘录"]),
          excerptSource: `${currentBook.name} · ${currentChapterTitle} · ${currentSection.title}`,
        }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setCopiedNote(true);
        setTimeout(() => setCopiedNote(false), 2000);
      } else {
        alert(json.message || "保存笔记失败");
      }
    } catch (e) {
      console.error("保存笔记失败:", e);
      alert("保存笔记失败，请确认 Java 服务已启动");
    }
  };

  const knowledgePointKeyword = currentSection
    ? currentSection.title
        .replace(/^\d+(\.\d+)*\s*/, "")
        .replace(/(的)?(基本)?(概念|应用|原理|特点|定义|存储|结构|算法|分析|比较|实现)$/, "")
        .trim()
    : "";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 全站全局搜索弹窗 (Cmd+K) */}
      <GlobalSearchModal 
        isOpen={isGlobalModalOpen} 
        onClose={() => setIsGlobalModalOpen(false)} 
        onSelectResult={handleSelectSearchResult} 
      />

      {/* 顶部现代化紧凑标头 (去除沉重的大长条黑底) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                  408 课程精讲与考纲研炼中心
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900 font-bold">
                  25 章 76 节统考全真体系
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                融合严蔚敏、唐朔飞、汤小丹与谢希仁教材，提炼规范算法、LaTeX 核心公式推导与避坑指南
              </p>
            </div>
          </div>

          {/* 快捷全站全局搜索呼出按钮 */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsGlobalModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>全站考点关键词检索</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 text-[10px] font-mono text-slate-500 border border-slate-200 dark:border-zinc-700">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* 四大学科切换条 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {subjects.map((s) => {
            const isSelected = selectedSubject === s.code;
            const Icon = s.icon;
            const book = books[s.code];
            const sectionCount = book?.chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0) ?? 0;
            const chapterCount = book?.chapters.length ?? s.chapters;
            return (
              <button
                key={s.code}
                type="button"
                onClick={() => handleSelectSubject(s.code)}
                className={`flex min-w-[172px] shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-white/15" : "bg-white dark:bg-zinc-900"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-black">{s.name}</span>
                  <span className={`mt-0.5 block text-[9px] font-mono ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                    {chapterCount} 章 · {sectionCount} 节
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 课程学习主工作区：3 栏布局（左：章节目录树与检索；中：讲义正文；右：随堂伴学助教） */}
      <div className="grid grid-cols-1 items-stretch gap-5 xl:h-[820px] xl:grid-cols-[240px_minmax(0,1fr)] min-h-[660px]">
        {/* 左栏 (3列)：章节目录树与关键词即时检索 */}
        <div className="hidden min-h-0 self-stretch bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3 xl:flex xl:h-full xl:flex-col relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
            <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-blue-600" />
              章节考纲导航
            </span>
            <span className="text-[11px] text-slate-400 font-mono">共 {currentBook.chapters.length} 章</span>
          </div>

          {/* 关键词即时搜索框与联想下拉 */}
          <div ref={searchContainerRef} className="relative z-30">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索章节或考点 (如: Cache, 快排, PV)..."
                value={sectionFilter}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSectionFilter(e.target.value);
                  setIsSearchFocused(true);
                }}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {sectionFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSectionFilter("");
                    setLiveSuggestions([]);
                  }}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 搜索下拉联想面板 */}
            {isSearchFocused && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-xl p-3 space-y-3 max-h-96 overflow-y-auto">
                {/* 初始状态：历史搜索 + 408 高频热词 */}
                {!sectionFilter.trim() ? (
                  <div className="space-y-3">
                    {searchHistoryList.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                          <span className="flex items-center gap-1">
                            <History className="w-3 h-3" />
                            最近搜索
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              clearSearchHistory();
                              setSearchHistoryList([]);
                            }}
                            className="text-[10px] text-slate-400 hover:text-rose-500"
                          >
                            清空
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {searchHistoryList.slice(0, 6).map((term, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSectionFilter(term);
                              }}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[11px] text-slate-600 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <Flame className="w-3 h-3 text-rose-500" />
                        408 核心考点速搜
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {HOT_SEARCH_TOPICS.slice(0, 8).map((topic, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSectionFilter(topic);
                            }}
                            className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[10px] text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-600 hover:text-white transition-all"
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 检索结果列表 */
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pb-1 border-b border-slate-100 dark:border-zinc-800">
                      <span>搜索结果 ({liveSuggestions.length})</span>
                      <button
                        type="button"
                        onClick={() => setIsGlobalModalOpen(true)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] flex items-center gap-0.5"
                      >
                        <span>打开全景检索</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {liveSuggestions.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400">
                        未找到相关章节，可尝试使用同义词或查看全站检索
                      </p>
                    ) : (
                      liveSuggestions.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectSearchResult(item)}
                          className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer transition-colors border border-transparent hover:border-blue-200/60 dark:hover:border-blue-900 text-left space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600">
                              {item.subjectName} · {item.chapterTitle}
                            </span>
                            <span className="text-blue-600">直达</span>
                          </div>
                          <div className="font-extrabold text-xs text-slate-800 dark:text-zinc-200">
                            <SearchHighlight text={item.title} terms={item.matchedTerms} />
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">
                            <SearchHighlight text={item.matchedSnippet} terms={item.matchedTerms} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 章节目录列表 */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {currentBook.chapters
              .filter((ch) => {
                if (!sectionFilter.trim()) return true;
                const kw = sectionFilter.toLowerCase();
                return (
                  ch.title.toLowerCase().includes(kw) ||
                  ch.sections.some((s) => s.title.toLowerCase().includes(kw) || s.syllabusRequirement.toLowerCase().includes(kw))
                );
              })
              .map((ch) => (
                <div key={ch.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300 px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800/40 rounded-xl">
                    <span className="truncate">{ch.title}</span>
                    {ch.status === "COMPLETED" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{ch.sections.length}节</span>
                    )}
                  </div>

                  <div className="pl-1 space-y-0.5">
                    {ch.sections.map((sec) => {
                      const isSecActive = activeSectionId === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setActiveSectionId(sec.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                            isSecActive
                              ? "bg-blue-600 text-white font-bold shadow-xs"
                              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span className="truncate">{sec.title}</span>
                          {sec.isKey && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 ml-1 font-bold ${
                              isSecActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800 dark:bg-amber-950/60"
                            }`}>
                              408重点
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
            ))}
          </div>

          <div className="shrink-0 rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/20">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-300">
                当前学习位置
              </span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-zinc-900 dark:text-blue-300">
                {currentSection?.isKey ? "408 重点" : "基础考点"}
              </span>
            </div>
            <p className="mt-1.5 truncate text-xs font-bold text-slate-800 dark:text-zinc-200">
              {currentChapterTitle} · {currentSection?.title}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950">
              <div
                className="h-1.5 rounded-full bg-blue-600"
                style={{ width: `${Math.min(100, Math.round(((currentBook.chapters.findIndex((ch) => ch.title === currentChapterTitle) + 1) / Math.max(1, currentBook.chapters.length)) * 100))}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[9px] text-blue-600 dark:text-blue-300">
              <span>章节进度</span>
              <span>
                {currentBook.chapters.findIndex((ch) => ch.title === currentChapterTitle) + 1} / {currentBook.chapters.length}
              </span>
            </div>
            <Link
              href="/user/study-plan"
              className="mt-2.5 flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-blue-700"
            >
              查看完整备考规划 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* 中栏 (5列)：核心教材与讲义精讲 (动态读取选中小节) */}
        <div 
          id="course-reading-panel"
          className="min-h-0 self-stretch bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col overflow-y-auto xl:h-full"
        >
          {currentSection ? (
            <div className="flex flex-1 flex-col space-y-6">
              {/* 顶部标题与功能按钮 */}
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4 flex flex-col gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {currentBook.name} · {currentChapterTitle}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 mt-1 tracking-tight break-words">
                    {currentSection.title}
                  </h2>
                  <div className="mt-3 xl:hidden">
                    <label className="mb-1 block text-[10px] font-bold text-slate-400">快速切换章节</label>
                    <select
                      value={activeSectionId}
                      onChange={(event) => setActiveSectionId(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      {currentBook.chapters.map((chapter) => (
                        <optgroup key={chapter.id} label={chapter.title}>
                          {chapter.sections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.title}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSaveToNote}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                    <span>{copiedNote ? "已存入笔记！" : "存入笔记"}</span>
                  </button>
                  <Link
                    href={`/user/variant?subject=${selectedSubject}&title=${encodeURIComponent(currentSection.title)}&chapter=${encodeURIComponent(currentChapterTitle)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 hover:bg-blue-100 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                    <span>做变式题</span>
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "概念精讲", ok: !!currentSection.coreConcepts },
                    { label: "公式推导", ok: !!currentSection.formulaList?.length },
                    { label: "代码实现", ok: !!effectiveCodeSnippet },
                    { label: "易错点", ok: !!currentSection.examPitfalls?.length },
                    { label: "关联真题", ok: !!currentSection.relatedTrueExams?.length },
                    { label: "动态演示", ok: true },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                        item.ok
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-slate-200 bg-slate-50 text-slate-400 dark:border-zinc-700 dark:bg-zinc-800/60"
                      }`}
                    >
                      {item.ok ? "✓" : "○"} {item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* 408 统考考纲要求 */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900 space-y-1.5">
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                  【408 统考大纲考查要求】
                </span>
                <p className="text-sm sm:text-base text-slate-700 dark:text-zinc-300 leading-7 font-medium">
                  {currentSection.syllabusRequirement}
                </p>
              </div>

              {/* 一、核心概念与考点原理解析 */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-zinc-100 border-l-4 border-blue-600 pl-3">
                  一、核心概念与考点原理解析
                </h3>
                <div className="course-reading-prose text-sm sm:text-[15px] text-slate-700 dark:text-zinc-300 leading-8 font-normal">
                  {currentSection.coreConcepts
                    .split(/(?=^####\s)/m)
                    .filter((part) => part.trim())
                    .map((part, partIndex) => (
                      <div key={partIndex}>
                        <MarkdownView content={part} />
                        {partIndex === 0 && (
                          <div className="my-5 space-y-2.5">
                            {hasManimAnimation && (
                              <>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">
                                    对应知识点动态演示
                                  </h4>
                                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[9px] font-bold text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-300">
                                    边看动画边理解
                                  </span>
                                </div>
                                <CourseAnimation
                                  sectionTitle={currentSection.title}
                                  chapterTitle={currentChapterTitle}
                                />
                              </>
                            )}
                            <CourseVisualizer
                              subjectCode={selectedSubject}
                              sectionTitle={currentSection.title}
                              chapterTitle={currentChapterTitle}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* 二、重点计算公式与模型推导 (LaTeX KaTeX 渲染) */}
              {currentSection.formulaList && currentSection.formulaList.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-zinc-100 border-l-4 border-purple-600 pl-3">
                    二、核心计算公式与模型推导
                  </h3>
                  <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80">
                    {currentSection.formulaList.map((f, fIdx) => (
                      <div key={fIdx} className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-700/60 shadow-xs hover:border-purple-300 transition-colors">
                        <KatexFormula math={f} displayMode={true} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 三、408 统考标准代码实现 / 经典算法 */}
              {effectiveCodeSnippet && (
                <div className="space-y-2.5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-zinc-100 border-l-4 border-emerald-600 pl-3">
                      三、408 统考标准代码实现
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono sm:text-right">
                      {effectiveCodeSnippet.description}
                    </span>
                  </div>

                  <CodeBlock
                    code={effectiveCodeSnippet.code}
                    language={effectiveCodeSnippet.language}
                  />
                </div>
              )}

              {/* 四、408 统考命题高频操作与避坑点 */}
              {currentSection.examPitfalls && currentSection.examPitfalls.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-zinc-100 border-l-4 border-amber-500 pl-3">
                    四、408 统考命题高频操作与避坑点
                  </h3>
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900 space-y-2.5">
                    {currentSection.examPitfalls.map((pitfall, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-2.5 text-sm text-amber-950 dark:text-amber-200 leading-7">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{pitfall}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 五、历年 408 统考真题关联索引 */}
              {currentSection.relatedTrueExams && currentSection.relatedTrueExams.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <h3 className="font-extrabold text-sm text-slate-500 uppercase tracking-wider">
                    五、历年 408 统考真题关联索引
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentSection.relatedTrueExams.map((exam, eIdx) => (
                      <Link
                        key={eIdx}
                        href={`/user/exams?year=${exam.year}&qNumber=${exam.questionNumber}&subject=${selectedSubject.toLowerCase()}`}
                        className="p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-blue-500 hover:shadow-xs flex items-center justify-between text-sm transition-all group bg-white dark:bg-zinc-900 cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-amber-500" />
                            {exam.year} 年统考第 {exam.questionNumber} 题
                          </span>
                          <div className="text-xs text-slate-400 mt-1">{exam.title}</div>
                        </div>
                        <div className="flex items-center gap-1 text-blue-600 font-bold text-[11px]">
                          <span>直达真题</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto flex min-h-[170px] flex-1 flex-col justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-indigo-50/60 to-white px-5 py-6 dark:border-blue-900/60 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-500">
                      本节学习收尾
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-zinc-100">
                      看完动画后，用一道题检验一下
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400">
                      建议先复述核心概念，再进入历年统考真题；如果还有疑问，直接让随堂助教结合本节上下文继续讲。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/user/exams?subject=${selectedSubject.toLowerCase()}&knowledgePoint=${encodeURIComponent(knowledgePointKeyword || currentSection.title)}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-blue-700"
                    >
                      做本节真题 <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <span className="rounded-xl border border-blue-100 bg-white/70 px-2.5 py-2 text-[9px] font-bold text-blue-600 dark:border-blue-900 dark:bg-zinc-900 dark:text-blue-300">
                      按知识点：{knowledgePointKeyword || currentSection.title}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center py-16 text-slate-400 text-sm">请选择左侧章节开始阅读</p>
          )}
        </div>

        {/* 随堂伴学助教浮动抽屉 */}
        {assistantOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs" onClick={() => setAssistantOpen(false)}>
        <div
          className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col justify-between space-y-3 border-l border-slate-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-slate-100 dark:border-zinc-800 pb-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100">
                随堂伴学助教 (DeepSeek)
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                courseConversationId
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}>
                {courseConversationId ? "上下文已开启" : "首次提问自动建话题"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {courseConversationId && (
                <button
                  type="button"
                  onClick={resetCourseConversation}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-bold text-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  新话题
                </button>
              )}
              <span className={`w-2 h-2 rounded-full ${courseContextLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`}></span>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800"
                aria-label="关闭随堂助教"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 对话消息区 */}
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px] pr-1">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-xs ml-4"
                    : "bg-slate-50 dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 rounded-tl-xs mr-1 shadow-xs"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="font-medium whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <MarkdownView content={msg.content} />
                )}
                {msg.isStreaming && (
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-600 animate-pulse align-middle"></span>
                )}
              </div>
            ))}
          </div>

          {/* 针对当前章节的追问速测胶囊 */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800 shrink-0">
            <span className="text-[10px] text-slate-400 font-bold block">本节针对性追问：</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => handleAssistantSend(`请结合 408 统考真题要求，详细分析【${currentSection?.title}】的考点精髓与常见陷阱`)}
                className="text-[10px] px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors cursor-pointer"
              >
                本节核心精讲？
              </button>
              <button
                type="button"
                onClick={() => handleAssistantSend(`请针对【${currentSection?.title}】出一道 408 高仿单选题并附带详细得分解析`)}
                className="text-[10px] px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors cursor-pointer"
              >
                出一道速测题？
              </button>
              <button
                type="button"
                onClick={() => handleAssistantSend(`请用通俗通透的大白话讲解【${currentSection?.title}】`)}
                className="text-[10px] px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors cursor-pointer"
              >
                大白话讲透？
              </button>
            </div>
          </div>

          {/* 随堂输入框 */}
          <div className="flex gap-1.5 shrink-0">
            <input
              type="text"
              placeholder={`提问关于【${currentSection?.title?.slice(0, 10)}...】`}
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAssistantSend()}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => handleAssistantSend()}
              disabled={loadingStream || !assistantPrompt.trim()}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {loadingStream ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-3 text-xs font-black text-white shadow-xl shadow-purple-600/30 transition-all hover:scale-105 hover:bg-purple-700"
      >
        <Bot className="h-4 w-4" />
        随堂助教
      </button>
    </div>
  );
}

export default function CourseCenterPage() {
  return (
    <Suspense fallback={
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-zinc-500 font-medium">正在装载 408 全科精讲讲义与检索索引...</p>
      </div>
    }>
      <CourseCenterContent />
    </Suspense>
  );
}
