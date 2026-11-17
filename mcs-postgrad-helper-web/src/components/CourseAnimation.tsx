"use client";

import React, { useEffect, useState } from "react";
import type { ManimWebAnimation } from "@/animations/types";
import ManimPlayer from "@/components/ManimPlayer";

interface CourseAnimationProps {
  sectionTitle: string;
  chapterTitle?: string;
  className?: string;
}

interface AnimationRule {
  test: RegExp;
  loader: () => Promise<Record<string, unknown>>;
  exportName: string;
}

const RULES: AnimationRule[] = [
  {
    test: /顺序表|线性表|有序表/,
    loader: () => import("@/animations/data-structures/linear-list/sequential-list"),
    exportName: "sequentialListInsertDeleteAnimation",
  },
  {
    test: /双指针|快慢指针/,
    loader: () => import("@/animations/data-structures/linear-list/fast-slow-pointers"),
    exportName: "fastSlowPointersAnimation",
  },
  {
    test: /链表|单链|双链/,
    loader: () => import("@/animations/data-structures/linear-list/singly-linked-list"),
    exportName: "singlyLinkedListInsertDeleteAnimation",
  },
  {
    test: /KMP|字符串|模式匹配|子串|朴素匹配/,
    loader: () => import("@/animations/data-structures/string/kmp"),
    exportName: "kmpAnimation",
  },
  {
    test: /表达式|后缀|前缀|求值/,
    loader: () => import("@/animations/data-structures/stack-expression/expression-evaluation"),
    exportName: "prefixPostfixEvaluationAnimation",
  },
  {
    test: /栈/,
    loader: () => import("@/animations/data-structures/stack-expression/infix-postfix"),
    exportName: "infixPostfixConversionAnimation",
  },
  {
    test: /平衡|AVL/,
    loader: () => import("@/animations/data-structures/tree/avl"),
    exportName: "avlAdjustmentAnimation",
  },
  {
    test: /B树|B\+树/,
    loader: () => import("@/animations/data-structures/tree/b-tree"),
    exportName: "bTreeInsertionAnimation",
  },
  {
    test: /红黑树/,
    loader: () => import("@/animations/data-structures/tree/red-black-tree"),
    exportName: "redBlackInsertionAnimation",
  },
  {
    test: /重构|遍历.*构造|构造.*遍历/,
    loader: () => import("@/animations/data-structures/tree/rebuild-from-traversals"),
    exportName: "rebuildBinaryTreeAnimation",
  },
  {
    test: /最短路径|Dijkstra|Floyd/,
    loader: () => import("@/animations/data-structures/graph/shortest-path"),
    exportName: "dijkstraAnimation",
  },
  {
    test: /拓扑/,
    loader: () => import("@/animations/data-structures/graph/dag-algorithms"),
    exportName: "topologicalSortAnimation",
  },
  {
    test: /关键路径/,
    loader: () => import("@/animations/data-structures/graph/dag-algorithms"),
    exportName: "criticalPathAnimation",
  },
  {
    test: /快速排序/,
    loader: () => import("@/animations/data-structures/sorting/advanced-sorts"),
    exportName: "quickSortAnimation",
  },
  {
    test: /堆排序/,
    loader: () => import("@/animations/data-structures/sorting/advanced-sorts"),
    exportName: "heapSortAnimation",
  },
  {
    test: /归并排序/,
    loader: () => import("@/animations/data-structures/sorting/incremental-sorts"),
    exportName: "mergeSortAnimation",
  },
  {
    test: /基数排序/,
    loader: () => import("@/animations/data-structures/sorting/advanced-sorts"),
    exportName: "radixSortAnimation",
  },
  {
    test: /外部排序/,
    loader: () => import("@/animations/data-structures/sorting/external-sorts"),
    exportName: "loserTreeAnimation",
  },
  {
    test: /排序|插入排序|冒泡排序|选择排序|希尔排序/,
    loader: () => import("@/animations/data-structures/sorting/incremental-sorts"),
    exportName: "directInsertionSortAnimation",
  },
  {
    test: /Cache|组相联|全相联|直接映射|主存映射/,
    loader: () => import("@/animations/computer-organization/cache/two-way-set-associative-cache"),
    exportName: "twoWaySetAssociativeCacheAnimation",
  },
  {
    test: /指令周期|指令执行|数据通路|CPU 的功能|CPU的功能|指令流水线|控制器/,
    loader: () => import("@/animations/computer-organization/execute/instruction-cycle"),
    exportName: "executeAnimation",
  },
  {
    test: /中断/,
    loader: () => import("@/animations/computer-organization/interrupt/interrupt-priority"),
    exportName: "interruptPriorityAnimation",
  },
  {
    test: /ALU|标志位/,
    loader: () => import("@/animations/computer-organization/arithmetic/alu-flags-circuit"),
    exportName: "aluFlagsCircuitAnimation",
  },
  {
    test: /乘法/,
    loader: () => import("@/animations/computer-organization/arithmetic/multiplication"),
    exportName: "multiplicationAnimation",
  },
  {
    test: /除法/,
    loader: () => import("@/animations/computer-organization/arithmetic/division"),
    exportName: "divisionAnimation",
  },
  {
    test: /进制|权值|数制/,
    loader: () => import("@/animations/computer-organization/base-conversion/weight-position"),
    exportName: "weightPositionAnimation",
  },
  {
    test: /虚拟内存|页表|地址转换/,
    loader: () => import("@/animations/computer-organization/vm/virtual-memory-translation"),
    exportName: "virtualMemoryTranslationAnimation",
  },
  {
    test: /CRC|循环冗余/,
    loader: () => import("@/animations/computer-networks/data-link-layer/crc-division"),
    exportName: "crcDivisionAnimation",
  },
  {
    test: /CSMA|碰撞/,
    loader: () => import("@/animations/computer-networks/data-link-layer/csma-cd-collision"),
    exportName: "csmaCdCollisionAnimation",
  },
  {
    test: /后退N帧|GBN/,
    loader: () => import("@/animations/computer-networks/data-link-layer/go-back-n/send-window"),
    exportName: "gbnWindowAnimation",
  },
  {
    test: /选择重传/,
    loader: () => import("@/animations/computer-networks/data-link-layer/selective-repeat/error-control"),
    exportName: "srErrorControlAnimation",
  },
  {
    test: /ARP/,
    loader: () => import("@/animations/computer-networks/network-layer/arp-process"),
    exportName: "arpProcessAnimation",
  },
  {
    test: /DHCP/,
    loader: () => import("@/animations/computer-networks/network-layer/dhcp-process"),
    exportName: "dhcpProcessAnimation",
  },
  {
    test: /子网|CIDR|VLSM|掩码/,
    loader: () => import("@/animations/computer-networks/network-layer/subnet-vlsm"),
    exportName: "subnetVlsmAnimation",
  },
  {
    test: /TCP|拥塞|序号|滑动窗口/,
    loader: () => import("@/animations/computer-networks/transport-layer/tcp-seq-growth"),
    exportName: "tcpSeqGrowthAnimation",
  },
];

export function hasCourseAnimation(sectionTitle: string, chapterTitle = "") {
  const text = `${sectionTitle} ${chapterTitle}`;
  return RULES.some((item) => item.test.test(text));
}

export default function CourseAnimation({ sectionTitle, chapterTitle = "", className = "" }: CourseAnimationProps) {
  const [animation, setAnimation] = useState<ManimWebAnimation | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const text = `${sectionTitle} ${chapterTitle}`;
    const rule = RULES.find((item) => item.test.test(text));
    if (!rule) {
      setAnimation(null);
      setLoading(false);
      setFailed(false);
      return;
    }
    let cancelled = false;
    let timeoutId: number | undefined;
    setLoading(true);
    setFailed(false);
    setAnimation(null);
    timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setFailed(true);
      }
    }, 8000);
    rule
      .loader()
      .then((module) => {
        if (cancelled) return;
        const found = module[rule.exportName] as ManimWebAnimation | undefined;
        setAnimation(found || null);
        if (!found) setFailed(true);
      })
      .catch(() => {
        if (!cancelled) {
          setAnimation(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [sectionTitle, chapterTitle]);

  if (loading) {
    return (
      <div className={`flex h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-400 dark:border-zinc-700 dark:bg-zinc-900 ${className}`}>
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span>正在加载该考点的专属分步动画...</span>
        <span className="text-[10px] text-slate-400/80">通常 1-3 秒，超时会自动跳过</span>
      </div>
    );
  }

  if (!animation) {
    if (!failed) return null;
    return (
      <div className={`flex h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-xs text-slate-400 dark:border-zinc-700 dark:bg-zinc-900/40 ${className}`}>
        <span>本节动画暂时不可用</span>
        <span className="text-[10px] text-slate-400/80">可直接阅读下方图文演示与结构可视化</span>
      </div>
    );
  }

  return <ManimPlayer animation={animation} className={className} />;
}
