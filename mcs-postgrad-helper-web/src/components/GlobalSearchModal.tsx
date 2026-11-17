"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  X, 
  Sparkles, 
  BookOpen, 
  ArrowRight, 
  Layers, 
  Code2, 
  Cpu, 
  Globe2,
  Clock,
  History,
  CornerDownLeft,
  Flame
} from "lucide-react";
import { 
  search408Knowledge, 
  SearchResultItem, 
  HOT_SEARCH_TOPICS,
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  setSearchBooks
} from "@/data/search/408SearchService";
import SearchHighlight from "./SearchHighlight";
import { TEXTBOOKS_DATA } from "@/data/408TextbooksData";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult?: (result: SearchResultItem) => void;
}

const SUBJECT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DS: { bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300", text: "text-blue-600", label: "数据结构" },
  CO: { bg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300", text: "text-indigo-600", label: "组成原理" },
  OS: { bg: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300", text: "text-purple-600", label: "操作系统" },
  NET: { bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300", text: "text-amber-600", label: "计算机网络" }
};

export default function GlobalSearchModal({ isOpen, onClose, onSelectResult }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState<"ALL" | "DS" | "CO" | "OS" | "NET">("ALL");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/kb/course/all")
      .then((res) => res.json())
      .then((json) => {
        if (json.code === 200 && json.data) {
          const next: Record<string, any> = { ...TEXTBOOKS_DATA };
          Object.entries(json.data).forEach(([code, book]: [string, any]) => {
            if (next[code] && book?.chapters) {
              next[code] = { ...next[code], ...book, chapters: book.chapters };
            }
          });
          setSearchBooks(next);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHistory(getSearchHistory());
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const hits = search408Knowledge(query, filterSubject, 25);
    setResults(hits);
    setActiveIndex(0);
  }, [query, filterSubject]);

  // 全局快捷键处理 (Esc 退出，上下箭头选定，Enter 跳转)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results.length > 0 && results[activeIndex]) {
          handleSelect(results[activeIndex]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, activeIndex]);

  const handleSelect = (item: SearchResultItem) => {
    addSearchHistory(query || item.title);
    onClose();
    if (onSelectResult) {
      onSelectResult(item);
    } else {
      router.push(`/user/courses?subject=${item.subjectCode}&section=${item.sectionId}&keyword=${encodeURIComponent(query)}`);
    }
  };

  const handleApplyHistoryOrHot = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSearchHistory();
    setHistory([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部搜索框区域 */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 408 核心考点、章节、算法、协议（支持同义词：Cache/快排/PV/TLB/三次握手）..."
            className="flex-1 bg-transparent border-none text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-zinc-800 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
          >
            ESC
          </button>
        </div>

        {/* 学科分类筛选栏 */}
        <div className="px-5 py-2.5 bg-slate-50/80 dark:bg-zinc-900/60 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 font-semibold shrink-0 mr-1">学科范围:</span>
          {[
            { id: "ALL", label: "全部四科" },
            { id: "DS", label: "数据结构" },
            { id: "CO", label: "组成原理" },
            { id: "OS", label: "操作系统" },
            { id: "NET", label: "计算机网络" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterSubject(tab.id as any)}
              className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                filterSubject === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 border border-slate-200/60 dark:border-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
          {results.length > 0 && (
            <span className="ml-auto text-[11px] text-slate-400 font-mono shrink-0">
              找到 {results.length} 条相关考点
            </span>
          )}
        </div>

        {/* 结果列表或初始热搜/历史推荐 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!query.trim() ? (
            <div className="space-y-5 p-2">
              {/* 历史搜索 */}
              {history.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      最近搜索历史
                    </span>
                    <button
                      onClick={handleClearHistory}
                      className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      清空历史
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {history.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => handleApplyHistoryOrHot(term)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-zinc-300 text-xs font-medium border border-slate-200/60 dark:border-zinc-700 transition-all flex items-center gap-1.5"
                      >
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 408 核心考点高频词 */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  408 统考高频热搜考点推荐
                </div>
                <div className="flex flex-wrap gap-2">
                  {HOT_SEARCH_TOPICS.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => handleApplyHistoryOrHot(term)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-zinc-300 text-xs font-semibold border border-slate-200 dark:border-zinc-700 shadow-2xs transition-all hover:scale-105 cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Search className="w-10 h-10 mx-auto text-slate-300 dark:text-zinc-600" />
              <p className="text-sm font-bold text-slate-600 dark:text-zinc-300">
                未找到包含 “{query}” 的相关考点
              </p>
              <p className="text-xs text-slate-400">
                请尝试更换关键词，例如：Cache、快排、TLB、三次握手、PV操作
              </p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isActive = activeIndex === idx;
              const subColor = SUBJECT_COLORS[item.subjectCode] || { bg: "bg-slate-100", text: "text-slate-700", label: "408专业课" };

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isActive
                      ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20"
                      : "bg-white dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-700/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${subColor.bg}`}>
                        {item.subjectName}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {item.chapterTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                      <span>直达考点</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <SearchHighlight text={item.title} terms={item.matchedTerms} />
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                    <SearchHighlight text={item.matchedSnippet} terms={item.matchedTerms} />
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* 底部键盘导航提示 */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700 font-mono text-[10px]">↓</kbd>
              切换选择
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 rounded border border-slate-200 dark:border-zinc-700 font-mono text-[10px]">Enter</kbd>
              确认跳转
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            支持 408 全科考纲索引与同义词映射
          </span>
        </div>
      </div>
    </div>
  );
}

