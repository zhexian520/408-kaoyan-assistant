import Link from "next/link";
import { ShieldCheck, BookOpen, Cpu, Sparkles } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md py-8 text-zinc-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              408 计算机考研助手
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span>计算机学科专业基础综合 (408) 全真备考平台</span>
          </div>

          <div className="flex items-center gap-5 text-xs">
            <Link href="/exams" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              真题题库 (2009-2026)
            </Link>
            <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              学员登录
            </Link>
            <Link href="/admin/dashboard" className="text-purple-600 dark:text-purple-400 hover:underline">
              管理后台
            </Link>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
          <p>© 2026 计算机考研助手 · 包含数据结构、组成原理、操作系统、计算机网络四科全量知识谱系</p>
          <div className="flex items-center gap-3">
            <span>数据结构 · 组成原理 · 操作系统 · 计算机网络</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

