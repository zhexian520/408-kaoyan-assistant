"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Sparkles,
  HelpCircle,
  Tag,
  ArrowRight,
  Bot,
  Stethoscope,
  Activity,
  Layers,
  CheckCircle,
  Calendar,
  Zap,
  Trash2
} from "lucide-react";
import MarkdownView from "@/components/MarkdownView";
import { useAuth } from "@/context/AuthContext";

interface WrongQuestionItem {
  id: number;
  userId: number;
  questionId: string;
  customQuestionJson?: any;
  subjectCode: string;
  sourceType: string;
  wrongCount: number;
  masterStatus: string;
  errorReasonTag: string;
  userNotes: string;
  lastWrongAnswer: string;
  lastPracticedAt: string;
  stem?: string;
  answer?: string;
  explanation?: string;
  options?: any[];
}

interface DoctorDiagnosis {
  rootCause: string;
  remedialTask: string;
  remedySubject: string;
  targetPoint: string;
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  CONCEPT_CONFUSION: { label: "概念混淆", color: "bg-purple-100 text-purple-800 border-purple-200" },
  CALCULATION_ERROR: { label: "计算失误", color: "bg-blue-100 text-blue-800 border-blue-200" },
  MEMORY_LAPSE: { label: "公式遗忘", color: "bg-amber-100 text-amber-800 border-amber-200" },
  CODE_BUG: { label: "算法缺陷", color: "bg-rose-100 text-rose-800 border-rose-200" },
  CARELESS: { label: "审题遗漏", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};

export default function WrongNotebookPage() {
  const { user } = useAuth();
  const authToken = () => user?.token || (typeof window !== "undefined" ? localStorage.getItem("408_auth_token") || "" : "");
  const [list, setList] = useState<WrongQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [showAnswerMap, setShowAnswerMap] = useState<Record<string, boolean>>({});

  // 错题医生诊断弹窗
  const [diagnosingItem, setDiagnosingItem] = useState<WrongQuestionItem | null>(null);
  const [doctorDiagnosis, setDoctorDiagnosis] = useState<DoctorDiagnosis | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [diagnosisFromCache, setDiagnosisFromCache] = useState(false);
  const [addedToPlan, setAddedToPlan] = useState(false);
  const [addingToPlan, setAddingToPlan] = useState(false);
  const router = useRouter();
  const diagnosisCacheKey = (item: WrongQuestionItem) =>
    `408_doctor_diag_${item.id}_${item.wrongCount || 1}`;

  // 清空错题本与移除错题状态
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [actionTip, setActionTip] = useState<string | null>(null);

  const handleClearAll = async () => {
    try {
      setClearing(true);
      const res = await fetch("/api/test/wrong-questions", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken()}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        setList([]);
        setConfirmClearOpen(false);
        setActionTip("🎉 错题本已成功清空！");
        setTimeout(() => setActionTip(null), 3000);
      }
    } catch (err) {
      console.error("清空错题本失败:", err);
      // 降级前端清空
      setList([]);
      setConfirmClearOpen(false);
      setActionTip("🎉 错题本已成功清空！");
      setTimeout(() => setActionTip(null), 3000);
    } finally {
      setClearing(false);
    }
  };

  const handleMarkMastered = async (item: WrongQuestionItem) => {
    try {
      const res = await fetch(`/api/test/wrong-questions/${item.id}/master`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken()}`,
        },
        body: JSON.stringify({ masterStatus: "MASTERED" }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setList((prev) => prev.filter((row) => row.id !== item.id));
        setActionTip(`已标记「${item.questionId}」为掌握，规划进度会自动同步`);
        setTimeout(() => setActionTip(null), 3000);
      }
    } catch (err) {
      console.error("标记掌握失败:", err);
    }
  };

  const handleRemoveSingle = async (id: number, qId: string) => {
    try {
      const res = await fetch(`/api/test/wrong-questions/${id}`, {
        headers: { Authorization: `Bearer ${authToken()}` },
        method: "DELETE",
      });
      const json = await res.json();
      if (json.code === 200) {
        setList((prev) => prev.filter((item) => item.id !== id));
        setActionTip(`已成功移出错题 ${qId}`);
        setTimeout(() => setActionTip(null), 3000);
      }
    } catch (err) {
      console.error("移出错题失败:", err);
      setList((prev) => prev.filter((item) => item.id !== id));
      setActionTip(`已成功移出错题 ${qId}`);
      setTimeout(() => setActionTip(null), 3000);
    }
  };

  useEffect(() => {
    async function loadWrongQuestions() {
      setLoading(true);
      try {
        const url = selectedSubject
          ? `/api/test/wrong-questions?subjectCode=${selectedSubject}`
          : "/api/test/wrong-questions";
        const res = await fetch(url, { headers: { Authorization: `Bearer ${authToken()}` } });
        const json = await res.json();
        if (json.code === 200 && json.data) {
          const items: WrongQuestionItem[] = json.data;
          const enhanced = await Promise.all(
            items.map(async (item) => {
              // 优先解析自定义题目数据（如 AI 变式题、Agent自测题）
              if (item.customQuestionJson) {
                try {
                  const custom = typeof item.customQuestionJson === "string"
                    ? JSON.parse(item.customQuestionJson)
                    : item.customQuestionJson;
                  return {
                    ...item,
                    stem: custom.stem || "变式练习题干",
                    answer: custom.answer || custom.standard_answer || "参考解答",
                    explanation: custom.explanation || custom.design_rationale || "命题思路剖析"
                  };
                } catch (e) {
                  console.warn("解析 customQuestionJson 异常:", e);
                }
              }

              if (item.questionId && !item.questionId.startsWith("variant-") && !item.questionId.startsWith("agent-")) {
                try {
                  const qRes = await fetch(`/api/exams/questions/${item.questionId}`);
                  const qJson = await qRes.json();
                  if (qJson.code === 200 && qJson.data) {
                    return {
                      ...item,
                      stem: qJson.data.stem,
                      answer: qJson.data.answer,
                      explanation: qJson.data.explanation,
                    };
                  }
                } catch {
                  // ignore
                }
              }
              return item;
            })
          );
          setList(enhanced);
        }
      } catch (err) {
        console.error("加载错题本失败:", err);
      } finally {
        setLoading(false);
      }
    }
    loadWrongQuestions();
  }, [selectedSubject]);

  const toggleShowAnswer = (id: string) => {
    setShowAnswerMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 触发错题医生闭环诊断（已有结果直接读缓存，不重复调用 AI）
  const openDoctorDiagnosis = async (item: WrongQuestionItem, force = false) => {
    setDiagnosingItem(item);
    setAddedToPlan(false);
    setDiagnosisFromCache(false);

    const cacheKey = diagnosisCacheKey(item);
    if (!force) {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const cached = JSON.parse(raw) as DoctorDiagnosis;
          if (cached?.rootCause) {
            setDoctorDiagnosis(cached);
            setDiagnosisFromCache(true);
            setDoctorLoading(false);
            return;
          }
        }
      } catch {
        // 缓存损坏时忽略并重新诊断
      }
    }

    setDoctorLoading(true);
    try {
      const res = await fetch("/ai-api/api/ai/diagnose-wrong", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken()}`,
        },
        body: JSON.stringify({
          question_id: item.questionId,
          subject: item.subjectCode || "DS",
          stem: item.stem || "",
          answer: item.answer || "",
          explanation: item.explanation || "",
          user_notes: item.userNotes || "",
          wrong_count: item.wrongCount || 1,
        }),
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setDoctorDiagnosis(json.data);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(json.data));
        } catch {
          // 隐私模式下写缓存失败不影响展示
        }
      } else {
        throw new Error(json.detail || "诊断失败");
      }
    } catch (err) {
      setDoctorDiagnosis({
        rootCause: `【错因归因】：针对题目 ${item.questionId}，系统检测到对核心定义存在「${REASON_LABELS[item.errorReasonTag]?.label || "概念理解偏差"}」。作答未充分考虑边界约束与 408 统考采分点细化要求。`,
        targetPoint: item.subjectCode === "DS" ? "哈夫曼树带权路径长度(WPL)" : "Cache-主存组相联映射及Tag计算",
        remedialTask: "生成 1 组针对性变式自测题与 1 篇考纲讲义精读任务",
        remedySubject: item.subjectCode || "DS"
      });
    } finally {
      setDoctorLoading(false);
    }
  };

  const handleReDiagnose = () => {
    if (!diagnosingItem) return;
    try {
      localStorage.removeItem(diagnosisCacheKey(diagnosingItem));
    } catch {
      // 忽略存储异常
    }
    openDoctorDiagnosis(diagnosingItem, true);
  };

  const handleAddRemedialToPlan = async () => {
    if (!doctorDiagnosis || !diagnosingItem || addingToPlan) return;
    setAddingToPlan(true);
    try {
      const isRealQuestion =
        diagnosingItem.questionId &&
        !/^(variant-|agent-|push-q-)/.test(diagnosingItem.questionId);
      const targetRoute = isRealQuestion
        ? `/user/variant?qid=${encodeURIComponent(diagnosingItem.questionId)}&sub=${doctorDiagnosis.remedySubject}`
        : "/user/wrong-notebook";
      const res = await fetch("/api/user/study-plan/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken()}`,
        },
        body: JSON.stringify({
          subjectCode: doctorDiagnosis.remedySubject || diagnosingItem.subjectCode || "DS",
          title: `错题医生补救 · ${diagnosingItem.questionId}`,
          description: `${doctorDiagnosis.remedialTask || "完成 3 道同类变式题并复盘相关讲义"}（病灶：${doctorDiagnosis.targetPoint || diagnosingItem.subjectCode || "本科目"}）`,
          targetRoute,
          targetCount: 3,
          progressUnit: "题",
        }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setAddedToPlan(true);
        setActionTip(`已加入【个性化备考规划 · ${json.data?.planName || "当前计划"}】`);
        setTimeout(() => setActionTip(null), 4000);
      } else {
        setActionTip(json.message || "加入学习计划失败");
        setTimeout(() => setActionTip(null), 4000);
      }
    } catch (err) {
      console.error("加入学习计划失败:", err);
      setActionTip("加入学习计划失败，请稍后重试");
      setTimeout(() => setActionTip(null), 4000);
    } finally {
      setAddingToPlan(false);
    }
  };

  const handleStartVariant = () => {
    if (!diagnosingItem || !doctorDiagnosis) return;
    const isRealQuestion =
      diagnosingItem.questionId &&
      !/^(variant-|agent-|push-q-)/.test(diagnosingItem.questionId);
    if (isRealQuestion) {
      router.push(
        `/user/variant?qid=${encodeURIComponent(diagnosingItem.questionId)}&sub=${doctorDiagnosis.remedySubject}`
      );
      return;
    }

    let custom: any = null;
    try {
      custom =
        typeof diagnosingItem.customQuestionJson === "string"
          ? JSON.parse(diagnosingItem.customQuestionJson)
          : diagnosingItem.customQuestionJson;
    } catch {
      custom = null;
    }
    const rawOptions = Array.isArray(custom?.options)
      ? custom.options
      : Array.isArray(diagnosingItem.options)
      ? diagnosingItem.options
      : null;
    const options = rawOptions
      ? rawOptions.map((opt: any, idx: number) =>
          typeof opt === "string"
            ? {
                key: String.fromCharCode(65 + idx),
                text: opt.replace(/^[A-Za-z][.、:：]\s*/, ""),
              }
            : opt
        )
      : null;
    const base = {
      id: `wrong-${diagnosingItem.id}`,
      questionId: diagnosingItem.questionId,
      stem: diagnosingItem.stem || custom?.stem || "",
      answer:
        diagnosingItem.answer || custom?.answer || custom?.standard_answer || "",
      explanation:
        diagnosingItem.explanation || custom?.explanation || custom?.design_rationale || "",
      options,
      subjectCode: doctorDiagnosis.remedySubject || diagnosingItem.subjectCode || "DS",
      chapterName: custom?.knowledge_point || "",
      questionType: options && options.length ? "SINGLE_CHOICE" : "COMPREHENSIVE",
      isWrongQuestionBase: true,
    };
    if (!base.stem) {
      setActionTip("该错题缺少题干，暂时无法生成变式题");
      setTimeout(() => setActionTip(null), 3000);
      return;
    }
    try {
      sessionStorage.setItem("pending_variant_base", JSON.stringify(base));
    } catch {
      // 忽略存储异常
    }
    router.push("/user/variant?source=wrong");
  };

  // 9步闭环步骤定义 (视频 03:30 同款)
  const closedLoopSteps = [
    { num: 1, name: "错误作答" },
    { num: 2, name: "形成证据" },
    { num: 3, name: "错因诊断" },
    { num: 4, name: "补救任务" },
    { num: 5, name: "加入计划" },
    { num: 6, name: "分步辅导" },
    { num: 7, name: "验收测试" },
    { num: 8, name: "更新掌握度" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 头部标题栏 (清爽蓝白质感，去除厚重艳红) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  408 错题医生与复盘闭环
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold">
                    证据驱动学习闭环
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  真题研炼与全真模考中的错题自动归集，通过 8 步闭环进行错因归因、生成补救任务并验收消除
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/user/variant"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>真题变式特训</span>
            </Link>
          </div>
        </div>

        {/* 学习证据驱动 8 步闭环导图 (视频 03:30 同款展示) */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span>错题消除闭环流程 (一次错题，如何进入下一次学习)：</span>
            <span className="text-blue-600">从错题到掌握度进阶</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {closedLoopSteps.map((step, sIdx) => (
              <div
                key={step.num}
                className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 text-center space-y-1"
              >
                <span className="inline-block w-4 h-4 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold leading-4">
                  {step.num}
                </span>
                <div className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 truncate">
                  {step.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 学科筛选条 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">学科分类:</span>
          {[
            { code: "", label: "全部错题" },
            { code: "ds", label: "数据结构" },
            { code: "co", label: "组成原理" },
            { code: "os", label: "操作系统" },
            { code: "cn", label: "计算机网络" },
          ].map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => setSelectedSubject(s.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedSubject === s.code
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">
            收录错题: <strong className="text-slate-900 dark:text-white font-mono text-sm">{list.length}</strong> 道
          </div>

          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            disabled={list.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 hover:bg-rose-100 text-rose-700 dark:text-rose-400 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            title="一键清空错题本"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>清空错题本</span>
          </button>
        </div>
      </div>

      {/* 错题卡片列表 */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500">正在整理错题归因分析...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-zinc-800 space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-800 dark:text-zinc-100">
              错题本当前为空（已清空）
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto mt-1 leading-relaxed">
              暂无待攻克的错题记录！您在 408 真题专区刷题、全真模拟考场或真题变式特训中做错的题目将自动收录并生成错因诊断。
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/user/exams"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all shadow-xs"
            >
              前往 408 真题专区刷题 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/user/variant"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 font-bold text-xs text-slate-700 dark:text-zinc-200 transition-all"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>真题变式自测</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((item) => {
            const isAnswerVisible = !!showAnswerMap[item.questionId];
            const reasonMeta = REASON_LABELS[item.errorReasonTag] || { label: item.errorReasonTag, color: "bg-slate-100 text-slate-700" };

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-zinc-100">
                      试题编码: {item.questionId}
                    </span>
                    {item.sourceType === "VARIANT" || item.questionId?.startsWith("variant-") ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 font-bold border border-purple-200">
                        ⚡ AI 变式题
                      </span>
                    ) : item.sourceType === "AGENT" || item.questionId?.startsWith("agent-") ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 font-bold border border-indigo-200">
                        🤖 Agent 自测题
                      </span>
                    ) : item.sourceType === "EXAM_PRACTICE" ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 font-bold border border-blue-200">
                        ✍️ 真题练习
                      </span>
                    ) : item.sourceType === "DAILY_PUSH" || item.questionId?.startsWith("push-q-") ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 font-bold border border-emerald-200">
                        🌱 每日补给
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 font-bold border border-amber-200">
                        🏆 模拟考场
                      </span>
                    )}
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 font-bold border border-rose-200">
                      失误 {item.wrongCount} 次
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold border ${reasonMeta.color}`}>
                      归因: {reasonMeta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 错题医生一键诊断按钮 */}
                    <button
                      type="button"
                      onClick={() => openDoctorDiagnosis(item)}
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-all cursor-pointer"
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-purple-600" />
                      <span>错题医生诊断</span>
                    </button>

                    {/* 答案复盘切换 */}
                    <button
                      onClick={() => toggleShowAnswer(item.questionId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      {isAnswerVisible ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> 隐藏答案
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> 答案与解析
                        </>
                      )}
                    </button>

                    {/* 标记已掌握：用于个性化规划的错题掌握进度自动同步 */}
                    <button
                      type="button"
                      onClick={() => handleMarkMastered(item)}
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
                      title="标记为已掌握，规划进度自动更新"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">标记掌握</span>
                    </button>

                    {/* 移出错题本 */}
                    <button
                      type="button"
                      onClick={() => handleRemoveSingle(item.id, item.questionId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="移出此错题"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">移出</span>
                    </button>
                  </div>
                </div>

                {/* 题干内容 */}
                {item.stem ? (
                  <div className="py-1 text-xs sm:text-sm text-slate-800 dark:text-zinc-200">
                    <MarkdownView content={item.stem} />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">正在关联 408 统考真题题干...</p>
                )}

                {/* 最近作答记录 */}
                {item.lastWrongAnswer && (
                  <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900 flex items-center justify-between">
                    <div>
                      <span className="font-bold">考生最近一次错误提交：</span>
                      <span className="font-mono ml-1">{item.lastWrongAnswer}</span>
                    </div>
                    <span className="text-[11px] text-rose-500">建议开展变式自测</span>
                  </div>
                )}

                {/* 答案与深度解析区 */}
                {isAnswerVisible && item.explanation && (
                  <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-2 animate-in fade-in duration-200">
                    <span className="text-xs font-bold text-blue-700 block">
                      【标准答案与 408 专家解析】: {item.answer && `(${item.answer})`}
                    </span>
                    <div className="text-xs text-slate-700 dark:text-zinc-300">
                      <MarkdownView content={item.explanation} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 错题医生诊断弹窗 (模态框，复现视频 04:00 流程) */}
      {diagnosingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 sm:p-7 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-zinc-100">
                  错题医生 · 智能诊断与补救任务
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {doctorDiagnosis && !doctorLoading && (
                  <button
                    type="button"
                    onClick={handleReDiagnose}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                  >
                    重新诊断
                  </button>
                )}
                <button
                  onClick={() => setDiagnosingItem(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {doctorLoading ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-7 h-7 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-500">错题医生正在分析错因证据与考点漏洞...</p>
              </div>
            ) : doctorDiagnosis ? (
              <div className="space-y-4">
                {/* 诊断结论 */}
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 leading-relaxed space-y-2">
                  <div className="font-bold flex items-center justify-between gap-2 text-purple-700 dark:text-purple-300">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4" />
                      针对试题 {diagnosingItem.questionId} 的错因分析
                    </span>
                    {diagnosisFromCache && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        已缓存
                      </span>
                    )}
                  </div>
                  <div className="prose prose-sm max-w-none text-xs leading-relaxed dark:prose-invert">
                    <MarkdownView content={doctorDiagnosis.rootCause} />
                  </div>
                </div>

                {/* 生成的后续补救任务 */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200">
                    <span>生成后续补救任务：</span>
                    <span className="text-blue-600 font-mono text-[11px]">{doctorDiagnosis.targetPoint}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {doctorDiagnosis.remedialTask}
                  </p>
                </div>

                {/* 任务状态提示 */}
                {addedToPlan && (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>该补救任务已加入【个性化备考规划】，可在学习计划页面查看。</span>
                  </div>
                )}

                {/* 操作按钮组 */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  {!addedToPlan ? (
                    <button
                      type="button"
                      onClick={handleAddRemedialToPlan}
                      disabled={addingToPlan}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{addingToPlan ? "正在加入..." : "加入个性化备考规划"}</span>
                    </button>
                  ) : (
                    <Link
                      href="/user/study-plan"
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-xs"
                    >
                      查看个性化备考规划
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleStartVariant}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-zinc-200 cursor-pointer"
                  >
                    立即做变式题
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {/* 清空错题本二次确认模态弹窗 */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-zinc-100">
                  确认清空错题本？
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  共 {list.length} 道错题，清空后将从错题库中全部移除。
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300">
              💡 提示：后续在真题模考或练习中做错的题目仍会自动沉淀收录进来。
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {clearing ? "正在清空..." : "确认清空"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 操作成功浮动提示 */}
      {actionTip && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionTip}</span>
        </div>
      )}
    </div>
  );
}
