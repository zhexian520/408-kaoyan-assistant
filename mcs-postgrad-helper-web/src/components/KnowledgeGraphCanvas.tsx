"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, Minus, Plus, RotateCcw, Sparkles } from "lucide-react";

export interface GraphPoint {
  id: string;
  title: string;
  difficulty?: string;
  importance?: string;
}

export interface GraphChapter {
  chapter_id: string;
  chapter_title: string;
  chapter_order: number;
  point_count: number;
  points: GraphPoint[];
}

export interface GraphSubject {
  subject: string;
  code?: string;
  chapter_count: number;
  point_count: number;
  chapters: GraphChapter[];
}

type NodeType = "subject" | "chapter" | "point";

interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  subject: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  count?: number;
  point?: GraphPoint;
  chapterId?: string;
}

interface GraphLink {
  source: GraphNode;
  target: GraphNode;
  kind: "subject-chapter" | "chapter-point" | "cross";
}

const SUBJECT_COLORS: Record<string, string> = {
  数据结构: "#7c3aed",
  计算机组成原理: "#2563eb",
  操作系统: "#059669",
  计算机网络: "#d97706",
};

const SUBJECT_SHORT: Record<string, string> = {
  数据结构: "数据结构",
  计算机组成原理: "组成原理",
  操作系统: "操作系统",
  计算机网络: "计算机网络",
};

interface Props {
  subjects: GraphSubject[];
  selectedSubject: string;
  mode: "overview" | "detail";
  query: string;
  selectedPointId?: string;
  importantOnly?: boolean;
  layoutSeed?: number;
  onSelectSubject: (subject: string) => void;
  onOpenPoint: (point: GraphPoint, subject: string) => void;
}

export default function KnowledgeGraphCanvas({
  subjects,
  selectedSubject,
  mode,
  query,
  selectedPointId,
  importantOnly = false,
  layoutSeed = 0,
  onSelectSubject,
  onOpenPoint,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [focusedChapterId, setFocusedChapterId] = useState("");

  const subject = subjects.find((item) => item.subject === selectedSubject) || subjects[0];
  const color = SUBJECT_COLORS[subject?.subject || ""] || "#2563eb";
  const focusedChapter = subject?.chapters.find((chapter) => chapter.chapter_id === focusedChapterId);

  const { nodes, links } = useMemo(() => {
    const nodeList: GraphNode[] = [];
    const linkList: GraphLink[] = [];
    const keyword = query.trim().toLowerCase();

    const matches = (label: string) => !keyword || label.toLowerCase().includes(keyword);

    if (mode === "overview") {
      const positions = [
        { x: 250, y: 210 },
        { x: 750, y: 210 },
        { x: 250, y: 520 },
        { x: 750, y: 520 },
      ];
      subjects.forEach((item, index) => {
        const node: GraphNode = {
          id: `subject-${item.subject}`,
          label: item.subject,
          type: "subject",
          subject: item.subject,
          radius: 52,
          color: SUBJECT_COLORS[item.subject] || "#2563eb",
          count: item.point_count,
          ...(positions[index] || { x: 500, y: 350 }),
        };
        nodeList.push(node);
      });
      const pairs = [
        ["数据结构", "计算机组成原理"],
        ["计算机组成原理", "操作系统"],
        ["操作系统", "计算机网络"],
        ["数据结构", "计算机网络"],
      ];
      pairs.forEach(([a, b]) => {
        const source = nodeList.find((node) => node.subject === a);
        const target = nodeList.find((node) => node.subject === b);
        if (source && target) linkList.push({ source, target, kind: "cross" });
      });
    } else if (subject && focusedChapter) {
      // 聚焦章节：章节居中，知识点围绕章节展示，并显示完整名称
      const points = focusedChapter.points.filter(
        (point) => (!importantOnly || point.difficulty === "重点" || point.importance === "重要") && matches(point.title)
      );
      const chapterNode: GraphNode = {
        id: `chapter-${focusedChapter.chapter_id}`,
        label: focusedChapter.chapter_title,
        type: "chapter",
        subject: subject.subject,
        x: 500,
        y: 360,
        width: 220,
        height: 52,
        color,
        count: focusedChapter.points.length,
        chapterId: focusedChapter.chapter_id,
      };
      nodeList.push(chapterNode);

      const radius = Math.min(255, 150 + points.length * 9);
      points.forEach((point, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(1, points.length) - Math.PI / 2;
        const pointNode: GraphNode = {
          id: `point-${point.id}`,
          label: point.title,
          type: "point",
          subject: subject.subject,
          x: 500 + Math.cos(angle) * radius,
          y: 360 + Math.sin(angle) * radius * 0.82,
          radius: 17,
          color,
          point,
          chapterId: focusedChapter.chapter_id,
        };
        nodeList.push(pointNode);
        linkList.push({ source: chapterNode, target: pointNode, kind: "chapter-point" });
      });
    } else if (subject) {
      // 学科总览：学科在左，章节以卡片形式排成两列，避免小圆点看不清
      const subjectNode: GraphNode = {
        id: `subject-${subject.subject}`,
        label: subject.subject,
        type: "subject",
        subject: subject.subject,
        x: 150,
        y: 360,
        radius: 58,
        color,
        count: subject.point_count,
      };
      nodeList.push(subjectNode);

      const visibleChapters = subject.chapters.filter((chapter) => matches(chapter.chapter_title));
      visibleChapters.forEach((chapter, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const chapterNode: GraphNode = {
          id: `chapter-${chapter.chapter_id}`,
          label: chapter.chapter_title,
          type: "chapter",
          subject: subject.subject,
          x: column === 0 ? 390 : 730,
          y: 72 + row * 58,
          width: 230,
          height: 42,
          color,
          count: chapter.points.length,
          chapterId: chapter.chapter_id,
        };
        nodeList.push(chapterNode);
        linkList.push({ source: subjectNode, target: chapterNode, kind: "subject-chapter" });
      });
    }

    return { nodes: nodeList, links: linkList };
  }, [subjects, selectedSubject, mode, query, importantOnly, layoutSeed, focusedChapterId, subject, focusedChapter, color]);

  const selectedNodeId = selectedPointId ? `point-${selectedPointId}` : "";
  const neighborIds = new Set<string>();
  if (selectedNodeId) {
    links.forEach((link) => {
      if (link.source.id === selectedNodeId) neighborIds.add(link.target.id);
      if (link.target.id === selectedNodeId) neighborIds.add(link.source.id);
    });
  }

  const isDimmed = (node: GraphNode) => {
    if (selectedNodeId && node.id !== selectedNodeId && !neighborIds.has(node.id)) return true;
    const keyword = query.trim().toLowerCase();
    if (!keyword || node.type === "subject") return false;
    return !node.label.toLowerCase().includes(keyword);
  };

  const resetView = () => {
    setZoom(1);
    setFocusedChapterId("");
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-blue-950/20">
      <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-blue-200 bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-blue-700 shadow-sm backdrop-blur dark:border-blue-900 dark:bg-zinc-900/90 dark:text-blue-300">
          {mode === "overview"
            ? "四科总览"
            : focusedChapter
            ? `聚焦：${focusedChapter.chapter_title}`
            : `${SUBJECT_SHORT[selectedSubject] || selectedSubject} · ${nodes.length - 1} 个章节`}
        </span>
        <span className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-500 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
          {nodes.length} 个节点 · {links.length} 条关系
        </span>
        {focusedChapter && (
          <button
            type="button"
            onClick={() => setFocusedChapterId("")}
            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <ChevronLeft className="h-3 w-3" /> 返回章节
          </button>
        )}
      </div>

      <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <button
          type="button"
          onClick={() => setZoom((value) => Math.min(2.2, Math.round((value + 0.15) * 100) / 100))}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-800"
          title="放大"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((value) => Math.max(0.6, Math.round((value - 0.15) * 100) / 100))}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-800"
          title="缩小"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-zinc-800"
          title="重置视图"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {hovered && (
        <div className="absolute bottom-4 left-4 z-10 max-w-xs rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[10px] shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
          <p className="font-extrabold text-slate-800 dark:text-zinc-100">{hovered.label}</p>
          <p className="mt-0.5 text-slate-500">
            {hovered.type === "subject"
              ? "学科主干 · 点击进入学科网络"
              : hovered.type === "chapter"
              ? `${hovered.subject} · ${hovered.count || 0} 个考点 · 点击展开`
              : `${hovered.subject} · 点击查看精讲与真题`}
          </p>
        </div>
      )}

      <svg viewBox="0 0 1000 720" className="h-[620px] w-full">
        <defs>
          <pattern id="graph-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.35" />
          </pattern>
          <filter id="graph-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#2563eb" floodOpacity="0.2" />
          </filter>
        </defs>
        <rect width="1000" height="720" fill="url(#graph-grid)" />

        <g transform={`translate(${500 * (1 - zoom)} ${360 * (1 - zoom)}) scale(${zoom})`}>
          {links.map((link, index) => {
            const dim = isDimmed(link.source) || isDimmed(link.target);
            if (mode === "detail" && !focusedChapter) {
              const midX = (link.source.x + link.target.x) / 2;
              return (
                <path
                  key={`${link.kind}-${index}`}
                  d={`M ${link.source.x + 58} ${link.source.y} C ${midX} ${link.source.y}, ${midX} ${link.target.y}, ${link.target.x - 115} ${link.target.y}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  opacity={dim ? 0.08 : 0.35}
                />
              );
            }
            return (
              <line
                key={`${link.kind}-${index}`}
                x1={link.source.x}
                y1={link.source.y}
                x2={link.target.x}
                y2={link.target.y}
                stroke={link.kind === "cross" ? "#f59e0b" : color}
                strokeWidth={link.kind === "cross" ? 2 : 1.4}
                strokeDasharray={link.kind === "cross" ? "7 6" : undefined}
                opacity={dim ? 0.08 : link.kind === "cross" ? 0.5 : 0.4}
              />
            );
          })}

          {nodes.map((node) => {
            const dim = isDimmed(node);
            if (node.type === "chapter" && node.width) {
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  opacity={dim ? 0.18 : 1}
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(node)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    if (mode === "overview") return;
                    setFocusedChapterId(node.chapterId || "");
                  }}
                >
                  <rect
                    x={-node.width / 2}
                    y={-node.height! / 2}
                    width={node.width}
                    height={node.height}
                    rx={12}
                    fill="#ffffff"
                    stroke={color}
                    strokeWidth="2"
                    filter="url(#graph-glow)"
                  />
                  <rect x={-node.width / 2} y={-node.height! / 2} width={6} height={node.height!} rx={3} fill={color} />
                  <text
                    x={-node.width / 2 + 18}
                    y={-2}
                    fontSize="12"
                    fontWeight="800"
                    fill="#1e293b"
                  >
                    {node.label.length > 15 ? `${node.label.slice(0, 15)}…` : node.label}
                  </text>
                  <text x={-node.width / 2 + 18} y={14} fontSize="9" fontWeight="600" fill="#94a3b8">
                    {node.count || 0} 个考点 · 点击展开
                  </text>
                </g>
              );
            }
            if (node.type === "subject") {
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  opacity={dim ? 0.18 : 1}
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered(node)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelectSubject(node.subject)}
                >
                  <circle r={(node.radius || 50) + 12} fill={node.color} opacity="0.12" />
                  <circle r={node.radius || 50} fill={node.color} filter="url(#graph-glow)" />
                  <text y={-4} textAnchor="middle" fontSize="13" fontWeight="800" fill="#ffffff">
                    {SUBJECT_SHORT[node.label] || node.label}
                  </text>
                  <text y={15} textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff" opacity="0.8">
                    {node.count || 0} 个考点
                  </text>
                  <text y={(node.radius || 50) + 22} textAnchor="middle" fontSize="10" fontWeight="700" fill="#475569">
                    {node.label}
                  </text>
                </g>
              );
            }
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                opacity={dim ? 0.18 : 1}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(node)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  if (node.point) onOpenPoint(node.point, node.subject);
                }}
              >
                {selectedNodeId === node.id && (
                  <circle r={(node.radius || 16) + 9} fill="none" stroke={node.color} strokeWidth="2" opacity="0.45" className="animate-pulse" />
                )}
                <circle r={node.radius || 16} fill={node.color} opacity="0.95" />
                <text y={4} textAnchor="middle" fontSize="9" fontWeight="800" fill="#ffffff">
                  {String.fromCharCode(65 + (node.point ? node.point.title.charCodeAt(0) % 26 : 0))}
                </text>
                <text
                  y={(node.radius || 16) + 15}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="#475569"
                >
                  {node.label.length > 13 ? `${node.label.slice(0, 13)}…` : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-4 right-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-[9px] font-bold text-slate-500 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-violet-600" /> 数据结构</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-blue-600" /> 组成原理</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-600" /> 操作系统</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-600" /> 计算机网络</span>
        <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-500" /> 虚线为跨科桥接</span>
      </div>
    </div>
  );
}
