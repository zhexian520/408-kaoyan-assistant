"use client";

import React from "react";

interface SearchHighlightProps {
  text: string;
  terms: string[];
  className?: string;
  highlightClassName?: string;
}

export default function SearchHighlight({
  text,
  terms,
  className = "",
  highlightClassName = "bg-amber-200 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 font-bold px-0.5 rounded"
}: SearchHighlightProps) {
  if (!text) return null;
  const validTerms = terms.map((t) => t.trim()).filter((t) => t.length > 0);
  if (validTerms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // 构建转义正则
  const escaped = validTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  if (!escaped) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = validTerms.some((t) => t.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          return (
            <mark key={index} className={highlightClassName}>
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}

