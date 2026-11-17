"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Flame,
  TrendingUp,
  AlertTriangle,
  Users,
  Award,
  Layers,
  ArrowUpRight,
  Activity,
  Target,
  Sparkles,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import {
  AdminBadge,
  AdminEmptyState,
  AdminLink,
  AdminPageHeader,
  AdminPanel,
  AdminSpinner,
  AdminStatCard,
} from "@/components/admin/AdminUI";

interface Totals {
  answeredTotal: number;
  correctTotal: number;
  mockCount: number;
  wrongTotal: number;
  wrongMastered: number;
  userCount: number;
  questionCount: number;
}

interface SubjectStat {
  subjectCode: string;
  answered: number;
  correct: number;
}

interface WeakChapter {
  chapterName: string;
  subjectCode: string;
  wrongCount: number;
}

interface WrongQuestion {
  questionId: string;
  stem: string;
  subjectCode: string;
  chapterName: string;
  wrongCount: number;
}

interface AnalyticsData {
  totals: Totals;
  subjectStats: SubjectStat[];
  topChapters: WeakChapter[];
  topWrongQuestions: WrongQuestion[];
  dailyActivity: Array<{ day: string; answered: number; correct: number }>;
}

const SUBJECT_LABELS: Record<string, string> = {
  DS: "数据结构",
  CO: "计算机组成原理",
  OS: "操作系统",
  NET: "计算机网络",
  CN: "计算机网络",
};

const subjectTone: Record<string, "sky" | "blue" | "emerald" | "amber"> = {
  DS: "sky",
  CO: "blue",
  OS: "emerald",
  NET: "amber",
  CN: "amber",
};

function num(value: unknown) {
  return typeof value === "number" ? value : Number(value || 0);
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("408_auth_token") || "";
      const res = await fetch("/api/admin/analytics/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setData(json.data);
      } else {
        setError(json.message || "全站分析加载失败");
      }
    } catch (err: any) {
      setError(`全站分析加载失败：${err.message || "请确认 Java 服务已启动"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totals = data?.totals;
  const answered = num(totals?.answeredTotal);
  const correct = num(totals?.correctTotal);
  const accuracy = answered > 0 ? Math.round((correct / answered) * 1000) / 10 : 0;
  const topChapters = data?.topChapters || [];
  const topWrong = data?.topWrongQuestions || [];
  const maxChapterWrong = Math.max(1, ...topChapters.map((item) => num(item.wrongCount)));
  const subjectStats = data?.subjectStats || [];
  const dailyActivity = data?.dailyActivity || [];
  const maxDailyAnswered = Math.max(1, ...dailyActivity.map((item) => num(item.answered)));
  const subjectAccuracy = subjectStats.map((item) => {
    const answered = num(item.answered);
    const correct = num(item.correct);
    return {
      code: item.subjectCode === "CN" ? "NET" : item.subjectCode,
      answered,
      correct,
      rate: answered > 0 ? Math.round((correct / answered) * 1000) / 10 : 0,
    };
  });
  const bestSubject = [...subjectStats].sort((a, b) => {
    const accA = num(a.answered) > 0 ? num(a.correct) / num(a.answered) : 0;
    const accB = num(b.answered) > 0 ? num(b.correct) / num(b.answered) : 0;
    return accB - accA;
  })[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow="学习数据分析"
        title="全站学习数据与考点热力"
        description="基于全站真实作答、模考与错题数据，统计学科正确率、高频失分章节与题目，为题库运营和教学内容迭代提供依据。"
        icon={BarChart3}
        badge={<AdminBadge tone="sky" dot>真实数据</AdminBadge>}
        actions={
          <button onClick={fetchData} disabled={loading} className="admin-btn admin-btn-ghost disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 text-sky-800 ${loading ? "animate-spin" : ""}`} />
            刷新统计
          </button>
        }
      />

      {loading ? (
        <AdminSpinner label="正在聚合全站作答、模考与错题数据..." />
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard
              label="全站累计作答量"
              value={answered.toLocaleString()}
              suffix="道次"
              icon={BookOpen}
              tone="sky"
              hint={`覆盖 ${num(totals?.userCount)} 名学员`}
              badge={<AdminBadge tone="sky">真实作答</AdminBadge>}
            />
            <AdminStatCard
              label="全站平均正确率"
              value={accuracy}
              suffix="%"
              icon={Target}
              tone="blue"
              hint={bestSubject ? `${bestSubject.subjectCode} 正确率最高` : "暂无足够作答数据"}
              badge={<AdminBadge tone="blue">四科聚合</AdminBadge>}
            />
            <AdminStatCard
              label="全站模考次数"
              value={num(totals?.mockCount)}
              suffix="次"
              icon={Award}
              tone="amber"
              hint="含整卷模考与 AI 混合卷"
              badge={<AdminBadge tone="amber">真实交卷</AdminBadge>}
            />
            <AdminStatCard
              label="错题掌握数"
              value={num(totals?.wrongMastered)}
              suffix={`/ ${num(totals?.wrongTotal)}`}
              icon={Users}
              tone="emerald"
              hint="错题本中已标记掌握的数量"
              badge={<AdminBadge tone="emerald">闭环更新</AdminBadge>}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AdminPanel
              title="近 14 天学习活跃度"
              subtitle="按真实作答流水统计每日作答量与正确量"
              icon={TrendingUp}
              action={<AdminBadge tone="sky">真实流水</AdminBadge>}
            >
              {dailyActivity.length > 0 ? (
                <div className="flex h-52 items-end gap-2">
                  {dailyActivity.map((item) => {
                    const answered = num(item.answered);
                    const correct = num(item.correct);
                    const height = Math.max(8, Math.round((answered / maxDailyAnswered) * 100));
                    return (
                      <div key={item.day} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div className="relative flex h-40 w-full items-end justify-center">
                          <div
                            className="w-full max-w-[30px] rounded-t-lg bg-sky-800/80 transition-all group-hover:bg-sky-700 dark:bg-sky-500/70"
                            style={{ height: `${height}%` }}
                            title={`${item.day.slice(0, 10)}：作答 ${answered}，正确 ${correct}`}
                          />
                        </div>
                        <span className="w-full truncate text-center font-mono text-[8px]" style={{ color: "var(--a-faint)" }}>
                          {item.day.slice(5, 10)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <AdminEmptyState
                  title="暂无每日活跃数据"
                  description="学员完成练习或模考后，这里会自动生成趋势。"
                  icon={TrendingUp}
                />
              )}
            </AdminPanel>

            <AdminPanel
              title="四科正确率对比"
              subtitle="按全站真实作答统计，低于 60% 的科目建议优先补强"
              icon={Target}
              action={<AdminBadge tone="blue">四科聚合</AdminBadge>}
            >
              <div className="space-y-4">
                {subjectAccuracy.map((item) => (
                  <div key={item.code}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AdminBadge tone={subjectTone[item.code] || "slate"}>
                          {item.code}
                        </AdminBadge>
                        <span className="text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                          {SUBJECT_LABELS[item.code] || item.code}
                        </span>
                        <span className="text-[9px]" style={{ color: "var(--a-faint)" }}>
                          {item.answered} 次作答
                        </span>
                      </div>
                      <span className="font-mono text-[12px] font-black" style={{ color: "var(--a-text)" }}>
                        {item.rate}%
                      </span>
                    </div>
                    <div className="admin-progress" style={{ height: 6 }}>
                      <span
                        className={item.rate >= 70 ? "bg-emerald-600" : item.rate >= 50 ? "bg-amber-500" : "bg-rose-500"}
                        style={{ width: `${Math.min(100, item.rate)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </AdminPanel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AdminPanel
              title="全站高频失分章节"
              subtitle="按真实答错次数排序"
              icon={Award}
              action={<AdminLink href="/admin/questions">题库运维</AdminLink>}
            >
              {topChapters.length > 0 ? (
                <div className="space-y-2">
                  {topChapters.map((point, index) => {
                    const wrong = num(point.wrongCount);
                    const percent = Math.min(100, Math.round((wrong / maxChapterWrong) * 100));
                    return (
                      <div
                        key={`${point.subjectCode}-${point.chapterName}`}
                        className="group rounded-2xl border px-3.5 py-3 transition-colors hover:border-sky-800/25"
                        style={{
                          borderColor: "var(--a-border)",
                          background: "color-mix(in srgb, var(--a-surface-solid) 55%, transparent)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-mono text-[10px] font-black ${
                                index < 3
                                  ? "bg-[#1f3a56] text-white"
                                  : "bg-slate-500/10 text-slate-500 dark:text-slate-300"
                              }`}
                            >
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                                {point.chapterName}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <AdminBadge tone={subjectTone[point.subjectCode] || "slate"}>
                                  {point.subjectCode}
                                </AdminBadge>
                                <span className="text-[10px]" style={{ color: "var(--a-faint)" }}>
                                  全站累计答错 {wrong} 次
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-mono text-[11px] font-black text-rose-500">错误 {wrong}</p>
                            <div className="mt-1.5 w-24">
                              <div className="admin-progress" style={{ height: 4 }}>
                                <span className="bg-rose-600" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <AdminEmptyState
                  title="暂无失分章节数据"
                  description="学员完成练习或模考后，这里会自动聚合高频失分章节。"
                  icon={Award}
                />
              )}
            </AdminPanel>

            <AdminPanel
              title="全站答错次数最高题目"
              subtitle="真实错题流水聚合 · Top 4"
              icon={Flame}
              action={<AdminBadge tone="rose">需重点讲解</AdminBadge>}
            >
              {topWrong.length > 0 ? (
                <div className="space-y-3">
                  {topWrong.map((item) => (
                    <div
                      key={item.questionId}
                      className="rounded-2xl border p-4 transition-colors hover:border-rose-500/25"
                      style={{
                        borderColor: "var(--a-border)",
                        background: "color-mix(in srgb, var(--a-surface-solid) 55%, transparent)",
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500">
                            <AlertTriangle className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                              {item.chapterName || item.questionId}
                            </p>
                            <p className="line-clamp-1 text-[10px]" style={{ color: "var(--a-faint)" }}>
                              {item.stem || "题目内容"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AdminBadge tone={subjectTone[item.subjectCode] || "slate"}>
                            {item.subjectCode}
                          </AdminBadge>
                          <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-extrabold text-rose-600 dark:text-rose-300">
                            答错 {num(item.wrongCount)} 次
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 rounded-xl border border-rose-500/15 bg-rose-500/[0.05] px-3 py-2.5 text-[10px] leading-relaxed text-rose-700 dark:text-rose-300">
                        <span className="font-extrabold">运营建议：</span>
                        该题在全站累计答错 {num(item.wrongCount)} 次，建议在题库解析中补充采分点拆解与同类变式训练。
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  title="暂无错题数据"
                  description="学员练习或模考产生错题后，这里会自动展示高频错题。"
                  icon={Flame}
                />
              )}

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-bold" style={{ color: "var(--a-muted)" }}>
                  <Activity className="h-3.5 w-3.5 text-amber-500" />
                  数据来自真实作答与错题流水，不再使用静态占位
                </div>
                <ArrowUpRight className="h-4 w-4 text-amber-500/80" />
              </div>
            </AdminPanel>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                title: "学科覆盖",
                value: `${num(totals?.questionCount)} 道题`,
                desc: "真题 + AI 练习题库",
                icon: Layers,
                tone: "text-sky-800",
              },
              {
                title: "高频失分章节",
                value: `${topChapters.length} 个`,
                desc: "按全站真实答错次数排序",
                icon: Award,
                tone: "text-blue-500",
              },
              {
                title: "数据口径",
                value: "作答 + 模考 + 错题",
                desc: "与个性化备考规划保持一致",
                icon: Sparkles,
                tone: "text-emerald-500",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-center gap-3 rounded-2xl border px-4 py-3.5"
                  style={{ borderColor: "var(--a-border)", background: "var(--a-surface)" }}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500/5 ${item.tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--a-faint)" }}>
                      {item.title}
                    </p>
                    <p className="truncate text-[12px] font-extrabold" style={{ color: "var(--a-text)" }}>
                      {item.value}
                    </p>
                    <p className="truncate text-[10px]" style={{ color: "var(--a-faint)" }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
