"use client";

import React, { useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-python";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export default function CodeBlock({ code, language = "c", className = "" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // 清理语言名称：兼容 "language-c"、"C++"、"C 语言" 等课程数据写法
  const rawLang = (language || "c").replace(/^language-/, "").trim().toLowerCase();
  const langKey = rawLang === "c++" || rawLang === "c/c++" || rawLang === "cpp"
    ? "cpp"
    : rawLang.startsWith("c")
    ? "c"
    : rawLang === "python" || rawLang === "py"
    ? "python"
    : rawLang === "java"
    ? "java"
    : rawLang === "sql"
    ? "sql"
    : rawLang === "bash" || rawLang === "shell" || rawLang === "sh"
    ? "bash"
    : rawLang === "json"
    ? "json"
    : "c";

  // 匹配 Prism 支持的语法，408 默认回退到 C/C++
  const prismLang = Prism.languages[langKey] || Prism.languages.c;

  const normalizedLangName = langKey ? langKey.toUpperCase() : "C/C++";

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 生成语法高亮 HTML
  const highlightedHtml = React.useMemo(() => {
    try {
      return Prism.highlight(code.trim(), prismLang, langKey || "c");
    } catch {
      return code.trim();
    }
  }, [code, prismLang, langKey]);

  return (
    <div className={`my-3 rounded-2xl overflow-hidden border border-slate-800 bg-[#16161e] shadow-md ${className}`}>
      {/* 代码块顶部标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-[#1a1b26]/90 select-none">
        <div className="flex items-center gap-2">
          {/* macOS 风格三色圆点 */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block"></span>
          </div>
          <span className="ml-2 text-[11px] font-mono font-bold text-slate-400">
            {normalizedLangName}
          </span>
        </div>

        {/* 复制按钮 */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="复制代码"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>

      {/* 代码高亮内容区 */}
      <div className="p-4 overflow-x-auto text-xs sm:text-[13px] leading-relaxed font-mono">
        <pre className="!bg-transparent !p-0 !m-0 overflow-visible font-mono">
          <code 
            className="highlighted-code block font-mono"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
}

