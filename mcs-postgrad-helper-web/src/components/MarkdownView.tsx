"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import CodeBlock from "@/components/CodeBlock";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

// 智能提取并修补包含多重花括号、非法换行及流式生成的 \boxed{...} 独立块
function fixBoxedFormulas(content: string): string {
  let res = "";
  let i = 0;
  while (i < content.length) {
    if (content.slice(i, i + 7) === "\\boxed{") {
      const prefixSlice = content.slice(Math.max(0, i - 10), i).trim();
      const hasDollarPrefix = prefixSlice.endsWith("$$") || prefixSlice.endsWith("$");

      let depth = 1;
      let j = i + 7;
      while (j < content.length && depth > 0) {
        if (content[j] === "{" && content[j - 1] !== "\\") depth++;
        else if (content[j] === "}" && content[j - 1] !== "\\") depth--;
        j++;
      }

      if (depth === 0) {
        let boxedMath = content.slice(i, j).replace(/\n+/g, " ").trim();
        const suffixSlice = content.slice(j, j + 5).trim();
        const hasDollarSuffix = suffixSlice.startsWith("$$") || suffixSlice.startsWith("$");

        if (!hasDollarPrefix) {
          res += `\n\n$$\n${boxedMath}\n$$\n\n`;
        } else {
          res += boxedMath;
        }

        if (!hasDollarPrefix && hasDollarSuffix) {
          if (content.slice(j).trimStart().startsWith("$$")) {
            const nextIdx = content.indexOf("$$", j);
            j = nextIdx + 2;
          } else if (content.slice(j).trimStart().startsWith("$")) {
            const nextIdx = content.indexOf("$", j);
            j = nextIdx + 1;
          }
        }

        i = j;
        continue;
      } else if (depth > 0 && j >= content.length) {
        // 流式生成途中未闭合保护：补齐缺失的花括号并作为公式块先行渲染
        let boxedMath = (content.slice(i, j) + "}".repeat(depth)).replace(/\n+/g, " ").trim();
        if (!hasDollarPrefix) {
          res += `\n\n$$\n${boxedMath}\n$$\n\n`;
        } else {
          res += boxedMath;
        }
        i = j;
        continue;
      }
    }
    res += content[i];
    i++;
  }
  return res;
}

export default function MarkdownView({ content, className = "" }: MarkdownViewProps) {
  if (!content) return null;

  // 终极规范化排版引擎：
  // 1. 保护代码块：先抽取并占位，杜绝公式与Markdown规则误伤代码
  // 2. 深度修复并补齐 \boxed{...} 独立块，清理破坏公式的换行，支持流式未闭合自动闭合
  // 3. 将 \[...\] 转换为 \n\n$$\n...\n$$\n\n，将 \(...\) 转换为 $...$
  // 4. 修复折行拆散的行内公式（如 $\nO(n)\n$）
  // 5. 核心架构安全隔离：将所有 $$...$$ display math 独立保护并占位，彻底杜绝后续表格和排版正则破坏公式内部！
  // 6. 自动解开大模型输出中连缀在行内的 Markdown 结构元素（表格、标题、引用块、分割线）
  // 7. 规范空行与流式单 $ 闭合保护
  // 8. 依次恢复 Display Math 块与 Code 块
  const normalizedContent = useMemo(() => {
    if (!content) return "";

    // 1. 保护代码块
    const codeBlocks: string[] = [];
    let text = content.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // 2. 深度修复包含嵌套花括号或非法换行的 \boxed{...}
    text = fixBoxedFormulas(text);

    // 3. 将 \[ ... \] 转换为标准的换行包围 $$ ... $$
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n\n$$\n${math.trim()}\n$$\n\n`);
    // 将 \( ... \) 转换为 $ ... $
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

    // 4. 修复折行导致被拆开的行内数学公式（如 $\nO(1)\n$ 或 $\nO(n)\n$）
    text = text.replace(/\$\s*\n\s*([^\n\$]+?)\s*\n\s*\$/g, (_, math) => `$${math.trim()}$`);

    // 5. 核心安全隔离：将所有 $$...$$ display math 独立抽离保护，杜绝任何后续排版误伤！
    const mathBlocks: string[] = [];
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      const cleaned = math.trim().replace(/\n+/g, " ");
      mathBlocks.push(`\n\n$$\n${cleaned}\n$$\n\n`);
      return `__MATH_BLOCK_${mathBlocks.length - 1}__`;
    });

    // 6. 纯正文/表格结构排版修复：
    // 6.0 先保护合法的 GFM 表格块，避免后续“自动修补”正则把 |---| 分隔行误判为分割线。
    const tableBlocks: string[] = [];
    text = text.replace(/(?:^|\n)((?:\|[^\n]*\|[ \t]*(?:\n|$)){2,})/g, (match) => {
      const block = match.replace(/^\n/, "").trim();
      // 至少包含一行 |---| / |:---:| 这样的 GFM 分隔行才视为合法表格
      if (/\|\s*:?-{3,}/.test(block)) {
        tableBlocks.push(block);
        return `\n\n__TABLE_BLOCK_${tableBlocks.length - 1}__\n\n`;
      }
      return match;
    });

    // 6.1 表格前导空行补齐（普通文字接表格表头，基于行首非管道字符判断，绝不误切单元格）
    text = text.replace(/(^|\n)([^|\n]+?)(\|(?:\s*[^|\n]+\s*\|)+)/g, "$1$2\n\n$3");
    // 6.2 表格并排的连续行 | | 或 || 拆解为标准换行新行
    text = text.replace(/\|\s*\|\s*/g, "|\n| ");
    // 6.3 表格末尾紧接分割线 --- 或标题
    text = text.replace(/\|\s*(---|\#{1,6}\s+)/g, "|\n\n$1");
    // 6.4 标题 #{1,6} 在非行首强制换行成独立块
    text = text.replace(/([^\n])\s*(#{1,6}\s+)/g, "$1\n\n$2");
    // 6.5 引用块 > 在非行首强制换行成块
    text = text.replace(/([。！？；;\w\)])\s*(>\s*)/g, "$1\n\n$2");
    // 6.6 分割线 --- 强制换行（排除表格内部的 :---:）
    text = text.replace(/([^\n:\-|])\s*---\s*(?=[^\n:\-|]|$)/g, "$1\n\n---\n\n");
    // 6.7 标题行后缺少换行直接连缀正文段落（如 "### 标题 这是正文..."）
    text = text.replace(/^(#{1,6}\s+[^\n]+?)([”"）\)]|[^\s\w\n]{1,2})\s+([这是本该其若因在为了从对设已如当\u4e00-\u9fa5]{2,}[^。\n]*?[。！？])/gm, "$1$2\n\n$3");

    // 7. 清理多余空行 (超过2个连续换行折叠为2个)
    text = text.replace(/\n{3,}/g, "\n\n");

    // 8. 流式未闭合保护: 检查奇数个单 $
    const singleDollars = (text.match(/(?<!\\)\$/g) || []).length;
    if (singleDollars % 2 === 1) {
      text += "$";
    }

    // 8.5 恢复合法表格块（表格内的数学占位符会在下一步统一恢复）
    text = text.replace(/__TABLE_BLOCK_(\d+)__/g, (_, idx) => `\n\n${tableBlocks[Number(idx)] || ""}\n\n`);

    // 9. 恢复 display math 块
    text = text.replace(/__MATH_BLOCK_(\d+)__/g, (_, idx) => mathBlocks[Number(idx)] || "");

    // 10. 恢复代码块
    text = text.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)] || "");

    return text;
  }, [content]);

  return (
    <div className={`prose-sm max-w-none space-y-2 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-zinc-200 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, errorColor: "inherit" }]]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 mt-3 mb-1.5 pb-1 border-b border-slate-200 dark:border-zinc-700 tracking-tight" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-zinc-100 mt-2.5 mb-1.5 flex items-center gap-1.5 before:content-[''] before:w-1 before:h-3.5 before:bg-blue-600 before:rounded-full" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 mt-2 mb-1" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400 mt-2.5 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="leading-relaxed my-1.5 text-slate-700 dark:text-zinc-300 break-words" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-extrabold text-slate-900 dark:text-white bg-blue-50/70 dark:bg-blue-950/40 px-1 py-0.5 rounded text-inherit" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-4 space-y-1 my-1.5 text-slate-700 dark:text-zinc-300" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-4 space-y-1 my-1.5 text-slate-700 dark:text-zinc-300 font-medium" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="my-2.5 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border-l-4 border-amber-500 text-xs text-amber-900 dark:text-amber-200 shadow-xs" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700 shadow-xs">
              <table className="w-full text-left text-xs border-collapse divide-y divide-slate-200 dark:divide-zinc-700" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-extrabold" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="py-2 px-3 border border-slate-200 dark:border-zinc-700" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="py-1.5 px-3 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300" {...props} />
          ),
          code: ({ node, className, children, ...props }: any) => {
            const isInline = !className && typeof children === "string" && !children.includes("\n");
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-semibold border border-slate-200 dark:border-zinc-700" {...props}>
                  {children}
                </code>
              );
            }
            const match = /language-(\w+)/.exec(className || "");
            const codeText = String(children || "").replace(/\n$/, "");
            return (
              <CodeBlock
                code={codeText}
                language={match ? match[1] : "c"}
              />
            );
          }
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
