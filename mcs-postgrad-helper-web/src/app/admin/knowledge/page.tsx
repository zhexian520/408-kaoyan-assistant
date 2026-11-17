"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  BookOpen,
  Upload,
  Trash2,
  CheckCircle2,
  Search,
  Layers,
  Database,
  Globe2,
  FileText,
  Sparkles,
  Plus,
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

interface AdminDoc {
  id: number;
  title: string;
  fileType: string;
  fileSize: number;
  subjectCode: string;
  parseStatus: string;
  chunkCount: number;
  isPublic: number;
  createdAt: string;
}

const SUBJECT_LABELS: Record<string, string> = {
  DS: "数据结构",
  CO: "组成原理",
  OS: "操作系统",
  NET: "计算机网络",
  CN: "计算机网络",
};

const SUBJECT_TONES: Record<string, "sky" | "blue" | "emerald" | "amber"> = {
  DS: "sky",
  CO: "blue",
  OS: "emerald",
  NET: "amber",
  CN: "amber",
};

export default function AdminKnowledgePage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("DS");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/kb/documents?isPublic=1");
      const json = await res.json();
      if (json.code === 200) {
        setDocs(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("确认下架并删除该公共知识库资料？")) return;
    try {
      await fetch(`/api/kb/documents/${id}`, { method: "DELETE" });
      fetchDocs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return alert("请选择要上传的 PDF / Word / TXT / Markdown 文件");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle.trim() || uploadFile.name);
      formData.append("subject_code", uploadSubject);
      formData.append("is_public", "1");
      formData.append("user_id", String(user?.userId || 1));
      const res = await fetch("/ai-api/api/ai/kb/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.code === 200) {
        setShowUploadModal(false);
        setUploadTitle("");
        setUploadFile(null);
        fetchDocs();
      } else {
        alert(json.message || json.detail || "上传失败");
      }
    } catch (err) {
      console.error(err);
      alert("上传失败，请确认 Python AI 服务（8000）已启动");
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = docs.filter((doc) => {
    const matchesKeyword =
      !searchTerm.trim() ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.subjectCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject =
      subjectFilter === "ALL" ||
      doc.subjectCode.toUpperCase() === subjectFilter ||
      (subjectFilter === "NET" && doc.subjectCode.toUpperCase() === "CN");
    return matchesKeyword && matchesSubject;
  });

  const totalChunks = docs.reduce((sum, doc) => sum + (doc.chunkCount || 0), 0);
  const totalSize = docs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
  const subjectCount = new Set(docs.map((doc) => doc.subjectCode.toUpperCase())).size;

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow="知识库维护"
        title="公共知识库资料维护"
        description="统一维护全站学员可见的 408 统考权威教材、考纲讲义及核心算法切片资料，支持上传、自动切块与公共库上下架。"
        icon={BookOpen}
        badge={<AdminBadge tone="sky" dot>公共资料库</AdminBadge>}
        actions={
          <>
            <div className="admin-search w-full sm:w-64">
              <Search className="h-3.5 w-3.5" />
              <input
                type="text"
                placeholder="搜索资料名称或学科..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={() => setShowUploadModal(true)} className="admin-btn admin-btn-primary">
              <Upload className="h-4 w-4" />
              上传公共资料
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="公共资料总数"
          value={docs.length}
          suffix="份"
          icon={FileText}
          tone="sky"
          hint="全站学员可见的权威资料"
          badge={<AdminBadge tone="sky">已上架</AdminBadge>}
        />
        <AdminStatCard
          label="知识切片总量"
          value={totalChunks}
          suffix="块"
          icon={Layers}
          tone="blue"
          hint="用于 RAG 混合检索与溯源"
          badge={<AdminBadge tone="blue">可检索</AdminBadge>}
        />
        <AdminStatCard
          label="覆盖学科"
          value={subjectCount || 4}
          suffix="科"
          icon={Database}
          tone="emerald"
          hint="数据结构 / 组成原理 / OS / 网络"
          badge={<AdminBadge tone="emerald">四科覆盖</AdminBadge>}
        />
        <AdminStatCard
          label="资料总体积"
          value={(totalSize / 1024 / 1024).toFixed(1)}
          suffix="MB"
          icon={Globe2}
          tone="amber"
          hint="PDF / 讲义 / 教材切片"
          badge={<AdminBadge tone="amber">公共可见</AdminBadge>}
        />
      </div>

      <AdminPanel
        title="公共知识库资料列表"
        subtitle={`共 ${filteredDocs.length} 份资料 · 按学科筛选查看`}
        icon={BookOpen}
        action={
          <div className="flex items-center gap-2">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="admin-select admin-select-sm w-auto text-[11px]"
            >
              <option value="ALL">全部学科</option>
              <option value="DS">数据结构</option>
              <option value="CO">组成原理</option>
              <option value="OS">操作系统</option>
              <option value="NET">计算机网络</option>
            </select>
            <AdminBadge tone="emerald" dot>
              解析正常
            </AdminBadge>
          </div>
        }
        noPadding
      >
        {loading ? (
          <AdminSpinner label="正在装载公共知识库列表..." />
        ) : filteredDocs.length === 0 ? (
          <AdminEmptyState
            title="暂无匹配的公共资料"
            description="可以调整学科筛选，或上传新的教材 / 讲义资料。"
            icon={BookOpen}
            action={
              <button onClick={() => setShowUploadModal(true)} className="admin-btn admin-btn-primary admin-btn-sm">
                <Plus className="h-3.5 w-3.5" />
                上传第一份资料
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[760px]">
              <thead>
                <tr>
                  <th>资料 ID</th>
                  <th>归属学科</th>
                  <th>资料名称</th>
                  <th>大小</th>
                  <th>切片数量</th>
                  <th>解析状态</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => {
                  const subjectKey = doc.subjectCode.toUpperCase();
                  return (
                    <tr key={doc.id}>
                      <td>
                        <span className="font-mono text-[10px] font-bold" style={{ color: "var(--a-faint)" }}>
                          #{doc.id}
                        </span>
                      </td>
                      <td>
                        <AdminBadge tone={SUBJECT_TONES[subjectKey] || "slate"}>
                          {SUBJECT_LABELS[subjectKey] || subjectKey}
                        </AdminBadge>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-800/15 bg-sky-800/5 text-sky-800">
                            <FileText className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[280px] truncate text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                              {doc.title}
                            </p>
                            <p className="text-[10px] uppercase" style={{ color: "var(--a-faint)" }}>
                              {doc.fileType || "PDF"} · 公共资料
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-[11px]" style={{ color: "var(--a-muted)" }}>
                          {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-[12px] font-black" style={{ color: "var(--a-text)" }}>
                          {doc.chunkCount}
                        </span>
                        <span className="ml-1 text-[10px]" style={{ color: "var(--a-faint)" }}>
                          块
                        </span>
                      </td>
                      <td>
                        <AdminBadge tone="emerald" dot>
                          已上架入库
                        </AdminBadge>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="admin-btn admin-btn-danger admin-btn-sm inline-flex"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          下架删除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            title: "RAG 检索",
            value: "混合检索已就绪",
            desc: "教材原文切片注入上下文，支持出处溯源",
            icon: Sparkles,
            tone: "text-sky-800",
          },
          {
            title: "自动切片",
            value: "OCR + 语义分块",
            desc: "上传后自动解析并生成可检索知识块",
            icon: Layers,
            tone: "text-blue-500",
          },
          {
            title: "内容安全",
            value: "公共库审核",
            desc: "仅管理员可上传、下架与维护公共资料",
            icon: CheckCircle2,
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

      <AdminModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="上传公共知识库教材 / 讲义"
        subtitle="上传后将自动进行 OCR 解析与语义切片"
        icon={Upload}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="admin-btn admin-btn-ghost"
            >
              取消
            </button>
            <button
              type="submit"
              form="kb-upload-form"
              disabled={uploading}
              className="admin-btn admin-btn-primary disabled:opacity-50"
            >
              {uploading ? "OCR 智能切片入库中..." : "确认发布至公共库"}
            </button>
          </>
        }
      >
        <form id="kb-upload-form" onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
              资料标题 *
            </label>
            <input
              type="text"
              placeholder="例如：王道 408 数据结构考研复习指导精要.pdf"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="admin-input"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
              资料文件 *
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.markdown"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="admin-input cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-sky-900 file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-white"
            />
            {uploadFile && (
              <p className="text-[10px]" style={{ color: "var(--a-faint)" }}>
                已选择：{uploadFile.name}（{(uploadFile.size / 1024 / 1024).toFixed(2)} MB）
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
              归属科目 *
            </label>
            <select
              value={uploadSubject}
              onChange={(e) => setUploadSubject(e.target.value)}
              className="admin-select"
            >
              <option value="DS">数据结构 (DS)</option>
              <option value="CO">计算机组成原理 (CO)</option>
              <option value="OS">操作系统 (OS)</option>
              <option value="NET">计算机网络 (NET)</option>
            </select>
          </div>
          <div className="rounded-xl border border-sky-800/15 bg-sky-800/5 px-3 py-2.5 text-[10px] leading-relaxed" style={{ color: "var(--a-muted)" }}>
            资料发布后将进入公共知识库，供全站学员在智能问答与 RAG 检索中使用。
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
