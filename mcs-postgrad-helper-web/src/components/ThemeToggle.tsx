"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

interface ThemeToggleProps {
  className?: string;
  admin?: boolean;
  showLabel?: boolean;
}

export default function ThemeToggle({
  className = "",
  admin = false,
  showLabel = false,
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(current);
  }, []);

  const applyTheme = (next: Theme) => {
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem("408_theme", next);
    } catch {
      // 忽略隐私模式下的存储异常
    }
    setTheme(next);
  };

  const toggle = () => applyTheme(theme === "dark" ? "light" : "dark");

  const baseClass = admin
    ? "inline-flex items-center justify-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition-colors"
    : "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "切换到白天模式" : "切换到夜间模式"}
      aria-label={theme === "dark" ? "切换到白天模式" : "切换到夜间模式"}
      className={`${baseClass} cursor-pointer ${className}`}
      style={
        admin
          ? {
              borderColor: "var(--a-border)",
              background: "var(--a-surface-solid)",
              color: "var(--a-muted)",
            }
          : undefined
      }
    >
      {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
      {showLabel && <span>{theme === "dark" ? "白天" : "夜间"}</span>}
    </button>
  );
}
