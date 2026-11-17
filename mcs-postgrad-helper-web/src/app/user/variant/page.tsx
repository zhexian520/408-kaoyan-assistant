"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import MarkdownView from "@/components/MarkdownView";
import { useAuth } from "@/context/AuthContext";
import { 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  HelpCircle, 
  ArrowRight, 
  Bookmark, 
  FileText,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  BookOpen,
  Shuffle,
  Flame,
  Target,
  Compass,
  Zap,
  BookMarked
} from "lucide-react";

interface SubQuestion {
  sub_index: number;
  question: string;
  score: number;
  standard_answer: string;
  rubric_points: string[];
}

interface OptionItem {
  key: string;
  text: string;
}

interface VariantQuestion {
  is_real_ai?: boolean;
  variant_type?: string;
  source_exam_point: string;
  reference_true_exam: string;
  subject_code: string;
  subject_name: string;
  difficulty: number;
  score: number;
  stem: string;
  options?: OptionItem[];
  sub_questions?: SubQuestion[];
  answer?: string;
  explanation: string;
  design_rationale: string;
  trap_analysis?: string;
  base_question_id?: string;
  original_exam_info?: {
    year?: number;
    question_number?: number;
    stem?: string;
    answer?: string;
    explanation?: string;
  };
}

function VariantContent() {
  const { user } = useAuth();
  const authToken = () => user?.token || (typeof window !== "undefined" ? localStorage.getItem("408_auth_token") || "" : "");
  const searchParams = useSearchParams();
  const qidParam = searchParams.get("qid") || "";
  const yearParam = searchParams.get("year");
  const numParam = searchParams.get("num");
  const subParam = searchParams.get("sub") || searchParams.get("subject") || "DS";
  const titleParam = searchParams.get("title") || "";
  const chapterParam = searchParams.get("chapter") || "";
  const sourceParam = searchParams.get("source") || "";
  const wrongBaseConsumedRef = useRef(false);

  // 原题信息缓存
  const [origQuestion, setOrigQuestion] = useState<{
    id?: string;
    year?: number;
    questionNumber?: number;
    subjectName?: string;
    subjectCode?: string;
    chapterName?: string;
    stem?: string;
    answer?: string;
    explanation?: string;
    questionType?: string;
    options?: any[];
    isKnowledgePointBase?: boolean;
  } | null>(null);

  const [showOrigDetail, setShowOrigDetail] = useState(false);
  const [question, setQuestion] = useState<VariantQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [generationError, setGenerationError] = useState("");

  // 选题工作台状态
  const [wrongList, setWrongList] = useState<any[]>([]);
  const [selectedRandomSubject, setSelectedRandomSubject] = useState<string>("");
  const [randomDrawing, setRandomDrawing] = useState(false);

  // 用户作答状态
  const [userChoice, setUserChoice] = useState<string>("");
  const [userSubAnswer, setUserSubAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [recordedToWrongBook, setRecordedToWrongBook] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // 预设四科高频经典真题（覆盖 408 核心大题/高频选择考点）
  const PRESET_HIGH_FREQUENCY = [
    {
      id: "exam-2026-2",
      year: 2026,
      questionNumber: 2,
      subjectName: "数据结构",
      subjectCode: "DS",
      chapterName: "线性表",
      tag: "双向链表指针调整",
      stem: "设有一个双向链表 L，结构为 [p2, p1]，头结点为 head。初始时 head = cu。现要将每个结点的 p2 指向 p1 指向结点的直接后继，应该进行的操作是（ ）。"
    },
    {
      id: "exam-2024-42",
      year: 2024,
      questionNumber: 42,
      subjectName: "数据结构",
      subjectCode: "DS",
      chapterName: "查找",
      tag: "散列表与冲突探测",
      stem: "将关键字 20, 3, 11, 18, 9, 14, 7 依次存储到长度为 11 的散列表中，采用除留余数法和线性探测再散列法解决冲突，分析平均查找长度与冲突次数。"
    },
    {
      id: "exam-2022-45",
      year: 2022,
      questionNumber: 45,
      subjectName: "操作系统",
      subjectCode: "OS",
      chapterName: "文件系统",
      tag: "混合索引最大文件计算",
      stem: "某文件系统的磁盘块大小为 4 KB，目录项由文件名和索引节点号构成，每个索引节点包含 10 个直接地址项、1 个一级间接项、1 个二级间接项，求支持的最大文件大小。"
    },
    {
      id: "exam-2020-47",
      year: 2020,
      questionNumber: 47,
      subjectName: "计算机网络",
      subjectCode: "CN",
      chapterName: "网络层与传输层",
      tag: "CIDR子网路由与TCP拥塞",
      stem: "某校园网有两个局域网，通过路由器 R1、R2 和 R3 互联后接入 Internet。请分析 CIDR 汇聚路由表与 TCP 连接建立及拥塞窗口演进。"
    }
  ];

  // 拉取用户的错题记录
  const fetchWrongNotebookQuestions = async () => {
    try {
      const res = await fetch("/api/test/wrong-questions", { headers: { Authorization: `Bearer ${authToken()}` } });
      const json = await res.json();
      if (json.code === 200 && json.data && json.data.length > 0) {
        const topItems = json.data.slice(0, 4);
        const enhanced = await Promise.all(
          topItems.map(async (item: any) => {
            // 变式题 / 每日补给 / Agent 自测题没有题库 ID，题干存放在 customQuestionJson 里
            if (item.customQuestionJson) {
              try {
                const custom =
                  typeof item.customQuestionJson === "string"
                    ? JSON.parse(item.customQuestionJson)
                    : item.customQuestionJson;
                if (custom && custom.stem) {
                  const rawOptions = Array.isArray(custom.options) ? custom.options : null;
                  const normalizedOptions = rawOptions
                    ? rawOptions.map((opt: any, idx: number) =>
                        typeof opt === "string"
                          ? {
                              key: String.fromCharCode(65 + idx),
                              text: opt.replace(/^[A-Za-z][.、:：]\s*/, ""),
                            }
                          : opt
                      )
                    : null;
                  return {
                    ...item,
                    stem: custom.stem,
                    answer: custom.answer || custom.standard_answer || "",
                    explanation: custom.explanation || custom.design_rationale || "",
                    options: normalizedOptions,
                    questionType: normalizedOptions && normalizedOptions.length ? "SINGLE_CHOICE" : "COMPREHENSIVE",
                    isCustomQuestion: true,
                  };
                }
              } catch (e) {
                console.warn("解析错题自定义题干异常:", e);
              }
            }
            if (item.questionId && !item.questionId.startsWith("variant-") && !item.questionId.startsWith("agent-") && !item.questionId.startsWith("push-q-")) {
              try {
                const qRes = await fetch(`/api/exams/questions/${item.questionId}`);
                const qJson = await qRes.json();
                if (qJson.code === 200 && qJson.data) {
                  return { ...item, ...qJson.data };
                }
              } catch {}
            }
            return item;
          })
        );
        setWrongList(enhanced);
      }
    } catch (e) {
      console.warn("加载错题列表异常:", e);
    }
  };

  // 初始化：只按 URL 指定的题目/知识点生成；直接进入页面时展示母题选择工作台
  useEffect(() => {
    if (sourceParam !== "wrong") {
      wrongBaseConsumedRef.current = false;
    }
    if (qidParam) {
      setLoading(true);
      fetch(`/api/exams/questions/${qidParam}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.code === 200 && res.data) {
            setOrigQuestion(res.data);
            generateVariant(res.data);
          } else {
            setLoading(false);
            setGenerationError("未找到该原题，请重新选择母题");
            fetchWrongNotebookQuestions();
          }
        })
        .catch(() => {
          setLoading(false);
          setGenerationError("原题加载失败，请重新选择母题");
          fetchWrongNotebookQuestions();
        });
    } else if (titleParam) {
      // 课程中心 / 知识图谱跳转：按知识点直接生成变式
      const base = {
        id: `kp-${titleParam}`,
        year: yearParam ? Number(yearParam) : undefined,
        questionNumber: numParam ? Number(numParam) : undefined,
        subjectName: subParam,
        subjectCode: subParam,
        chapterName: chapterParam || titleParam,
        stem: titleParam,
        questionType: "SINGLE_CHOICE",
        isKnowledgePointBase: true,
      };
      setOrigQuestion(base);
      generateVariant(base);
    } else if (sourceParam === "wrong" && !wrongBaseConsumedRef.current) {
      wrongBaseConsumedRef.current = true;
      // 从错题医生弹窗明确点击“立即做变式题”：只消费一次本次错题作为母题
      let pending: any = null;
      try {
        const stored = sessionStorage.getItem("pending_variant_base");
        if (stored) {
          pending = JSON.parse(stored);
        }
        sessionStorage.removeItem("pending_variant_base");
      } catch {
        pending = null;
      }
      if (pending && pending.stem) {
        setOrigQuestion(pending);
        generateVariant(pending);
      } else {
        setOrigQuestion(null);
        setQuestion(null);
        setLoading(false);
        setGenerationError("未读取到该错题，请返回错题本重新点击「立即做变式题」");
        fetchWrongNotebookQuestions();
      }
    } else if (sourceParam === "wrong") {
      // Strict Mode 会重复执行 effect：第一次已消费错题母题，这里保持当前生成状态
    } else {
      // 没有原题就没有变式题：不读取上次缓存，也不自动生成
      setOrigQuestion(null);
      setQuestion(null);
      setLoading(false);
      setGenerationError("");
      try {
        sessionStorage.removeItem("active_variant_question");
        sessionStorage.removeItem("pending_variant_base");
      } catch {
        // 忽略隐私模式下的存储异常
      }
      fetchWrongNotebookQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qidParam, titleParam, chapterParam, sourceParam]);

  const generateVariant = async (base: any) => {
    // 没有原题就没有变式题：前端也做最后一道拦截
    if (!base || (!base.id && !base.questionId && !base.stem)) {
      setLoading(false);
      setGenerationError("请先选择一道原题或错题，再生成变式题");
      return;
    }
    let requestTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      setLoading(true);
      setSubmitted(false);
      setUserChoice("");
      setUserSubAnswer("");
      setIsCorrect(null);
      setRecordedToWrongBook(false);
      setSavedSuccess(false);
      setGenerationError("");

      // 知识点模式下，origQuestion 会被参考真题信息覆盖；重新生成时必须继续使用 URL 里的知识点
      // 错题列表里的 id 是 MySQL 行号，真正的题目 ID 在 questionId 字段，必须先归一化
      const rawBaseId = base?.questionId ?? base?.id ?? qidParam;
      const baseId = rawBaseId === null || rawBaseId === undefined ? null : String(rawBaseId);
      const kpMode = Boolean(base?.isKnowledgePointBase) || Boolean(baseId?.startsWith("kp-"));
      const kpTitle = titleParam || base?.stem || "";
      const payload = {
        base_question_id: kpMode ? `kp-${kpTitle}` : baseId || null,
        subject_code: (base?.subjectCode || subParam || "DS").toUpperCase(),
        base_stem: kpMode ? kpTitle : base?.stem || null,
        base_options: kpMode ? null : base?.options || null,
        base_answer: kpMode ? null : base?.answer || null,
        question_type: kpMode
          ? "SINGLE_CHOICE"
          : base?.questionType || (base?.options?.length ? "SINGLE_CHOICE" : "COMPREHENSIVE"),
        year: base?.year || (yearParam ? Number(yearParam) : null),
        question_number: base?.questionNumber || (numParam ? Number(numParam) : null),
        chapter_name: kpMode ? chapterParam || base?.chapterName || null : base?.chapterName || null,
        // 知识点跳转时给模型更明确的命题上下文
        base_explanation: kpMode
          ? `请围绕 408 统考知识点「${kpTitle}」进行命题，覆盖定义、核心模型、常见陷阱与 408 真题常见考法。`
          : base?.explanation || null
      };

      const controller = new AbortController();
      requestTimer = setTimeout(() => controller.abort(), 120000);
      const res = await fetch("/ai-api/api/ai/generate-variant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken()}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (requestTimer) {
        clearTimeout(requestTimer);
        requestTimer = null;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const rawDetail = json.detail || json.message;
        const detailText =
          typeof rawDetail === "string"
            ? rawDetail
            : rawDetail?.message || (rawDetail ? JSON.stringify(rawDetail) : "");
        throw new Error(
          res.status === 401
            ? "登录状态已失效，请重新登录后再生成变式题"
            : res.status === 422
            ? "提交给 AI 的题目参数不完整，请更换母题后重试"
            : detailText || `生成接口返回 ${res.status}`
        );
      }
      if (json.code === 200 && json.data) {
        setQuestion(json.data);
        // 如果后端补全了原题信息，同步更新前端原题状态
        if (json.data.original_exam_info) {
          const info = json.data.original_exam_info;
          setOrigQuestion((prev) => ({
            ...prev,
            id: info.id || prev?.id,
            year: info.year || prev?.year,
            questionNumber: info.question_number || prev?.questionNumber,
            subjectCode: info.subject_code || prev?.subjectCode,
            chapterName: info.chapter_name || prev?.chapterName,
            stem: info.stem || prev?.stem,
            answer: info.answer || prev?.answer,
            explanation: info.explanation || prev?.explanation,
            options: info.options || prev?.options,
            questionType: prev?.questionType
          }));
        }
      } else {
        throw new Error(json.message || json.detail || "AI 没有返回有效的变式题");
      }
    } catch (err: any) {
      console.error("生成变式题失败:", err);
      const message =
        err?.name === "AbortError"
          ? "AI 生成超时（超过 2 分钟），请点击「重新生成」再试一次"
          : typeof err?.message === "string" && err.message !== "[object Object]"
          ? err.message
          : "生成变式题失败，请稍后重试";
      setGenerationError(message);
    } finally {
      if (requestTimer) clearTimeout(requestTimer);
      setLoading(false);
    }
  };

  // 随机从题库抽选一道真实真题
  const handleRandomDraw = async (subject?: string) => {
    const sub = subject !== undefined ? subject : selectedRandomSubject;
    setRandomDrawing(true);
    setLoading(true);
    try {
      let url = `/api/exams/questions?pageNum=1&pageSize=1`;
      if (sub) url += `&subjectCode=${sub}`;
      const countRes = await fetch(url);
      const countJson = await countRes.json();
      const total = countJson.data?.total || 100;

      const randomPage = Math.floor(Math.random() * Math.min(total, 50)) + 1;
      let pickUrl = `/api/exams/questions?pageNum=${randomPage}&pageSize=1`;
      if (sub) pickUrl += `&subjectCode=${sub}`;
      const pickRes = await fetch(pickUrl);
      const pickJson = await pickRes.json();

      if (pickJson.code === 200 && pickJson.data?.list?.length > 0) {
        const picked = pickJson.data.list[0];
        setOrigQuestion(picked);
        sessionStorage.setItem("active_variant_question", JSON.stringify(picked));
        await generateVariant(picked);
      }
    } catch (err) {
      console.error("随机抽题失败:", err);
      setLoading(false);
    } finally {
      setRandomDrawing(false);
    }
  };

  // 挑选一道预设真题或错题
  const handleSelectQuestion = async (q: any) => {
    setOrigQuestion(q);
    sessionStorage.setItem("active_variant_question", JSON.stringify(q));
    await generateVariant(q);
  };

  // 更换其他真题，返回工作台
  const handleResetToSelection = () => {
    setOrigQuestion(null);
    setQuestion(null);
    setSubmitted(false);
    setUserChoice("");
    setUserSubAnswer("");
    sessionStorage.removeItem("active_variant_question");
    fetchWrongNotebookQuestions();
  };

  const handleSubmitAnswer = async () => {
    if (!question) return;

    const isChoice = question.variant_type === "SINGLE_CHOICE" || (question.options && question.options.length > 0);
    let right = false;

    if (isChoice) {
      if (!userChoice) {
        alert("请先选择一个选项再提交！");
        return;
      }
      const std = (question.answer || "").trim().toUpperCase();
      right = userChoice.trim().toUpperCase() === std;
    } else {
      if (!userSubAnswer.trim()) {
        alert("请先输入您的解题思路或伪代码！");
        return;
      }
      right = userSubAnswer.length >= 25; // 综合大题按字数与完整度初判
    }

    setIsCorrect(right);
    setSubmitted(true);

    // 记录变式题作答流水，用于个性化规划真实进度
    try {
      await fetch("/api/exams/attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken()}`,
        },
        body: JSON.stringify({
          questionId: `variant-${origQuestion?.id || Date.now()}`,
          subjectCode: question.subject_code || "DS",
          isCorrect: right,
          userAnswer: isChoice ? userChoice : userSubAnswer,
          sourceType: "VARIANT",
        }),
      });
    } catch (err) {
      console.warn("记录变式题作答失败:", err);
    }

    // 如果做错了，立即自动记录到错题本！
    if (!right) {
      try {
        await fetch("/ai-api/api/ai/wrong-question", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken()}`,
          },
          body: JSON.stringify({
            user_id: user?.userId || 2,
            question_id: `variant-${origQuestion?.id || Date.now()}`,
            subject_code: (question.subject_code || "DS").toLowerCase(),
            custom_question_json: {
              stem: question.stem,
              options: question.options || null,
              answer: question.answer,
              explanation: question.explanation,
              reference_true_exam: question.reference_true_exam,
              source_exam_point: question.source_exam_point,
              design_rationale: question.design_rationale
            },
            source_type: "VARIANT",
            error_reason_tag: "CONCEPT_CONFUSION",
            user_notes: `408真题变式题作答失分（原真题: ${origQuestion?.year || ''}年第${origQuestion?.questionNumber || ''}题）`,
            last_wrong_answer: isChoice ? userChoice : userSubAnswer
          })
        });
        setRecordedToWrongBook(true);
      } catch (e) {
        console.error("收录错题失败:", e);
      }
    }
  };

  const handleSaveToNotes = async () => {
    if (!question) return;
    try {
      await fetch("/api/user/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken()}`
        },
        body: JSON.stringify({
          title: `【真题变式题】${question.source_exam_point || "408重点考查"}`,
          subjectCode: question.subject_code,
          contentMd: `## 变式题干\n${question.stem}\n\n## 官方参考解答\n${question.answer || ''}\n\n## 详细推导与解析\n${question.explanation}\n\n## 命题反转设计思想\n${question.design_rationale}`,
          excerptSource: question.reference_true_exam,
          tagsJson: JSON.stringify(["变式题", question.source_exam_point || "408核心"])
        })
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("保存笔记失败:", err);
    }
  };

  const isChoiceQuestion = question?.variant_type === "SINGLE_CHOICE" || (question?.options && question.options.length > 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 顶部面包屑与标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Link href="/user/exams" className="hover:text-blue-600 font-semibold transition-colors">
              408 真题题库
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-900 dark:text-zinc-100 font-bold">考点动态变式练习</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-blue-600 animate-spin-slow" />
            <span>AI 实时考点变式练习系统</span>
            {(origQuestion?.isKnowledgePointBase || titleParam) && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-900 font-bold">
                按知识点生成
              </span>
            )}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-extrabold">
              DeepSeek 实时驱动
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {question && origQuestion && (
            <button
              onClick={() => generateVariant(origQuestion)}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold shadow-sm transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>重新生成一道新变式</span>
            </button>
          )}
          <Link
            href="/user/wrong-notebook"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>查看错题本</span>
          </Link>
        </div>
      </div>

      {/* 原真题溯源信息面板 */}
      {origQuestion && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-black shadow-xs">
                🎯 关联原真题
              </span>
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-zinc-100">
                {origQuestion.isKnowledgePointBase
                  ? `知识点：${origQuestion.stem || origQuestion.chapterName || "课程知识点"}`
                  : origQuestion.year
                  ? `${origQuestion.year} 年统考第 ${origQuestion.questionNumber} 题`
                  : "408 全国统考经典真题"}
              </span>
              {origQuestion.subjectName && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-100 dark:border-blue-900">
                  {origQuestion.subjectName}
                </span>
              )}
              {origQuestion.chapterName && (
                <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                  · {origQuestion.chapterName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOrigDetail(!showOrigDetail)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <span>{showOrigDetail ? "收起原题" : "查看原题干与解析"}</span>
                {showOrigDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleResetToSelection}
                className="text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-blue-600 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>更换其他母题</span>
              </button>
            </div>
          </div>

          {showOrigDetail && (
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-3 animate-in fade-in duration-200 text-xs sm:text-sm">
              <div className="bg-slate-50 dark:bg-zinc-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-700">
                <span className="font-bold text-slate-500 block mb-1 text-xs">【原题题干】：</span>
                <MarkdownView content={origQuestion.stem || "无题干"} />
              </div>

              {origQuestion.answer && (
                <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 text-xs">
                  <span className="font-bold">【原题参考答案】：</span> {origQuestion.answer}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 当未关联原题时，呈现专业的【原题挑选工作台】 */}
      {!origQuestion && !question && !loading && (
        <div className="space-y-6">
          {generationError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
              {generationError}
            </div>
          )}
          {/* 工作台说明卡片 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-blue-600">
              <Compass className="w-5 h-5" />
              <h2 className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
                变式攻坚第一步：请选择一道 408 统考真题作为生成母题
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
              真实的变式练习绝非空中楼阁，必须扎根于全国统考 408 真实母题。DeepSeek 命题引擎将解构该母题的核心命题逻辑、考查要点与易错陷阱，进行参量扰动、情境重构与反向求解推导。请从下方选择你的母题来源：
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
              {/* 通道 1：题库随机抽题 */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100">通道一：题库随机抽题</span>
                  </div>
                  <span className="text-[11px] text-slate-400">题库共 2929 道题</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { code: "", label: "全部科目" },
                    { code: "DS", label: "数据结构" },
                    { code: "CO", label: "组成原理" },
                    { code: "OS", label: "操作系统" },
                    { code: "CN", label: "计算机网络" }
                  ].map((sub) => (
                    <button
                      key={sub.code}
                      type="button"
                      onClick={() => setSelectedRandomSubject(sub.code)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        selectedRandomSubject === sub.code
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 hover:text-purple-600"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleRandomDraw()}
                  disabled={randomDrawing}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{randomDrawing ? "正在随机抽取真题并生成变式..." : "🎲 随机抽题并开始变式训练"}</span>
                </button>
              </div>

              {/* 通道 2：真题专区自主选拔 */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-zinc-100">通道二：真题专区自由挑选</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    进入【408 全真试题专区】，按年份（2009-2026）、学科、题型与考点精细检索，在每道试题右上角点击「做变式题」即可直接直通！
                  </p>
                </div>
                <Link
                  href="/user/exams"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Layers className="w-4 h-4" />
                  <span>前往 408 真题专区挑选母题 →</span>
                </Link>
              </div>
            </div>
          </div>

          {/* 通道 3：错题靶向攻坚 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                  🎯 靶向攻坚 · 从我的错题本挑一道做变式
                </h3>
              </div>
              <Link href="/user/wrong-notebook" className="text-xs font-bold text-rose-600 hover:text-rose-700">
                查看全部错题 →
              </Link>
            </div>

            {wrongList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {wrongList.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-rose-400 transition-all flex flex-col justify-between space-y-2 group shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                          错题母题
                        </span>
                        <span className="font-extrabold text-slate-800 dark:text-zinc-200">
                          {w.year ? `${w.year}年 第${w.questionNumber}题` : `题目 #${w.questionId || idx + 1}`}
                        </span>
                        {w.subjectName && (
                          <span className="text-[10px] text-slate-400">· {w.subjectName}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {w.stem || w.customQuestionJson?.stem || "408统考历史错题"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectQuestion(w)}
                      className="self-end px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      <span>针对此错题生成变式</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                <p>暂无待攻坚错题记录（太棒了！或者你还没有在真题专区交过卷）</p>
                <p className="text-[11px] text-slate-400">建议从下方的「历年高频真题直通车」挑选一道经典题目开始练习！</p>
              </div>
            )}
          </div>

          {/* 通道 4：历年高频经典真题直通车 */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800">
              <Flame className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                ⭐ 历年高频经典真题直通车 (精选 408 核心命题模型)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {PRESET_HIGH_FREQUENCY.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-400 transition-all flex flex-col justify-between space-y-2.5 shadow-xs group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-[11px] border border-blue-100 dark:border-blue-900">
                          {q.subjectName}
                        </span>
                        <span className="font-extrabold text-xs text-slate-900 dark:text-zinc-100">
                          {q.year} 年统考第 {q.questionNumber} 题
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold">
                        {q.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {q.stem}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectQuestion(q)}
                    className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>以此题为母题出变式</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 生成失败提示 */}
      {!loading && origQuestion && !question && generationError && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-xs dark:border-rose-900/60 dark:bg-rose-950/20">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-rose-800 dark:text-rose-200">变式题生成失败</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-rose-700/80 dark:text-rose-300/80">{generationError}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => generateVariant(origQuestion)}
                className="rounded-xl bg-rose-600 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-rose-700"
              >
                重新生成
              </button>
              <button
                type="button"
                onClick={handleResetToSelection}
                className="rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:bg-zinc-900 dark:text-rose-300"
              >
                更换母题
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 变式题主体卡片 */}
      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
              DeepSeek AI 正在解构原题考点并实时生成变式...
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              分析底层命题逻辑，自动转换复杂时空/硬件图表为严密 Markdown/KaTeX 规范，重构反向推导演练情境。
            </p>
            <p className="text-[10px] text-zinc-400 pt-1">
              通常需要 10-60 秒；若超过 2 分钟会自动提示重试。
            </p>
          </div>
        </div>
      ) : question ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          {/* 变式题标头 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl bg-purple-600 text-white text-xs font-black">
                {question.reference_true_exam || "408考点高仿真变式"}
              </span>
              <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 text-xs font-bold">
                {question.subject_name || "408专业课"}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold">
                {isChoiceQuestion ? "单项选择题" : "综合应用大题"} ({question.score || 2} 分)
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 text-xs font-bold">
                难度: {"★".repeat(question.difficulty || 4)}
              </span>
              {question.is_real_ai === false && (
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 text-xs font-bold">
                  AI 繁忙 · 原题巩固
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveToNotes}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{savedSuccess ? "已存入笔记 ✓" : "存入笔记"}</span>
              </button>
            </div>
          </div>

          {/* 变式题干 (支持 Markdown & LaTeX 公式 & Mermaid/表格图表) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              【变式题干】：
            </span>
            <div className="text-sm sm:text-base text-zinc-900 dark:text-zinc-100 leading-relaxed bg-zinc-50/60 dark:bg-zinc-800/40 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <MarkdownView content={question.stem} />
            </div>
          </div>

          {/* 单选题作答选项 */}
          {isChoiceQuestion && question.options && question.options.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                选择你的作答：
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {question.options.map((opt) => {
                  const isSelected = userChoice === opt.key;
                  const isStd = opt.key === question.answer;

                  let borderClass = "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900";
                  if (submitted) {
                    if (isStd) {
                      borderClass = "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30";
                    } else if (isSelected && !isCorrect) {
                      borderClass = "border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/30";
                    }
                  } else if (isSelected) {
                    borderClass = "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/30";
                  }

                  return (
                    <button
                      key={opt.key}
                      disabled={submitted}
                      onClick={() => setUserChoice(opt.key)}
                      className={`flex items-start gap-3 p-4 rounded-2xl border text-left text-xs sm:text-sm transition-all cursor-pointer ${borderClass}`}
                    >
                      <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                      }`}>
                        {opt.key}
                      </span>
                      <div className="flex-1 text-zinc-800 dark:text-zinc-200">
                        <MarkdownView content={opt.text} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 综合大题小问与文本作答 */}
          {!isChoiceQuestion && (
            <div className="space-y-4 pt-2">
              {question.sub_questions && question.sub_questions.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                    综合大题小问设问：
                  </span>
                  {question.sub_questions.map((sub) => (
                    <div key={sub.sub_index} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center justify-between font-bold text-zinc-800 dark:text-zinc-200">
                        <span>第 ({sub.sub_index}) 问：{sub.question}</span>
                        <span className="text-blue-600 font-mono">[{sub.score} 分]</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  输入你的解题核心思路或代码草稿：
                </span>
                <textarea
                  value={userSubAnswer}
                  onChange={(e) => setUserSubAnswer(e.target.value)}
                  disabled={submitted}
                  rows={4}
                  placeholder="在此输入您的分步计算推导、伪代码或核心思想，点击提交后进行智能判分..."
                  className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* 提交作答操作栏 */}
          {!submitted ? (
            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={handleSubmitAnswer}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md transition-all hover:scale-105 cursor-pointer"
              >
                确认提交作答
              </button>
            </div>
          ) : (
            <div className="space-y-5 pt-3">
              {/* 作答反馈横幅 */}
              {isCorrect ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="font-extrabold text-sm block">🎉 回答正确！</span>
                      <span className="text-xs opacity-90">精准击破 408 变式题核心设问，已掌握该考点深层机理。</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs">
                    +{question.score} 分
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <XCircle className="w-5 h-5 text-rose-600" />
                      <div>
                        <span className="font-extrabold text-sm block">❌ 作答失误！</span>
                        <span className="text-xs opacity-90">
                          你的作答：{userChoice || "未选"} · 正确参考答案：【{question.answer}】
                        </span>
                      </div>
                    </div>
                    {recordedToWrongBook && (
                      <Link
                        href="/user/wrong-notebook"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all"
                      >
                        <span>已自动收录至错题本</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* 答案与全流程解析 */}
              <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-5 text-xs sm:text-sm">
                <div>
                  <span className="font-extrabold text-emerald-600 text-xs uppercase tracking-wider block mb-1">
                    【官方参考解答】
                  </span>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700 font-bold text-zinc-900 dark:text-zinc-100">
                    {question.answer}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-extrabold text-blue-600 text-xs uppercase tracking-wider block">
                    【详细推导与命题剖析】
                  </span>
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    <MarkdownView content={question.explanation} />
                  </div>
                </div>

                {question.design_rationale && (
                  <div className="space-y-1">
                    <span className="font-extrabold text-purple-600 text-xs uppercase tracking-wider block flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5" />
                      【AI 变式设计逻辑与考查反转】
                    </span>
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                      <MarkdownView content={question.design_rationale} />
                    </div>
                  </div>
                )}

                {question.trap_analysis && (
                  <div className="space-y-1">
                    <span className="font-extrabold text-amber-600 text-xs uppercase tracking-wider block flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      【408 核心易错陷阱预警】
                    </span>
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                      <MarkdownView content={question.trap_analysis} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function VariantExercisePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">加载变式练习中...</div>}>
      <VariantContent />
    </Suspense>
  );
}
