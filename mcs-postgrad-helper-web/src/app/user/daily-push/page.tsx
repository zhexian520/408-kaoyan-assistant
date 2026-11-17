"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles,
  CalendarDays,
  BookOpen,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Lightbulb,
  Target,
  ChevronRight,
} from "lucide-react";
import MarkdownView from "@/components/MarkdownView";

interface PushQuestion {
  id: string;
  subject: string;
  knowledge_point: string;
  content: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface PushData {
  answer: string;
  push_result: {
    knowledge_point_title: string;
    knowledge_point_content: string;
    subject: string;
    questions: PushQuestion[];
  };
  pushed_ids: string[];
  cached: boolean;
  generated_for: string;
}

interface Feedback {
  is_correct: boolean;
  message: string;
  correct_answer: string;
  explanation: string;
  correction_hint?: string;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default function DailyPushPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PushData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [wrongSynced, setWrongSynced] = useState<Record<string, boolean>>({});

  const token = () =>
    typeof window !== "undefined" ? localStorage.getItem("408_auth_token") || "" : "";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/pilot/daily-push", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) {
        setError("登录状态已失效，请重新登录后使用每日补给。");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err: any) {
      setError(`每日补给加载失败：${err.message || "请确认 408 Pilot 引擎（8010）已启动"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const storageKey = data ? `408_daily_push_${user?.userId || 0}_${data.generated_for}` : "";

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved) {
        setSelected(saved.selected || {});
        setFeedback(saved.feedback || {});
        setCompleted(!!saved.completed);
        setWrongSynced(saved.wrongSynced || {});
      }
    } catch {
      // 忽略损坏的本地缓存
    }
  }, [storageKey]);

  const submitAnswer = async (question: PushQuestion) => {
    const selectedOption = selected[question.id];
    if (!selectedOption || !data) return;
    const push = data.push_result;
    setSubmitting(question.id);
    try {
      const res = await fetch("/pilot/daily-push/submit-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          question_id: question.id,
          selected_option: selectedOption,
          correct_answer: question.answer,
          question_content: question.content,
          options: question.options,
          explanation: question.explanation,
          subject: question.subject,
          knowledge_point: question.knowledge_point,
        }),
      });
      const json = await res.json();
      const nextFeedback = { ...feedback, [question.id]: json };
      setFeedback(nextFeedback);

      // 同步到 MySQL 作答流水，让个性化备考规划自动更新
      const subjectCodeMap: Record<string, string> = {
        数据结构: "DS",
        计算机组成原理: "CO",
        操作系统: "OS",
        计算机网络: "CN",
      };
      const subjectCode = subjectCodeMap[question.subject] || "DS";
      try {
        await fetch("/api/exams/attempt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({
            questionId: question.id,
            subjectCode,
            isCorrect: json.is_correct,
            userAnswer: selectedOption,
            sourceType: "DAILY_PUSH",
          }),
        });
      } catch (err) {
        console.warn("同步每日补给作答失败:", err);
      }

      // 做错自动进入全局错题本（MySQL），与真题练习、变式题共用同一本错题本
      let wrongOk = false;
      if (!json.is_correct) {
        try {
          const wrongRes = await fetch("/ai-api/api/ai/wrong-question", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token()}`,
            },
            body: JSON.stringify({
              user_id: user?.userId || 2,
              question_id: question.id,
              subject_code: subjectCode.toLowerCase(),
              custom_question_json: {
                stem: question.content,
                options: question.options,
                answer: question.answer,
                explanation: question.explanation,
                knowledge_point: question.knowledge_point,
              },
              source_type: "DAILY_PUSH",
              error_reason_tag: "CONCEPT_CONFUSION",
              user_notes: `每日补给 · ${question.knowledge_point}（选 ${selectedOption}，正解 ${question.answer}）`,
              last_wrong_answer: selectedOption,
            }),
          });
          const wrongJson = await wrongRes.json();
          wrongOk = wrongJson.code === 200;
          if (wrongOk) {
            setWrongSynced((prev) => ({ ...prev, [question.id]: true }));
          }
        } catch (err) {
          console.warn("每日补给错题同步失败:", err);
        }
      }

      const allDone = push.questions.every((item) => !!nextFeedback[item.id]);
      const nextWrongSynced = wrongOk
        ? { ...wrongSynced, [question.id]: true }
        : wrongSynced;
      if (storageKey) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ selected, feedback: nextFeedback, completed: allDone, wrongSynced: nextWrongSynced })
        );
      }
      if (allDone) setCompleted(true);
    } catch (err: any) {
      setFeedback((prev) => ({
        ...prev,
        [question.id]: {
          is_correct: false,
          message: `提交失败：${err.message}`,
          correct_answer: question.answer,
          explanation: question.explanation,
        },
      }));
    } finally {
      setSubmitting(null);
    }
  };

  const acknowledge = async () => {
    if (!data) return;
    try {
      await fetch("/pilot/daily-push/acknowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ pushed_ids: data.pushed_ids }),
      });
      setAcknowledged(true);
    } catch {
      setAcknowledged(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-xs text-zinc-500">正在生成今日个性化补给...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900 dark:bg-rose-950/30">
        <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
        <button
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 重新加载
        </button>
      </div>
    );
  }

  if (!data) return null;
  const push = data.push_result;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5" />
            Daily Push · 408 Pilot
          </div>
          <h1 className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">
            每日补给
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            基于你的薄弱点、错题与最近模考诊断，生成今天最值得学的一个知识点和两道配套题。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <CalendarDays className="h-3.5 w-3.5" />
            {data.generated_for}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            <BookOpen className="h-3.5 w-3.5" />
            {push.subject}
          </span>
          {data.cached && !completed && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              今日已缓存
            </span>
          )}
          {completed && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-600 px-3 py-1.5 font-bold text-white">
              <CheckCircle2 className="h-3.5 w-3.5" /> 今日已完成
            </span>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-zinc-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              今日知识点 · {push.knowledge_point_title}
            </h2>
            <p className="text-[10px] text-zinc-400">先读懂，再做两道配套题</p>
          </div>
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <MarkdownView content={push.knowledge_point_content} />
        </div>
      </div>

      {completed && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-emerald-900 dark:text-emerald-200">今日补给已完成</p>
                <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                  共 {push.questions.length} 题，正确 {push.questions.filter((q) => feedback[q.id]?.is_correct).length} 题。
                  {push.questions.some((q) => feedback[q.id] && !feedback[q.id]?.is_correct) && " 做错的题已自动进入全局错题本。"}
                </p>
              </div>
            </div>
            <Link href="/user/wrong-notebook" className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-zinc-900 dark:text-emerald-300">
              去全局错题本 <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-zinc-100">
            <Target className="h-4 w-4 text-blue-600" />
            今日配套练习
          </h2>
          <span className="text-[10px] text-zinc-400">
            共 {push.questions.length} 题 · 提交后自动更新掌握度
          </span>
        </div>

        {push.questions.map((question, index) => {
          const result = feedback[question.id];
          const picked = selected[question.id];
          return (
            <div
              key={question.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 font-mono text-[11px] font-black text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    {index + 1}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-500">
                    {question.subject} · {question.knowledge_point}
                  </span>
                </div>
                {result && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${
                      result.is_correct
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                    }`}
                  >
                    {result.is_correct ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {result.is_correct ? "回答正确" : `正确答案 ${result.correct_answer}`}
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold leading-relaxed text-zinc-800 dark:text-zinc-100">
                {question.content}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {question.options.map((option, optionIndex) => {
                  const letter = OPTION_LETTERS[optionIndex] || String(optionIndex + 1);
                  const active = picked === letter;
                  const correct = result && result.correct_answer === letter;
                  const wrong = result && active && !result.is_correct;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={!!result}
                      onClick={() => setSelected((prev) => ({ ...prev, [question.id]: letter }))}
                      className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-xs leading-relaxed transition-all ${
                        correct
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                          : wrong
                          ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
                          : active
                          ? "border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-500/15 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-200"
                          : "border-slate-200 bg-slate-50 text-zinc-700 hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300"
                      }`}
                    >
                      <span className="font-mono font-black">{letter}</span>
                      <span>{option.replace(/^[A-D][\.、:：\s]+/, "")}</span>
                    </button>
                  );
                })}
              </div>

              {!result ? (
                <button
                  type="button"
                  disabled={!picked || submitting === question.id}
                  onClick={() => submitAnswer(question)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting === question.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  提交答案
                </button>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{result.message}</p>
                  {result.correction_hint && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-300">{result.correction_hint}</p>
                  )}
                  {!result.is_correct && (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-rose-600 dark:text-rose-300">
                      <span>{wrongSynced[question.id] ? "✓ 已自动加入全局错题本" : "错题正在同步到全局错题本..."}</span>
                      <Link href="/user/wrong-notebook" className="underline hover:text-rose-700">去查看</Link>
                    </p>
                  )}
                  {result.explanation && (
                    <p className="mt-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">解析：</span>
                      {result.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-[11px] text-zinc-500">
          每日补给由 408 Pilot 多智能体引擎生成，作答后会自动更新 BKT 掌握度与复习队列。
        </p>
        <button
          type="button"
          onClick={acknowledge}
          disabled={acknowledged}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {completed ? "今日补给已完成" : acknowledged ? "已确认今日补给" : "确认已读今日补给"}
        </button>
      </div>
    </div>
  );
}
