"use client";

import React, { useId } from "react";

type SubjectKey = "ds" | "co" | "os" | "cn";

interface TopicVisualProps {
  subject?: string;
  topic?: string;
  className?: string;
}

function normalizeSubject(subject?: string): SubjectKey {
  const value = (subject || "").toLowerCase();
  if (value.includes("组成") || value.includes("计组") || value === "co") return "co";
  if (value.includes("操作系统") || value === "os") return "os";
  if (value.includes("网络") || value.includes("计网") || value === "cn") return "cn";
  return "ds";
}

const SUBJECT_LABELS: Record<SubjectKey, string> = {
  ds: "数据结构",
  co: "计算机组成原理",
  os: "操作系统",
  cn: "计算机网络",
};

export default function TopicVisual({ subject, topic, className = "" }: TopicVisualProps) {
  const key = normalizeSubject(subject);
  const rawId = useId().replace(/:/g, "");
  const gradientId = `topic-visual-${rawId}`;
  const glowId = `topic-glow-${rawId}`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-sky-50 to-white dark:border-indigo-900/50 dark:from-indigo-950/50 dark:via-sky-950/30 dark:to-zinc-900 ${className}`}
    >
      <svg viewBox="0 0 420 220" className="h-full w-full" role="img" aria-label={`${SUBJECT_LABELS[key]} 考点示意图`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#4f46e5" floodOpacity="0.25" />
          </filter>
        </defs>

        <rect x="0" y="0" width="420" height="220" fill="transparent" />
        <g stroke="#c7d2fe" strokeWidth="1" opacity="0.55">
          {Array.from({ length: 11 }).map((_, index) => (
            <line key={`v-${index}`} x1={index * 42} y1="0" x2={index * 42} y2="220" />
          ))}
          {Array.from({ length: 6 }).map((_, index) => (
            <line key={`h-${index}`} x1="0" y1={index * 44} x2="420" y2={index * 44} />
          ))}
        </g>

        {key === "ds" && (
          <g>
            <g stroke="#94a3b8" strokeWidth="3" opacity="0.55">
              <line x1="70" y1="70" x2="160" y2="55" />
              <line x1="70" y1="70" x2="130" y2="140" />
              <line x1="160" y1="55" x2="245" y2="90" />
              <line x1="130" y1="140" x2="245" y2="90" />
              <line x1="245" y1="90" x2="330" y2="58" />
              <line x1="245" y1="90" x2="320" y2="150" />
              <line x1="130" y1="140" x2="220" y2="175" />
              <line x1="220" y1="175" x2="320" y2="150" />
            </g>
            <g stroke={`url(#${gradientId})`} strokeWidth="7" strokeLinecap="round" filter={`url(#${glowId})`}>
              <line x1="70" y1="70" x2="160" y2="55" />
              <line x1="160" y1="55" x2="245" y2="90" />
              <line x1="245" y1="90" x2="330" y2="58" />
            </g>
            {[
              [70, 70, "v1"],
              [160, 55, "v2"],
              [130, 140, "v3"],
              [245, 90, "v4"],
              [330, 58, "v5"],
              [320, 150, "v6"],
              [220, 175, "v7"],
            ].map(([x, y, label]) => (
              <g key={String(label)}>
                <circle cx={Number(x)} cy={Number(y)} r="17" fill="#ffffff" stroke="#4f46e5" strokeWidth="4" />
                <text x={Number(x)} y={Number(y) + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="#312e81">
                  {label}
                </text>
              </g>
            ))}
            <text x="24" y="205" fontSize="12" fontWeight="800" fill="#4338ca">
              最短路径 · 图与 Dijkstra
            </text>
          </g>
        )}

        {key === "co" && (
          <g>
            <rect x="150" y="52" width="120" height="92" rx="14" fill={`url(#${gradientId})`} filter={`url(#${glowId})`} />
            <text x="210" y="92" textAnchor="middle" fontSize="14" fontWeight="800" fill="#ffffff">CPU</text>
            <text x="210" y="112" textAnchor="middle" fontSize="9" fill="#e0e7ff">取指 · 译码 · 执行</text>
            <rect x="42" y="56" width="82" height="36" rx="9" fill="#ffffff" stroke="#818cf8" strokeWidth="3" />
            <text x="83" y="79" textAnchor="middle" fontSize="10" fontWeight="800" fill="#4338ca">Cache</text>
            <rect x="42" y="116" width="82" height="36" rx="9" fill="#ffffff" stroke="#60a5fa" strokeWidth="3" />
            <text x="83" y="139" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1d4ed8">主存</text>
            <rect x="300" y="56" width="78" height="36" rx="9" fill="#ffffff" stroke="#38bdf8" strokeWidth="3" />
            <text x="339" y="79" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0369a1">寄存器</text>
            <rect x="300" y="116" width="78" height="36" rx="9" fill="#ffffff" stroke="#818cf8" strokeWidth="3" />
            <text x="339" y="139" textAnchor="middle" fontSize="10" fontWeight="800" fill="#4338ca">总线</text>
            <g stroke="#6366f1" strokeWidth="3" strokeDasharray="7 5">
              <line x1="124" y1="74" x2="150" y2="82" />
              <line x1="124" y1="134" x2="150" y2="118" />
              <line x1="270" y1="82" x2="300" y2="74" />
              <line x1="270" y1="118" x2="300" y2="134" />
            </g>
            <text x="24" y="205" fontSize="12" fontWeight="800" fill="#4338ca">
              存储层次 · 数据通路 · 指令执行
            </text>
          </g>
        )}

        {key === "os" && (
          <g>
            <rect x="34" y="48" width="105" height="54" rx="12" fill="#ffffff" stroke="#818cf8" strokeWidth="3" />
            <text x="86" y="70" textAnchor="middle" fontSize="10" fontWeight="800" fill="#4338ca">进程 / 线程</text>
            <text x="86" y="86" textAnchor="middle" fontSize="8" fill="#6366f1">就绪 · 运行 · 阻塞</text>
            <rect x="164" y="42" width="112" height="66" rx="12" fill={`url(#${gradientId})`} filter={`url(#${glowId})`} />
            <text x="220" y="68" textAnchor="middle" fontSize="11" fontWeight="800" fill="#ffffff">页表 / TLB</text>
            <text x="220" y="86" textAnchor="middle" fontSize="8" fill="#e0e7ff">逻辑页 → 物理块</text>
            <rect x="300" y="48" width="86" height="54" rx="12" fill="#ffffff" stroke="#38bdf8" strokeWidth="3" />
            <text x="343" y="70" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0369a1">内存帧</text>
            <text x="343" y="86" textAnchor="middle" fontSize="8" fill="#0ea5e9">Page Frame</text>
            <rect x="90" y="132" width="240" height="42" rx="12" fill="#ffffff" stroke="#a5b4fc" strokeWidth="3" />
            <text x="210" y="150" textAnchor="middle" fontSize="10" fontWeight="800" fill="#4338ca">磁盘 / 文件系统 / 设备管理</text>
            <text x="210" y="164" textAnchor="middle" fontSize="8" fill="#6366f1">调度 · 置换 · 持久化</text>
            <g stroke="#6366f1" strokeWidth="3" strokeDasharray="7 5">
              <line x1="139" y1="75" x2="164" y2="75" />
              <line x1="276" y1="75" x2="300" y2="75" />
              <line x1="220" y1="108" x2="220" y2="132" />
            </g>
            <text x="24" y="205" fontSize="12" fontWeight="800" fill="#4338ca">
              进程调度 · 虚拟内存 · 文件系统
            </text>
          </g>
        )}

        {key === "cn" && (
          <g>
            {[
              { y: 42, label: "应用层", color: "#6366f1" },
              { y: 72, label: "传输层", color: "#0ea5e9" },
              { y: 102, label: "网络层", color: "#14b8a6" },
              { y: 132, label: "数据链路层", color: "#f59e0b" },
              { y: 162, label: "物理层", color: "#ef4444" },
            ].map((layer, index) => (
              <g key={layer.label}>
                <rect x={70 + index * 8} y={layer.y} width={250 - index * 16} height="24" rx="8" fill={layer.color} opacity="0.92" />
                <text x={195} y={layer.y + 16} textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">
                  {layer.label}
                </text>
              </g>
            ))}
            <path d="M338 54 C390 92 390 132 338 170" fill="none" stroke="#4f46e5" strokeWidth="4" strokeDasharray="8 6" />
            <circle cx="338" cy="54" r="7" fill="#4f46e5" />
            <circle cx="338" cy="170" r="7" fill="#0ea5e9" />
            <text x="24" y="205" fontSize="12" fontWeight="800" fill="#4338ca">
              分层协议 · 封装与解封装
            </text>
          </g>
        )}
      </svg>

      <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[10px] font-extrabold text-indigo-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/80 dark:text-indigo-300">
        {SUBJECT_LABELS[key]} · 考点可视化
      </div>
      {topic && (
        <div className="absolute bottom-3 right-4 max-w-[55%] truncate rounded-full bg-indigo-600/90 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
          {topic}
        </div>
      )}
    </div>
  );
}
