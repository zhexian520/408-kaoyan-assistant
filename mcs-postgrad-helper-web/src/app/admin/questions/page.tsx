"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AdminExamPaperModal from "@/components/AdminExamPaperModal";
import {
  BookMarked,
  Calendar,
  Clock,
  Search,
  Eye,
  FileText,
  Layers,
  Plus,
  Edit3,
  Trash2,
  Save,
  Filter,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
} from "lucide-react";
import {
  AdminBadge,
  AdminEmptyState,
  AdminModal,
  AdminPageHeader,
  AdminPanel,
  AdminSpinner,
  AdminStatCard,
} from "@/components/admin/AdminUI";

interface AdminPaper {
  id: number;
  year: number;
  title: string;
  questionCount: number;
  totalScore: number;
  durationMinutes: number;
  status: number;
  paperType?: string;
}

interface AdminQuestion {
  id: string;
  paperId: number | null;
  year: number;
  questionNumber: number;
  score: number;
  questionType: string;
  subjectCode: string;
  chapterName: string;
  stem: string;
  optionsJson: string;
  answer: string;
  difficulty: number;
  tagsJson: string;
  explanation: string;
  examPointAnalysis: string;
}

const SUBJECT_LABELS: Record<string, string> = {
  DS: "数据结构",
  CO: "组成原理",
  OS: "操作系统",
  CN: "计算机网络",
  NET: "计算机网络",
};

const EMPTY_FORM = {
  id: "",
  paperId: "",
  year: 2027,
  questionNumber: 1,
  score: 2,
  questionType: "choice",
  subjectCode: "DS",
  chapterName: "",
  stem: "",
  answer: "",
  difficulty: 3,
  explanation: "",
  examPointAnalysis: "",
};

function optionsToText(json?: string) {
  if (!json) return "";
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item: any, index: number) => `${item.key || String.fromCharCode(65 + index)}. ${item.text || ""}`)
        .join("\n");
    }
  } catch {
    // ignore
  }
  return json;
}

function textToOptions(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^([A-Da-d])[.、:：\s]+(.*)$/);
      return {
        key: match ? match[1].toUpperCase() : String.fromCharCode(65 + index),
        text: match ? match[2].trim() : line,
      };
    });
}

function tagsToText(json?: string) {
  if (!json) return "";
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.join("，") : json;
  } catch {
    return json;
  }
}

export default function AdminQuestionsPage() {
  const { user } = useAuth();
  const token = () => user?.token || (typeof window !== "undefined" ? localStorage.getItem("408_auth_token") || "" : "");

  const [papers, setPapers] = useState<AdminPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedPaperTitle, setSelectedPaperTitle] = useState("");

  // 题目 CRUD 状态
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [questionTotal, setQuestionTotal] = useState(0);
  const [questionPage, setQuestionPage] = useState(1);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionFilters, setQuestionFilters] = useState({
    year: "",
    subjectCode: "",
    questionType: "",
    keyword: "",
  });
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({ ...EMPTY_FORM });
  const [optionsText, setOptionsText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [savingQuestion, setSavingQuestion] = useState(false);

  const pageSize = 8;

  const fetchPapers = async () => {
    try {
      const res = await fetch("/api/admin/questions/papers", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (json.code === 200) setPapers(json.data || []);
    } catch (err) {
      console.error("Failed to load papers:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (page = questionPage) => {
    setQuestionLoading(true);
    try {
      const params = new URLSearchParams({
        pageNum: String(page),
        pageSize: String(pageSize),
      });
      if (questionFilters.year) params.append("year", questionFilters.year);
      if (questionFilters.subjectCode) params.append("subjectCode", questionFilters.subjectCode);
      if (questionFilters.questionType) params.append("questionType", questionFilters.questionType);
      if (questionFilters.keyword.trim()) params.append("keyword", questionFilters.keyword.trim());

      const res = await fetch(`/api/admin/questions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setQuestions(json.data.list || []);
        setQuestionTotal(json.data.total || 0);
      }
    } catch (err) {
      console.error("加载题目列表失败:", err);
    } finally {
      setQuestionLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, [user?.token]);

  useEffect(() => {
    fetchQuestions(questionPage);
  }, [questionPage]);

  const handleOpenPreview = (paper: AdminPaper) => {
    setSelectedYear(paper.year);
    setSelectedPaperTitle(paper.title);
    setModalOpen(true);
  };

  const openCreateQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({
      ...EMPTY_FORM,
      paperId: papers[0]?.id ? String(papers[0].id) : "",
      year: papers[0]?.year || 2027,
    });
    setOptionsText("A. \nB. \nC. \nD. ");
    setTagsText("");
    setShowQuestionModal(true);
  };

  const openEditQuestion = (question: AdminQuestion) => {
    setEditingQuestion(question);
    setQuestionForm({
      id: question.id,
      paperId: question.paperId ? String(question.paperId) : "",
      year: question.year,
      questionNumber: question.questionNumber,
      score: question.score,
      questionType: question.questionType,
      subjectCode: question.subjectCode?.toUpperCase() === "CN" ? "CN" : (question.subjectCode || "DS").toUpperCase(),
      chapterName: question.chapterName || "",
      stem: question.stem || "",
      answer: question.answer || "",
      difficulty: question.difficulty || 3,
      explanation: question.explanation || "",
      examPointAnalysis: question.examPointAnalysis || "",
    });
    setOptionsText(optionsToText(question.optionsJson));
    setTagsText(tagsToText(question.tagsJson));
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!questionForm.stem.trim()) return alert("题干不能为空");
    setSavingQuestion(true);
    try {
      const payload = {
        ...questionForm,
        paperId: questionForm.paperId ? Number(questionForm.paperId) : null,
        year: Number(questionForm.year),
        questionNumber: Number(questionForm.questionNumber),
        score: Number(questionForm.score),
        difficulty: Number(questionForm.difficulty),
        optionsJson: questionForm.questionType === "choice" ? JSON.stringify(textToOptions(optionsText)) : null,
        tagsJson: JSON.stringify(tagsText.split(/[,，]/).map((item) => item.trim()).filter(Boolean)),
        isVariant: 0,
      };
      const isEdit = !!editingQuestion;
      const res = await fetch(
        isEdit
          ? `/api/admin/questions/${encodeURIComponent(editingQuestion!.id)}`
          : "/api/admin/questions",
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (json.code === 200) {
        setShowQuestionModal(false);
        setEditingQuestion(null);
        await fetchQuestions(questionPage);
        await fetchPapers();
      } else {
        alert(json.message || "保存失败");
      }
    } catch (err) {
      console.error(err);
      alert("保存失败，请确认 Java 服务已启动");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (question: AdminQuestion) => {
    if (!confirm(`确认删除题目【${question.id}】吗？删除后不可恢复。`)) return;
    try {
      const res = await fetch(`/api/admin/questions/${encodeURIComponent(question.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        await fetchQuestions(questionPage);
        await fetchPapers();
      } else {
        alert(json.message || "删除失败");
      }
    } catch (err) {
      console.error(err);
      alert("删除失败，请确认 Java 服务已启动");
    }
  };

  const filteredPapers = papers.filter(
    (paper) =>
      paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.year.toString().includes(searchTerm)
  );

  const totalQuestions = papers.reduce((sum, paper) => sum + (paper.questionCount || 0), 0);
  const years = papers.map((paper) => paper.year);
  const yearRange = years.length ? `${Math.min(...years)} - ${Math.max(...years)}` : "2009 - 2026";
  const totalPages = Math.max(1, Math.ceil(questionTotal / pageSize));

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow="试卷库运维"
        title="408 全真试卷库与题目管理"
        description="支持试卷预览、题目检索、新增、编辑与删除；统考真题与 AI 练习题库统一维护。"
        icon={BookMarked}
        badge={<AdminBadge tone="sky" dot>真题 + AI 练习</AdminBadge>}
        actions={
          <>
            <div className="admin-search w-full sm:w-64">
              <Search className="h-3.5 w-3.5" />
              <input
                type="text"
                placeholder="搜索试卷年份或标题..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={openCreateQuestion} className="admin-btn admin-btn-primary">
              <FilePlus2 className="h-4 w-4" />
              新增题目
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="试卷库总量"
          value={papers.length || 18}
          suffix="套"
          icon={BookMarked}
          tone="sky"
          hint="18 套统考真题 + AI 练习题库"
          badge={<AdminBadge tone="sky">已上架</AdminBadge>}
        />
        <AdminStatCard
          label="试卷题目总量"
          value={totalQuestions || 846}
          suffix="题"
          icon={FileText}
          tone="blue"
          hint="支持在下方直接新增 / 编辑 / 删除"
          badge={<AdminBadge tone="blue">可维护</AdminBadge>}
        />
        <AdminStatCard
          label="覆盖年份"
          value={yearRange}
          icon={Calendar}
          tone="emerald"
          hint="连续 18 年真题完整覆盖"
          badge={<AdminBadge tone="emerald">无断档</AdminBadge>}
        />
        <AdminStatCard
          label="单卷考试时长"
          value="180"
          suffix="分钟"
          icon={Clock}
          tone="amber"
          hint="总分 150 分 · 全真模考标准"
          badge={<AdminBadge tone="amber">标准考场</AdminBadge>}
        />
      </div>

      {loading ? (
        <AdminSpinner label="正在获取试卷库状态..." />
      ) : (
        <AdminPanel
          title="全真试卷列表"
          subtitle={`共 ${filteredPapers.length} 套试卷 · 含 18 套统考真题与 AI 智能练习题库`}
          icon={Layers}
          action={<AdminBadge tone="emerald" dot>题库健康</AdminBadge>}
          noPadding
        >
          {filteredPapers.length === 0 ? (
            <AdminEmptyState title="没有找到匹配的试卷" description="请尝试更换年份或试卷标题关键词。" icon={Search} />
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table min-w-[760px]">
                <thead>
                  <tr>
                    <th>年份</th>
                    <th>试卷全称</th>
                    <th>总题量</th>
                    <th>试卷总分</th>
                    <th>考试时长</th>
                    <th>状态</th>
                    <th className="text-right">真题预览</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPapers.map((paper) => (
                    <tr key={paper.id}>
                      <td>
                        <span className="inline-flex h-8 min-w-[52px] items-center justify-center rounded-xl border border-sky-800/20 bg-sky-800/10 px-2 font-mono text-[11px] font-black text-sky-900 dark:text-sky-300">
                          {paper.year}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(paper)}
                          className="group flex items-center gap-1.5 text-left text-[11px] font-extrabold transition-colors hover:text-sky-900 dark:hover:text-sky-300"
                          style={{ color: "var(--a-text)" }}
                        >
                          <span>{paper.title}</span>
                          <Eye className="h-3.5 w-3.5 text-sky-600 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                        <p className="mt-0.5 text-[10px]" style={{ color: "var(--a-faint)" }}>
                          {paper.paperType === "AI_CUSTOM" ? "AI 智能练习题库" : "408 计算机学科专业基础综合"}
                        </p>
                      </td>
                      <td>
                        <span className="font-mono text-[12px] font-black" style={{ color: "var(--a-text)" }}>
                          {paper.questionCount}
                        </span>
                        <span className="ml-1 text-[10px]" style={{ color: "var(--a-faint)" }}>
                          题
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-[11px] font-bold" style={{ color: "var(--a-muted)" }}>
                          {paper.totalScore} 分
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-[11px]" style={{ color: "var(--a-muted)" }}>
                          {paper.durationMinutes} 分钟
                        </span>
                      </td>
                      <td>
                        <AdminBadge tone="emerald" dot>已上架</AdminBadge>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(paper)}
                          className="admin-btn admin-btn-ghost admin-btn-sm inline-flex"
                        >
                          <Eye className="h-3.5 w-3.5 text-sky-600" />
                          查看真题
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      )}

      {/* 题目管理 */}
      <AdminPanel
        title="题目管理"
        subtitle="支持按年份、学科、题型和关键词检索，新增、编辑、删除题目"
        icon={Filter}
        action={
          <button onClick={openCreateQuestion} className="admin-btn admin-btn-primary admin-btn-sm">
            <Plus className="h-3.5 w-3.5" />
            新增题目
          </button>
        }
        noPadding
      >
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: "var(--a-border)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              placeholder="年份"
              value={questionFilters.year}
              onChange={(e) => setQuestionFilters({ ...questionFilters, year: e.target.value })}
              className="admin-input admin-input-sm"
              style={{ width: 96 }}
            />
            <select
              value={questionFilters.subjectCode}
              onChange={(e) => setQuestionFilters({ ...questionFilters, subjectCode: e.target.value })}
              className="admin-select admin-select-sm"
              style={{ width: 140 }}
            >
              <option value="">全部学科</option>
              <option value="DS">数据结构</option>
              <option value="CO">组成原理</option>
              <option value="OS">操作系统</option>
              <option value="CN">计算机网络</option>
            </select>
            <select
              value={questionFilters.questionType}
              onChange={(e) => setQuestionFilters({ ...questionFilters, questionType: e.target.value })}
              className="admin-select admin-select-sm"
              style={{ width: 140 }}
            >
              <option value="">全部题型</option>
              <option value="choice">选择题</option>
              <option value="comprehensive">综合大题</option>
            </select>
            <div className="admin-search w-full sm:w-64">
              <Search className="h-3.5 w-3.5" />
              <input
                placeholder="搜索题干或解析..."
                value={questionFilters.keyword}
                onChange={(e) => setQuestionFilters({ ...questionFilters, keyword: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setQuestionPage(1);
                    fetchQuestions(1);
                  }
                }}
              />
            </div>
            <button
              onClick={() => {
                setQuestionPage(1);
                fetchQuestions(1);
              }}
              className="admin-btn admin-btn-ghost admin-btn-sm"
            >
              搜索
            </button>
          </div>
          <span className="text-[11px]" style={{ color: "var(--a-faint)" }}>
            共 {questionTotal} 道题 · 第 {questionPage} / {totalPages} 页
          </span>
        </div>

        {questionLoading ? (
          <AdminSpinner label="正在加载题目列表..." />
        ) : questions.length === 0 ? (
          <AdminEmptyState title="暂无题目" description="可以调整筛选条件，或点击「新增题目」创建第一道题。" icon={FileText} />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[980px]">
              <thead>
                <tr>
                  <th>题目 ID</th>
                  <th>年份</th>
                  <th>学科</th>
                  <th>题型</th>
                  <th>题干</th>
                  <th>难度</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id}>
                    <td>
                      <span className="font-mono text-[10px] font-bold" style={{ color: "var(--a-faint)" }}>
                        {question.id}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-[11px] font-bold" style={{ color: "var(--a-muted)" }}>
                        {question.year}
                      </span>
                    </td>
                    <td>
                      <AdminBadge tone={question.subjectCode?.toUpperCase() === "DS" ? "sky" : question.subjectCode?.toUpperCase() === "CO" ? "blue" : question.subjectCode?.toUpperCase() === "OS" ? "emerald" : "amber"}>
                        {SUBJECT_LABELS[question.subjectCode?.toUpperCase()] || question.subjectCode}
                      </AdminBadge>
                    </td>
                    <td>
                      <span className="text-[11px]" style={{ color: "var(--a-muted)" }}>
                        {question.questionType === "choice" ? "选择题" : "综合大题"}
                      </span>
                    </td>
                    <td>
                      <p className="max-w-[360px] truncate text-[11px] font-semibold" style={{ color: "var(--a-text)" }}>
                        {question.stem}
                      </p>
                      <p className="mt-0.5 text-[10px]" style={{ color: "var(--a-faint)" }}>
                        {question.chapterName || "未标注章节"}
                      </p>
                    </td>
                    <td>
                      <span className="font-mono text-[11px]" style={{ color: "var(--a-muted)" }}>
                        {question.difficulty} / 5
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEditQuestion(question)} className="admin-btn admin-btn-ghost admin-btn-sm">
                          <Edit3 className="h-3.5 w-3.5" />
                          编辑
                        </button>
                        <button onClick={() => handleDeleteQuestion(question)} className="admin-btn admin-btn-danger admin-btn-sm">
                          <Trash2 className="h-3.5 w-3.5" />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-[11px]" style={{ borderColor: "var(--a-border)", color: "var(--a-muted)" }}>
            <span>共 {questionTotal} 道题</span>
            <div className="flex items-center gap-2">
              <button
                disabled={questionPage <= 1}
                onClick={() => {
                  const next = Math.max(1, questionPage - 1);
                  setQuestionPage(next);
                  fetchQuestions(next);
                }}
                className="admin-btn admin-btn-ghost admin-btn-sm disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                上一页
              </button>
              <span className="font-mono">{questionPage} / {totalPages}</span>
              <button
                disabled={questionPage >= totalPages}
                onClick={() => {
                  const next = Math.min(totalPages, questionPage + 1);
                  setQuestionPage(next);
                  fetchQuestions(next);
                }}
                className="admin-btn admin-btn-ghost admin-btn-sm disabled:opacity-40"
              >
                下一页
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </AdminPanel>

      <AdminExamPaperModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        year={selectedYear}
        paperTitle={selectedPaperTitle}
      />

      {/* 新增/编辑题目弹窗 */}
      <AdminModal
        open={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        title={editingQuestion ? `编辑题目：${editingQuestion.id}` : "新增题目"}
        subtitle="题目会直接写入 MySQL，并同步更新所属试卷题量"
        icon={editingQuestion ? Edit3 : FilePlus2}
        maxWidth="max-w-3xl"
        footer={
          <>
            <button onClick={() => setShowQuestionModal(false)} className="admin-btn admin-btn-ghost">
              取消
            </button>
            <button type="submit" form="question-form" disabled={savingQuestion} className="admin-btn admin-btn-primary disabled:opacity-50">
              <Save className="h-4 w-4" />
              {savingQuestion ? "保存中..." : "保存题目"}
            </button>
          </>
        }
      >
        <form id="question-form" onSubmit={handleSaveQuestion} className="space-y-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>题目 ID</label>
              <input
                value={questionForm.id}
                onChange={(e) => setQuestionForm({ ...questionForm, id: e.target.value })}
                disabled={!!editingQuestion}
                placeholder="留空自动生成"
                className="admin-input font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>所属试卷</label>
              <select
                value={questionForm.paperId}
                onChange={(e) => setQuestionForm({ ...questionForm, paperId: e.target.value })}
                className="admin-select"
              >
                <option value="">不归属试卷</option>
                {papers.map((paper) => (
                  <option key={paper.id} value={paper.id}>
                    {paper.year} · {paper.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>年份</label>
              <input type="number" value={questionForm.year} onChange={(e) => setQuestionForm({ ...questionForm, year: Number(e.target.value) })} className="admin-input font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>题号</label>
              <input type="number" value={questionForm.questionNumber} onChange={(e) => setQuestionForm({ ...questionForm, questionNumber: Number(e.target.value) })} className="admin-input font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>学科</label>
              <select value={questionForm.subjectCode} onChange={(e) => setQuestionForm({ ...questionForm, subjectCode: e.target.value })} className="admin-select">
                <option value="DS">数据结构</option>
                <option value="CO">组成原理</option>
                <option value="OS">操作系统</option>
                <option value="CN">计算机网络</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>题型</label>
              <select value={questionForm.questionType} onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value })} className="admin-select">
                <option value="choice">选择题</option>
                <option value="comprehensive">综合大题</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>分值</label>
              <input type="number" value={questionForm.score} onChange={(e) => setQuestionForm({ ...questionForm, score: Number(e.target.value) })} className="admin-input font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>难度 1-5</label>
              <input type="number" min={1} max={5} value={questionForm.difficulty} onChange={(e) => setQuestionForm({ ...questionForm, difficulty: Number(e.target.value) })} className="admin-input font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>章节</label>
              <input value={questionForm.chapterName} onChange={(e) => setQuestionForm({ ...questionForm, chapterName: e.target.value })} placeholder="如：第2章 线性表" className="admin-input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>标签（逗号分隔）</label>
              <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="如：线性表，顺序表，插入删除" className="admin-input" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>题干 *</label>
            <textarea rows={3} value={questionForm.stem} onChange={(e) => setQuestionForm({ ...questionForm, stem: e.target.value })} className="admin-textarea font-mono" placeholder="支持 Markdown / LaTeX 公式" />
          </div>

          {questionForm.questionType === "choice" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>选项（每行一个，A. / B. / C. / D.）</label>
              <textarea rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} className="admin-textarea font-mono" />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>标准答案</label>
              <textarea rows={3} value={questionForm.answer} onChange={(e) => setQuestionForm({ ...questionForm, answer: e.target.value })} className="admin-textarea font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>解析</label>
              <textarea rows={3} value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} className="admin-textarea" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>命题意图 / 采分点分析</label>
            <textarea rows={2} value={questionForm.examPointAnalysis} onChange={(e) => setQuestionForm({ ...questionForm, examPointAnalysis: e.target.value })} className="admin-textarea" />
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
