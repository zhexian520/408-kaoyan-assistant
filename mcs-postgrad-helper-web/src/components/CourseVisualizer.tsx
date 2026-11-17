"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, Sparkles } from "lucide-react";

interface CourseVisualizerProps {
  subjectCode: string;
  sectionTitle: string;
  chapterTitle?: string;
  className?: string;
}

type VisualType =
  | "array"
  | "linked-list"
  | "stack"
  | "queue"
  | "tree"
  | "graph"
  | "sort"
  | "cache"
  | "process"
  | "paging"
  | "tcp"
  | "flow";

const VISUAL_META: Record<VisualType, { label: string; steps: string[] }> = {
  array: {
    label: "顺序表 · 按下标随机存取与插入移动",
    steps: ["按位序 i 直接计算地址", "访问第 i 个元素 O(1)", "插入时需要后移元素", "删除时需要前移元素", "平均移动约 n/2 个元素"],
  },
  "linked-list": {
    label: "链表 · 指针遍历与结点插入",
    steps: ["从头指针出发", "沿 next 指针逐结点访问", "定位到插入位置的前驱", "修改指针完成插入", "无需移动大量元素"],
  },
  stack: {
    label: "栈 · 后进先出 LIFO",
    steps: ["栈底固定", "push 入栈", "栈顶指针上移", "pop 出栈", "栈顶指针下移"],
  },
  queue: {
    label: "循环队列 · 队头出队与队尾入队",
    steps: ["队头 front 指向出队位置", "队尾 rear 指向入队位置", "入队后 rear 后移", "出队后 front 后移", "循环复用空闲空间"],
  },
  tree: {
    label: "二叉树 · 层次遍历访问顺序",
    steps: ["访问根结点", "访问左孩子", "访问右孩子", "按层扩展", "队列保证层次顺序"],
  },
  graph: {
    label: "图 · 最短路径与松弛过程",
    steps: ["初始化源点距离", "选择当前最近结点", "松弛相邻边", "更新最短距离", "得到最短路径"],
  },
  sort: {
    label: "排序 · 比较与交换",
    steps: ["扫描待排序区间", "比较相邻元素", "逆序则交换", "缩小待排序区间", "得到有序序列"],
  },
  cache: {
    label: "Cache · 主存块到 Cache 行映射",
    steps: ["CPU 发出主存地址", "拆分 Tag / 组号 / 块内地址", "定位 Cache 组", "比较 Tag", "命中或缺失"],
  },
  process: {
    label: "进程调度 · 就绪、运行与阻塞",
    steps: ["进程进入就绪队列", "调度器选择进程", "进程占用 CPU 运行", "等待 I/O 进入阻塞", "I/O 完成后回到就绪"],
  },
  paging: {
    label: "分页 · 逻辑地址到物理地址",
    steps: ["拆分页号与页内偏移", "查页表得到物理块号", "拼接物理地址", "访问 Cache / 主存", "缺页则触发置换"],
  },
  tcp: {
    label: "TCP · 三次握手建立连接",
    steps: ["客户端发送 SYN", "服务器回复 SYN+ACK", "客户端发送 ACK", "双方进入 ESTABLISHED", "开始可靠数据传输"],
  },
  flow: {
    label: "知识结构 · 定义、模型、算法与考点",
    steps: ["理解核心定义", "建立结构模型", "推导关键公式", "掌握算法流程", "串联真题与易错点"],
  },
};

function pickVisualType(title: string): VisualType {
  const text = title.toLowerCase();
  if (/顺序表|线性表|有序表|数组|矩阵|插入|删除/.test(text)) return "array";
  if (/链表|指针|单链|双链/.test(text)) return "linked-list";
  if (/栈/.test(text)) return "stack";
  if (/队列/.test(text)) return "queue";
  if (/树|遍历|二叉|哈夫曼|平衡/.test(text)) return "tree";
  if (/图|最短路径|拓扑|生成树/.test(text)) return "graph";
  if (/排序|查找/.test(text)) return "sort";
  if (/cache|缓存|映射|存储层次/.test(text)) return "cache";
  if (/进程|线程|调度|死锁|同步/.test(text)) return "process";
  if (/页|分页|分段|虚拟内存|内存管理/.test(text)) return "paging";
  if (/tcp|握手|拥塞|传输层/.test(text)) return "tcp";
  return "flow";
}

export default function CourseVisualizer({
  subjectCode,
  sectionTitle,
  chapterTitle = "",
  className = "",
}: CourseVisualizerProps) {
  const visualType = useMemo(
    () => pickVisualType(`${sectionTitle} ${chapterTitle}`),
    [sectionTitle, chapterTitle]
  );
  const meta = VISUAL_META[visualType];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    setStep(0);
  }, [visualType]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((value) => (value + 1) % meta.steps.length);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [playing, meta.steps.length]);

  const accent = subjectCode === "DS" ? "#2563eb" : subjectCode === "CO" ? "#7c3aed" : subjectCode === "OS" ? "#059669" : "#d97706";
  const accentSoft = subjectCode === "DS" ? "#dbeafe" : subjectCode === "CO" ? "#ede9fe" : subjectCode === "OS" ? "#d1fae5" : "#fef3c7";

  const renderVisual = () => {
    if (visualType === "array") {
      const active = step % 6;
      return (
        <g>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const x = 96 + index * 74;
            const isActive = index === active;
            return (
              <g key={index}>
                <rect x={x} y={92} width={58} height={54} rx={9} fill={isActive ? accent : "#ffffff"} stroke={isActive ? accent : "#cbd5e1"} strokeWidth="2.5" />
                <text x={x + 29} y={126} textAnchor="middle" fontSize="14" fontWeight="800" fill={isActive ? "#ffffff" : "#475569"}>
                  a{index + 1}
                </text>
                <text x={x + 29} y={166} textAnchor="middle" fontSize="10" fill="#94a3b8">{index}</text>
              </g>
            );
          })}
          <path d={`M ${96 + active * 74 + 29} 72 V 54`} stroke={accent} strokeWidth="3" markerEnd="url(#course-arrow)" />
          <text x={96 + active * 74 + 29} y={44} textAnchor="middle" fontSize="10" fontWeight="800" fill={accent}>
            LOC(a1) + i × c
          </text>
          <rect x="96" y="192" width="430" height="8" rx="4" fill={accentSoft} />
          <rect x={96 + active * 74} y="192" width="58" height="8" rx="4" fill={accent} />
          <text x="320" y="228" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
            {step === 2 ? "插入：第 i 个及之后的元素后移" : step === 3 ? "删除：第 i 个之后的元素前移" : "随机存取：直接计算目标地址"}
          </text>
        </g>
      );
    }

    if (visualType === "linked-list") {
      const active = step % 5;
      return (
        <g>
          {[0, 1, 2, 3, 4].map((index) => {
            const x = 74 + index * 108;
            const isActive = index === active;
            return (
              <g key={index}>
                <rect x={x} y={92} width={82} height={54} rx={10} fill={isActive ? accent : "#ffffff"} stroke={isActive ? accent : "#cbd5e1"} strokeWidth="2.5" />
                <line x1={x + 54} y1={92} x2={x + 54} y2={146} stroke={isActive ? "#ffffff" : "#cbd5e1"} strokeWidth="2" />
                <text x={x + 27} y={124} textAnchor="middle" fontSize="13" fontWeight="800" fill={isActive ? "#ffffff" : "#475569"}>data</text>
                <circle cx={x + 68} cy={119} r="5" fill={isActive ? "#ffffff" : accent} />
                {index < 4 && (
                  <line x1={x + 82} y1={119} x2={x + 108} y2={119} stroke={accent} strokeWidth="2.5" markerEnd="url(#course-arrow)" />
                )}
              </g>
            );
          })}
          <text x="320" y="52" textAnchor="middle" fontSize="11" fontWeight="800" fill={accent}>头指针 L</text>
          <path d="M 320 58 V 78" stroke={accent} strokeWidth="3" markerEnd="url(#course-arrow)" />
          <text x="320" y="222" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
            {step === 3 ? "修改前驱结点的 next 指针，完成 O(1) 插入" : "沿 next 指针顺序访问，不能随机存取"}
          </text>
        </g>
      );
    }

    if (visualType === "stack") {
      const depth = (step % 6);
      return (
        <g>
          <rect x="228" y="60" width="184" height="150" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
          {[0, 1, 2, 3, 4].map((index) => {
            const filled = index < depth;
            return (
              <g key={index}>
                <rect x="244" y={174 - index * 24} width="152" height="20" rx="6" fill={filled ? accent : "#f1f5f9"} stroke={filled ? accent : "#e2e8f0"} />
                <text x="320" y={188 - index * 24} textAnchor="middle" fontSize="9" fontWeight="700" fill={filled ? "#ffffff" : "#94a3b8"}>
                  {filled ? `元素 ${index + 1}` : ""}
                </text>
              </g>
            );
          })}
          <text x="320" y="236" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
            {step === 1 || step === 2 ? "push：栈顶指针上移" : step === 3 || step === 4 ? "pop：栈顶指针下移" : "栈顶 top 指向最后一个入栈元素"}
          </text>
        </g>
      );
    }

    if (visualType === "queue") {
      const active = step % 6;
      return (
        <g>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const x = 92 + index * 76;
            const isActive = index === active;
            return (
              <g key={index}>
                <rect x={x} y={96} width={60} height={50} rx={9} fill={isActive ? accent : "#ffffff"} stroke={isActive ? accent : "#cbd5e1"} strokeWidth="2.5" />
                <text x={x + 30} y={126} textAnchor="middle" fontSize="11" fontWeight="800" fill={isActive ? "#ffffff" : "#475569"}>Q{index}</text>
              </g>
            );
          })}
          <text x="122" y="82" textAnchor="middle" fontSize="10" fontWeight="800" fill={accent}>front</text>
          <text x="502" y="82" textAnchor="middle" fontSize="10" fontWeight="800" fill={accent}>rear</text>
          <path d="M 122 86 V 94" stroke={accent} strokeWidth="2.5" markerEnd="url(#course-arrow)" />
          <path d="M 502 86 V 94" stroke={accent} strokeWidth="2.5" markerEnd="url(#course-arrow)" />
          <text x="320" y="222" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
            {step === 2 ? "入队：rear = (rear + 1) % MaxSize" : step === 3 ? "出队：front = (front + 1) % MaxSize" : "循环队列通过取模复用空闲空间"}
          </text>
        </g>
      );
    }

    if (visualType === "tree") {
      const order = [0, 1, 2, 3, 4, 5, 6];
      const active = order[step % order.length];
      const nodes = [
        { x: 320, y: 62 },
        { x: 214, y: 128 },
        { x: 426, y: 128 },
        { x: 156, y: 198 },
        { x: 272, y: 198 },
        { x: 368, y: 198 },
        { x: 484, y: 198 },
      ];
      return (
        <g>
          {[0, 1, 2, 3, 4, 5, 6].map((index) => {
            const node = nodes[index];
            const isActive = index === active;
            const parent = index === 0 ? -1 : Math.floor((index - 1) / 2);
            return (
              <g key={index}>
                {parent >= 0 && <line x1={nodes[parent].x} y1={nodes[parent].y} x2={node.x} y2={node.y} stroke="#cbd5e1" strokeWidth="2" />}
                <circle cx={node.x} cy={node.y} r="22" fill={isActive ? accent : "#ffffff"} stroke={isActive ? accent : "#cbd5e1"} strokeWidth="2.5" />
                <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill={isActive ? "#ffffff" : "#475569"}>
                  {String.fromCharCode(65 + index)}
                </text>
              </g>
            );
          })}
          <text x="320" y="238" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
            层次遍历使用队列：根 → 左 → 右，逐层访问
          </text>
        </g>
      );
    }

    if (visualType === "graph") {
      const nodes = [
        { x: 110, y: 150, label: "A" },
        { x: 230, y: 82, label: "B" },
        { x: 250, y: 210, label: "C" },
        { x: 370, y: 118, label: "D" },
        { x: 380, y: 222, label: "E" },
        { x: 500, y: 150, label: "F" },
      ];
      const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5], [1, 2]];
      const path = [0, 1, 3, 5];
      const active = path[step % path.length];
      return (
        <g>
          {edges.map(([a, b], index) => (
            <line key={index} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke="#cbd5e1" strokeWidth="2.5" />
          ))}
          {path.slice(0, -1).map((from, index) => (
            <line key={`p-${index}`} x1={nodes[from].x} y1={nodes[from].y} x2={nodes[path[index + 1]].x} y2={nodes[path[index + 1]].y} stroke={accent} strokeWidth="5" strokeLinecap="round" opacity="0.8" />
          ))}
          {nodes.map((node, index) => {
            const isActive = index === active;
            return (
              <g key={node.label}>
                <circle cx={node.x} cy={node.y} r="24" fill={isActive ? accent : "#ffffff"} stroke={isActive ? accent : "#cbd5e1"} strokeWidth="3" />
                <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="12" fontWeight="800" fill={isActive ? "#ffffff" : "#475569"}>{node.label}</text>
              </g>
            );
          })}
          <text x="320" y="258" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
            松弛操作：dist[v] = min(dist[v], dist[u] + w(u,v))
          </text>
        </g>
      );
    }

    if (visualType === "sort") {
      const heights = [52, 92, 38, 120, 74, 108, 62, 96];
      const active = step % 8;
      const compare = (active + 1) % 8;
      return (
        <g>
          {heights.map((height, index) => {
            const x = 84 + index * 62;
            const isActive = index === active || index === compare;
            return (
              <g key={index}>
                <rect x={x} y={216 - height} width={44} height={height} rx="6" fill={isActive ? accent : "#e2e8f0"} stroke={isActive ? accent : "#cbd5e1"} strokeWidth="2" />
                <text x={x + 22} y={238} textAnchor="middle" fontSize="10" fontWeight="700" fill="#64748b">{height}</text>
              </g>
            );
          })}
          <text x="320" y="62" textAnchor="middle" fontSize="11" fontWeight="800" fill={accent}>
            {step < 3 ? "比较相邻元素" : step < 5 ? "交换逆序对" : "缩小待排序区间"}
          </text>
          <text x="320" y="262" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
            排序过程：比较 → 交换 → 区间收缩 → 最终有序
          </text>
        </g>
      );
    }

    if (visualType === "cache") {
      const active = step % 4;
      return (
        <g>
          <rect x="48" y="76" width="170" height="110" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
          <text x="133" y="62" textAnchor="middle" fontSize="11" fontWeight="800" fill="#475569">Cache 组</text>
          {[0, 1, 2, 3].map((index) => (
            <g key={index}>
              <rect x="64" y={88 + index * 24} width="138" height="18" rx="5" fill={index === active ? accent : "#f1f5f9"} />
              <text x="72" y={101 + index * 24} fontSize="9" fontWeight="700" fill={index === active ? "#ffffff" : "#64748b"}>行 {index} · Tag</text>
            </g>
          ))}
          <rect x="300" y="76" width="270" height="110" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
          <text x="435" y="62" textAnchor="middle" fontSize="11" fontWeight="800" fill="#475569">主存块</text>
          {[0, 1, 2, 3].map((index) => (
            <g key={index}>
              <rect x="318" y={88 + index * 24} width="234" height="18" rx="5" fill={index === active ? accentSoft : "#f8fafc"} stroke={index === active ? accent : "#e2e8f0"} />
              <text x="328" y={101 + index * 24} fontSize="9" fontWeight="700" fill={index === active ? accent : "#64748b"}>主存块 {index} → Cache 行 {index}</text>
            </g>
          ))}
          <path d="M 220 131 H 300" stroke={accent} strokeWidth="3" strokeDasharray="7 5" markerEnd="url(#course-arrow)" />
          <text x="320" y="228" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
            地址拆分：Tag | 组号 | 块内地址 → 定位 Cache 行 → 比较 Tag
          </text>
        </g>
      );
    }

    if (visualType === "process") {
      const active = step % 4;
      const states = ["就绪", "运行", "阻塞", "就绪"];
      return (
        <g>
          {[0, 1, 2, 3].map((index) => {
            const x = 72 + index * 132;
            const isActive = index === active;
            return (
              <g key={index}>
                <rect x={x} y={92} width={108} height={64} rx={12} fill={isActive ? accent : "#ffffff"} stroke={isActive ? accent : "#cbd5e1"} strokeWidth="2.5" />
                <text x={x + 54} y={118} textAnchor="middle" fontSize="11" fontWeight="800" fill={isActive ? "#ffffff" : "#475569"}>进程 P{index + 1}</text>
                <text x={x + 54} y={138} textAnchor="middle" fontSize="9" fill={isActive ? "#ffffff" : "#94a3b8"}>{isActive ? states[step] : "等待调度"}</text>
              </g>
            );
          })}
          <rect x="72" y="196" width="468" height="30" rx="15" fill={accentSoft} />
          <rect x={72 + active * 132} y="196" width="108" height="30" rx="15" fill={accent} />
          <text x="306" y="216" textAnchor="middle" fontSize="10" fontWeight="800" fill="#475569">就绪队列 → 调度器 → CPU</text>
          <text x="320" y="252" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
            进程状态：就绪 → 运行 → 阻塞 → 就绪
          </text>
        </g>
      );
    }

    if (visualType === "paging") {
      const active = step % 4;
      return (
        <g>
          <rect x="52" y="84" width="130" height="104" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
          <text x="117" y="70" textAnchor="middle" fontSize="11" fontWeight="800" fill="#475569">逻辑地址</text>
          <text x="117" y="130" textAnchor="middle" fontSize="12" fontWeight="800" fill={accent}>页号 P</text>
          <text x="117" y="156" textAnchor="middle" fontSize="12" fontWeight="800" fill="#64748b">页内偏移 W</text>

          <rect x="248" y="84" width="150" height="104" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
          <text x="323" y="70" textAnchor="middle" fontSize="11" fontWeight="800" fill="#475569">页表</text>
          {[0, 1, 2].map((index) => (
            <g key={index}>
              <rect x="264" y={96 + index * 28} width="118" height="20" rx="5" fill={index === active ? accent : "#f1f5f9"} />
              <text x="274" y={110 + index * 28} fontSize="9" fontWeight="700" fill={index === active ? "#ffffff" : "#64748b"}>页 {index} → 块 {index + 4}</text>
            </g>
          ))}

          <rect x="464" y="84" width="124" height="104" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
          <text x="526" y="70" textAnchor="middle" fontSize="11" fontWeight="800" fill="#475569">物理内存</text>
          <text x="526" y="130" textAnchor="middle" fontSize="12" fontWeight="800" fill={accent}>物理块号</text>
          <text x="526" y="156" textAnchor="middle" fontSize="12" fontWeight="800" fill="#64748b">+ 页内偏移</text>

          <path d="M 182 136 H 248" stroke={accent} strokeWidth="3" markerEnd="url(#course-arrow)" />
          <path d="M 398 136 H 464" stroke={accent} strokeWidth="3" markerEnd="url(#course-arrow)" />
          <text x="320" y="226" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
            逻辑地址 = 页号 + 偏移 → 查页表 → 物理地址 = 块号 + 偏移
          </text>
        </g>
      );
    }

    if (visualType === "tcp") {
      const active = step % 3;
      return (
        <g>
          <rect x="84" y="72" width="120" height="132" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
          <text x="144" y="104" textAnchor="middle" fontSize="12" fontWeight="800" fill="#475569">客户端</text>
          <rect x="436" y="72" width="120" height="132" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
          <text x="496" y="104" textAnchor="middle" fontSize="12" fontWeight="800" fill="#475569">服务器</text>
          {[
            { y: 126, label: "SYN", from: 204, to: 436, dir: "right" },
            { y: 164, label: "SYN + ACK", from: 436, to: 204, dir: "left" },
            { y: 202, label: "ACK", from: 204, to: 436, dir: "right" },
          ].map((item, index) => (
            <g key={item.label}>
              <line x1={item.from} y1={item.y} x2={item.to} y2={item.y} stroke={index === active ? accent : "#cbd5e1"} strokeWidth={index === active ? 4 : 2.5} markerEnd="url(#course-arrow)" />
              <text x="320" y={item.y - 8} textAnchor="middle" fontSize="10" fontWeight="800" fill={index === active ? accent : "#94a3b8"}>{item.label}</text>
            </g>
          ))}
          <text x="320" y="242" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
            三次握手：SYN → SYN+ACK → ACK，双方进入 ESTABLISHED
          </text>
        </g>
      );
    }

    return (
      <g>
        {["定义", "模型", "公式", "算法", "真题"].map((label, index) => {
          const x = 76 + index * 104;
          const isActive = index === step % 5;
          return (
            <g key={label}>
              <rect x={x} y={106} width={84} height={58} rx={12} fill={isActive ? accent : "#ffffff"} stroke={isActive ? accent : "#cbd5e1"} strokeWidth="2.5" />
              <text x={x + 42} y={140} textAnchor="middle" fontSize="12" fontWeight="800" fill={isActive ? "#ffffff" : "#475569"}>{label}</text>
              {index < 4 && <line x1={x + 84} y1={135} x2={x + 104} y2={135} stroke={accent} strokeWidth="2.5" markerEnd="url(#course-arrow)" />}
            </g>
          );
        })}
        <text x="320" y="210" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b">
          按“定义 → 模型 → 公式 → 算法 → 真题”建立完整知识链
        </text>
      </g>
    );
  };

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: accentSoft, color: accent }}>
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">动态演示 · 结构可视化</p>
            <p className="text-[11px] font-bold text-slate-700 dark:text-zinc-200">{meta.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            title={playing ? "暂停动画" : "播放动画"}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            title="重新播放"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <svg viewBox="0 0 640 280" className="h-[280px] w-full">
        <defs>
          <marker id="course-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={accent} />
          </marker>
          <pattern id="course-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#e2e8f0" strokeWidth="0.6" opacity="0.7" />
          </pattern>
        </defs>
        <rect width="640" height="280" fill="url(#course-grid)" />
        {renderVisual()}
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {meta.steps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setStep(index);
                setPlaying(false);
              }}
              className={`h-1.5 rounded-full transition-all ${index === step ? "w-6" : "w-2 bg-slate-200 dark:bg-zinc-700"}`}
              style={index === step ? { background: accent } : undefined}
              aria-label={`跳到第 ${index + 1} 步`}
            />
          ))}
        </div>
        <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
          {step + 1}/{meta.steps.length} · {meta.steps[step]}
        </p>
      </div>
    </div>
  );
}
