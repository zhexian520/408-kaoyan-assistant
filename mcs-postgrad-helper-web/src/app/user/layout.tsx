"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import TargetConfigModal from "@/components/TargetConfigModal";
import { 
  LayoutDashboard, 
  BookOpen, 
  Sparkles, 
  FileText, 
  Bot, 
  Zap, 
  CheckCircle2, 
  Calendar, 
  FileEdit, 
  BarChart3, 
  Globe, 
  LogOut, 
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Target,
  Clock,
  Award,
  Search,
  Bell,
  Cpu,
  Layers,
  ArrowRight,
  GraduationCap,
  Menu,
  X
} from "lucide-react";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [searchVal, setSearchVal] = useState("");
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ "学习工作台": true });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const currentExamYear = user?.examYear || 2027;
  const daysUntilExam = useMemo(() => {
    const now = new Date();
    // 2027 考研初试在 2026 年 12 月；兼容旧数据时再回退到当年 12 月。
    let targetDate = new Date(currentExamYear - 1, 11, 21);
    if (targetDate.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
      targetDate = new Date(currentExamYear, 11, 21);
    }
    if (targetDate.getTime() < now.getTime()) {
      targetDate = new Date(currentExamYear + 1, 11, 21);
    }
    const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }, [currentExamYear]);

  const menuSections = [
    {
      group: "学习工作台",
      icon: GraduationCap,
      items: [
        { name: "学习总览", href: "/user/dashboard", icon: LayoutDashboard, desc: "今日任务、目标与学习状态" },
        { name: "课程中心", href: "/user/courses", icon: GraduationCap, badge: "随堂伴学", badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800", desc: "四科章节精讲、动画与代码" },
        { name: "智能知识库", href: "/user/knowledge", icon: BookOpen, desc: "教材原文、RAG 切片与个人资料" },
        { name: "408 知识图谱", href: "/user/knowledge-graph", icon: Layers, badge: "412 考点", badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800", desc: "知识点关系与章节网络" },
      ],
    },
    {
      group: "实战训练",
      icon: Award,
      items: [
        { name: "408 统考真题", href: "/user/exams", icon: Award, badge: "按知识点", badgeColor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800", desc: "按知识点分类的全部真题" },
        { name: "全真模拟考场", href: "/user/exam-hall", icon: FileText, desc: "180 分钟整卷模考" },
        { name: "模考战报", href: "/user/exam-reports", icon: Award, desc: "成绩、逐题答卷与 PDF" },
        { name: "真题变式题", href: "/user/variant", icon: Zap, desc: "原创高仿变式训练" },
        { name: "错题本与诊断", href: "/user/wrong-notebook", icon: CheckCircle2, desc: "错因分析与针对性重练" },
      ],
    },
    {
      group: "AI 与规划",
      icon: Sparkles,
      items: [
        { name: "研炼问答助手", href: "/user/qa", icon: Sparkles, badge: "多话题", badgeColor: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800", desc: "上下文问答与多模态图片" },
        { name: "AI 备考智能体", href: "/user/agent", icon: Bot, desc: "精讲 → 自测 → 判分 → 真题 → 复盘" },
        { name: "个性化备考规划", href: "/user/study-plan", icon: Calendar, desc: "覆盖到考研初试的周计划" },
        { name: "智能择校", href: "/user/school-selection", icon: Target, badge: "冲稳保", badgeColor: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800", desc: "学硕专硕、专业代码与推荐" },
      ],
    },
    {
      group: "数据与沉淀",
      icon: BarChart3,
      items: [
        { name: "学习分析", href: "/user/analytics", icon: BarChart3, desc: "正确率、活跃度与薄弱热力图" },
        { name: "考研云笔记", href: "/user/notes", icon: FileEdit, desc: "章节摘录、AI 摘要与真题笔记" },
      ],
    },
  ];

  useEffect(() => {
    const activeGroup = menuSections.find((section) =>
      section.items.some((item) => pathname === item.href || (item.href !== "/user/dashboard" && pathname.startsWith(item.href + "/")))
    );
    if (activeGroup) {
      setExpandedGroups((prev) => ({ ...prev, [activeGroup.group]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="h-screen h-[100dvh] w-full flex overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 font-sans antialiased">
      {/* 学员端侧边栏 (固定不随滚动条漂移，清爽学术伴学质感) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 h-screen h-[100dvh] bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col shrink-0 shadow-xs select-none transition-transform duration-300 lg:sticky lg:top-0 lg:z-40 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Brand Area */}
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800 shrink-0 flex items-start justify-between gap-2">
          <Logo
            size="md"
            variant="user"
            title="408 考研智能伴学"
            subtitle="研途智航 · 学员研炼中心"
            href="/user/dashboard"
          />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
            aria-label="关闭菜单"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 导航菜单列表 */}
        <div className="flex-1 py-4 px-3.5 space-y-6 overflow-y-auto">
          {menuSections.map((sec) => {
            const GroupIcon = sec.icon;
            const groupActive = sec.items.some(
              (item) => pathname === item.href || (item.href !== "/user/dashboard" && pathname.startsWith(item.href + "/"))
            );
            const expanded = !!expandedGroups[sec.group] || groupActive;
            return (
              <div key={sec.group} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setExpandedGroups((prev) => ({ ...prev, [sec.group]: !expanded }))}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                    groupActive
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-slate-500 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-extrabold tracking-wider uppercase">{sec.group}</span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 dark:bg-zinc-800">
                      {sec.items.length}
                    </span>
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>

                {expanded && (
                  <div className="space-y-1">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || (item.href !== "/user/dashboard" && pathname.startsWith(item.href + "/"));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={item.desc}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all group ${
                            isActive
                              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                              : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-white"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Icon className={`h-4 w-4 shrink-0 transition-colors ${
                              isActive ? "text-white" : "text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                            }`} />
                            <span className="truncate">{item.name}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {item.badge && !isActive && (
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${item.badgeColor}`}>
                                {item.badge}
                              </span>
                            )}
                            {isActive && <ChevronRight className="h-4 w-4 opacity-75" />}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 快捷通道 */}
          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div className="px-3 pb-1 text-[11px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">
              系统导航
            </div>
            <Link
              href="/user/hub"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-blue-600 transition-all hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
            >
              <LayoutGrid className="w-4.5 h-4.5" />
              <span>功能地图</span>
              <span className="ml-auto text-[9px] font-bold text-slate-400">全部功能</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 transition-all"
            >
              <Globe className="w-4.5 h-4.5 text-slate-400" />
              <span>返回系统首页</span>
            </Link>
          </div>
        </div>

        {/* 底部学员信息卡片 */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/80 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {user?.nickname ? user.nickname.charAt(0) : "研"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                  {user?.nickname || user?.username || "408备考学员"}
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400 truncate flex items-center gap-1">
                  <Target className="w-3 h-3 text-blue-600" />
                  <span>{user?.targetSchool || "目标院校"} ({user?.targetScore || 125}分)</span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="退出登录"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 用户端内容主区域 (独立纵向滚动) */}
      <div className="relative flex-1 h-screen h-[100dvh] flex flex-col min-w-0 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.07),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.05),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.08),transparent_26%)]">
        {/* Top Header */}
        <header className="h-16 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
          {/* 面包屑与当前定位 */}
          <div className="flex items-center gap-2.5 text-sm min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden shrink-0 rounded-lg border border-slate-200 dark:border-zinc-700 p-1.5 text-slate-500"
              aria-label="打开菜单"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="hidden sm:inline text-slate-400 font-medium">学员中心</span>
            <span className="hidden sm:inline text-slate-300 dark:text-zinc-700">/</span>
            <span className="truncate font-bold text-slate-800 dark:text-zinc-100">
              {menuSections.flatMap(s => s.items).find(i => pathname === i.href || (i.href !== "/user/dashboard" && pathname.startsWith(i.href + "/")))?.name || "控制中心"}
            </span>
          </div>

          {/* 右侧：全局倒计时、目标高校与检索 */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* 考研统考倒计时徽章 (可点击配置) */}
            <button
              type="button"
              onClick={() => setShowTargetModal(true)}
              title="点击设置考研年份与目标高校"
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 sm:px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 hover:border-blue-300 transition-all cursor-pointer shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">距 {currentExamYear} 考研初试还有 </span><strong className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">{daysUntilExam}</strong><span className="ml-0.5">天</span>
            </button>

            {/* 目标高校 (可点击配置) */}
            <button
              type="button"
              onClick={() => setShowTargetModal(true)}
              title="点击修改目标高校与目标分数"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-transparent hover:border-amber-300 text-xs text-slate-700 dark:text-zinc-200 font-medium hover:bg-amber-50/70 transition-all cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-amber-500" />
              <span>目标：<strong>{user?.targetSchool || "目标院校"}</strong> ({user?.targetScore || 125}分)</span>
            </button>

            {/* 白天 / 夜间模式切换 */}
            <ThemeToggle />

            {/* AI 在线状态 */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>DeepSeek 伴学引擎在线</span>
            </div>
          </div>
        </header>

        {/* 页面主体内容 */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* 备考目标与年份设置弹窗 */}
      <TargetConfigModal
        isOpen={showTargetModal}
        onClose={() => setShowTargetModal(false)}
      />
    </div>
  );
}
