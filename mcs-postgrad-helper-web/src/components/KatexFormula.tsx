"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface KatexFormulaProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

export default function KatexFormula({
  math,
  displayMode = true,
  className = ""
}: KatexFormulaProps) {
  const html = useMemo(() => {
    if (!math) return "";
    let cleanMath = math.trim();
    // 去除外层多余的 $$ 或 $ 符号，防止 KaTeX 因非法嵌套 $ 而报错
    if (cleanMath.startsWith("$$") && cleanMath.endsWith("$$") && cleanMath.length >= 4) {
      cleanMath = cleanMath.slice(2, -2).trim();
    } else if (cleanMath.startsWith("$") && cleanMath.endsWith("$") && cleanMath.length >= 2) {
      cleanMath = cleanMath.slice(1, -1).trim();
    }

    try {
      const rendered = katex.renderToString(cleanMath, {
        displayMode,
        throwOnError: false,
        strict: false,
        errorColor: "inherit"
      });
      return rendered;
    } catch {
      return `<span class="font-mono text-slate-700 dark:text-zinc-300">${cleanMath}</span>`;
    }
  }, [math, displayMode]);

  return (
    <div
      className={`overflow-x-auto text-slate-800 dark:text-zinc-100 flex items-center justify-center py-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

