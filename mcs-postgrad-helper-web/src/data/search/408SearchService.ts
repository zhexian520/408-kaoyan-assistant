import { TEXTBOOKS_DATA, TextbookData } from "@/data/408TextbooksData";

let searchBooks: Record<string, TextbookData> = TEXTBOOKS_DATA;

/** 用 MySQL 统一知识库数据替换静态教材，供全局搜索使用。 */
export function setSearchBooks(books: Record<string, TextbookData>) {
  searchBooks = books;
}
import synonymsData from "./synonyms.json";

export interface SearchResultItem {
  id: string;
  subjectCode: "DS" | "CO" | "OS" | "NET";
  subjectName: string;
  chapterId: string;
  chapterTitle: string;
  sectionId: string;
  sectionTitle: string;
  kind: "chapter" | "section" | "point" | "concept";
  title: string;
  matchedSnippet: string;
  matchedTerms: string[];
  score: number;
}

export const HOT_SEARCH_TOPICS = [
  "Cache组相联",
  "WPL带权路径",
  "KMP算法",
  "三次握手与四次挥手",
  "PV信号量操作",
  "虚拟内存TLB",
  "拓扑排序与关键路径",
  "TCP拥塞控制",
  "红黑树与AVL",
  "IEEE 754浮点数",
  "Dijkstra最短路径",
  "页面置换LRU",
  "子网掩码CIDR",
  "五段指令流水线",
  "磁盘调度SSTF"
];

const SEARCH_HISTORY_KEY = "408_courses_search_history_v1";

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(term: string): string[] {
  if (typeof window === "undefined" || !term.trim()) return [];
  try {
    const cleaned = term.trim();
    const existing = getSearchHistory().filter((t) => t.toLowerCase() !== cleaned.toLowerCase());
    const updated = [cleaned, ...existing].slice(0, 10);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearSearchHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {}
}

/** 规范化搜索词：大小写不敏感，I/O 转 io */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/i\s*\/\s*o/gi, "io").trim();
}

/** 基于同义词词库扩展检索词 */
export function expandQueryWithSynonyms(rawQuery: string): string[] {
  const normalized = normalizeText(rawQuery);
  const terms = new Set<string>();
  if (normalized) terms.add(normalized);

  const synonymsList = synonymsData as string[][];
  for (const group of synonymsList) {
    const matched = group.some((word) => {
      const nw = normalizeText(word);
      return nw && (normalized.includes(nw) || nw.includes(normalized));
    });
    if (matched) {
      group.forEach((w) => {
        const nw = normalizeText(w);
        if (nw) terms.add(nw);
      });
    }
  }

  return Array.from(terms);
}

/** 从长文本中提取围绕关键词的高亮上下文片段 */
function extractSnippet(text: string, queryTerms: string[], snippetLen: number = 100): string {
  const clean = text.replace(/[\r\n#*`]+/g, " ").trim();
  const lower = clean.toLowerCase();

  let firstIndex = -1;
  let matchedWord = "";

  for (const term of queryTerms) {
    const idx = lower.indexOf(term);
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) {
      firstIndex = idx;
      matchedWord = term;
    }
  }

  if (firstIndex === -1) {
    return clean.slice(0, snippetLen) + (clean.length > snippetLen ? "..." : "");
  }

  const start = Math.max(0, firstIndex - 30);
  const end = Math.min(clean.length, firstIndex + matchedWord.length + 70);

  let snippet = clean.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < clean.length) snippet = snippet + "...";

  return snippet;
}

/**
 * 核心搜索函数：检索 408 全部四科教材知识体系
 */
export function search408Knowledge(
  query: string,
  filterSubject?: "DS" | "CO" | "OS" | "NET" | "ALL",
  limit: number = 20
): SearchResultItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queryTerms = expandQueryWithSynonyms(trimmed);
  const results: SearchResultItem[] = [];

  const subjectKeys: Array<"DS" | "CO" | "OS" | "NET"> = ["DS", "CO", "OS", "NET"];

  for (const code of subjectKeys) {
    if (filterSubject && filterSubject !== "ALL" && filterSubject !== code) {
      continue;
    }

    const book = searchBooks[code];
    if (!book) continue;

    for (const ch of book.chapters) {
      const chLower = ch.title.toLowerCase();

      // 检查章级匹配
      let chScore = 0;
      for (const term of queryTerms) {
        if (chLower === term) chScore += 120;
        else if (chLower.includes(term)) chScore += 80;
      }
      if (chScore > 0) {
        results.push({
          id: `ch-${code}-${ch.id}`,
          subjectCode: code,
          subjectName: book.name,
          chapterId: ch.id,
          chapterTitle: ch.title,
          sectionId: ch.sections[0]?.id || `${ch.id}.1`,
          sectionTitle: ch.sections[0]?.title || ch.title,
          kind: "chapter",
          title: ch.title,
          matchedSnippet: `${book.name} · ${ch.title}（本章共含 ${ch.sections.length} 节重点考纲考点）`,
          matchedTerms: queryTerms,
          score: chScore
        });
      }

      // 检查节级与正文内容匹配
      for (const sec of ch.sections) {
        const secTitleLower = sec.title.toLowerCase();
        const reqLower = (sec.syllabusRequirement || "").toLowerCase();
        const coreLower = (sec.coreConcepts || "").toLowerCase();
        const pitfallsStr = (sec.examPitfalls || []).join(" ").toLowerCase();

        let secScore = 0;
        const matchedInSec: string[] = [];

        for (const term of queryTerms) {
          if (secTitleLower === term) {
            secScore += 150;
            matchedInSec.push(term);
          } else if (secTitleLower.includes(term)) {
            secScore += 90;
            matchedInSec.push(term);
          } else if (reqLower.includes(term)) {
            secScore += 60;
            matchedInSec.push(term);
          } else if (pitfallsStr.includes(term)) {
            secScore += 50;
            matchedInSec.push(term);
          } else if (coreLower.includes(term)) {
            secScore += 40;
            matchedInSec.push(term);
          }
        }

        if (secScore > 0) {
          // 决定摘录内容
          let snippet = "";
          if (coreLower.length > 0) {
            snippet = extractSnippet(sec.coreConcepts, queryTerms);
          } else if (sec.syllabusRequirement) {
            snippet = sec.syllabusRequirement;
          } else {
            snippet = `${book.name} · ${ch.title} · ${sec.title}`;
          }

          results.push({
            id: `sec-${code}-${sec.id}`,
            subjectCode: code,
            subjectName: book.name,
            chapterId: ch.id,
            chapterTitle: ch.title,
            sectionId: sec.id,
            sectionTitle: sec.title,
            kind: "section",
            title: sec.title,
            matchedSnippet: snippet,
            matchedTerms: Array.from(new Set(matchedInSec)),
            score: secScore
          });
        }
      }
    }
  }

  // 按相关性打分降序排列
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

