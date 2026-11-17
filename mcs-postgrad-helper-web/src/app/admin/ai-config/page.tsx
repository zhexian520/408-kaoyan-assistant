"use client";

import React, { useEffect, useState } from "react";
import {
  Cpu,
  KeyRound,
  Globe2,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Save,
  Zap,
  ShieldCheck,
  Sliders,
  Eye,
  EyeOff,
  Terminal,
  Activity,
  Layers,
  FileCheck,
  Bot,
  Server,
  Database,
  Gauge,
} from "lucide-react";
import {
  AdminBadge,
  AdminPageHeader,
  AdminPanel,
  AdminSpinner,
  cx,
} from "@/components/admin/AdminUI";

interface AIConfigData {
  id?: number;
  provider: string;
  api_key?: string;
  has_key?: boolean;
  masked_api_key?: string;
  base_url: string;
  text_model: string;
  vl_model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  updated_at?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
  model?: string;
  reply?: string;
  error?: string;
}

const PRESETS = [
  {
    provider: "DEEPSEEK",
    name: "DeepSeek",
    sub: "深度求索",
    badge: "高性价比推荐",
    baseUrl: "https://api.deepseek.com/v1",
    textModel: "deepseek-chat",
    vlModel: "qwen-vl-max",
    note: "推理性能卓越，支持标准 OpenAI 协议格式",
    tone: "bg-[#1f3a56]",
  },
  {
    provider: "ALI_QWEN",
    name: "通义千问",
    sub: "阿里云百炼",
    badge: "原生多模态",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    textModel: "qwen-plus",
    vlModel: "qwen-vl-max",
    note: "原生支持 Qwen-VL-Max 多模态视觉图文理解与 OCR",
    tone: "bg-[#b7791f]",
  },
  {
    provider: "ZHIPU",
    name: "智谱清言",
    sub: "GLM-4",
    badge: "国产大模型",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    textModel: "glm-4-flash",
    vlModel: "glm-4v-flash",
    note: "速度快，具备完善的文本与视觉双轨 API",
    tone: "bg-[#4a6b8a]",
  },
  {
    provider: "OPENAI",
    name: "OpenAI",
    sub: "GPT-4o",
    badge: "国际标准",
    baseUrl: "https://api.openai.com/v1",
    textModel: "gpt-4o-mini",
    vlModel: "gpt-4o",
    note: "全球领先的通用多模态大模型",
    tone: "bg-[#2f7d5d]",
  },
  {
    provider: "OLLAMA",
    name: "Ollama",
    sub: "本地私有化",
    badge: "完全离线",
    baseUrl: "http://localhost:11434/v1",
    textModel: "qwen2.5:7b",
    vlModel: "llava:7b",
    note: "本地 GPU / CPU 运行，无需网络且不产生 Token 费用",
    tone: "bg-[#3f4a55]",
  },
];

function Field({
  label,
  icon: Icon,
  hint,
  children,
  className,
}: {
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("space-y-1.5", className)}>
      <label className="flex items-center justify-between gap-2 text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
        <span className="flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-sky-800" />}
          {label}
        </span>
      </label>
      {children}
      {hint && (
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--a-faint)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export default function AdminAIConfigPage() {
  const [config, setConfig] = useState<AIConfigData>({
    provider: "DEEPSEEK",
    api_key: "",
    has_key: false,
    masked_api_key: "",
    base_url: "https://api.deepseek.com/v1",
    text_model: "deepseek-chat",
    vl_model: "qwen-vl-max",
    temperature: 0.3,
    max_tokens: 2048,
    system_prompt:
      "你是一名精通全国计算机考研408专业课（数据结构、组成原理、操作系统、计算机网络）的顶尖AI导师。",
  });

  const [inputApiKey, setInputApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/ai-api/api/ai/config");
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setConfig(json.data);
        if (json.data.masked_api_key) {
          setInputApiKey(json.data.masked_api_key);
        }
      }
    } catch (err) {
      console.error("加载 AI 配置失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setConfig((prev) => ({
      ...prev,
      provider: preset.provider,
      base_url: preset.baseUrl,
      text_model: preset.textModel,
      vl_model: preset.vlModel,
    }));
    setTestResult(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccessMsg(null);
    try {
      const payload = {
        provider: config.provider,
        api_key: inputApiKey,
        base_url: config.base_url.trim(),
        text_model: config.text_model.trim(),
        vl_model: config.vl_model.trim(),
        temperature: Number(config.temperature),
        max_tokens: Number(config.max_tokens),
        system_prompt: config.system_prompt.trim(),
      };

      const res = await fetch("/ai-api/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.code === 200) {
        setSaveSuccessMsg("AI 大模型配置已成功保存并即时热重载生效！");
        setConfig(json.data);
        if (json.data.masked_api_key) {
          setInputApiKey(json.data.masked_api_key);
        }
        setTimeout(() => setSaveSuccessMsg(null), 5000);
      } else {
        alert(json.detail || "保存失败");
      }
    } catch (err: any) {
      alert(`保存失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload: any = {
        base_url: config.base_url.trim(),
        text_model: config.text_model.trim(),
      };
      if (inputApiKey && !inputApiKey.includes("****")) {
        payload.api_key = inputApiKey.trim();
      }

      const res = await fetch("/ai-api/api/ai/config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setTestResult(json.data);
      } else {
        setTestResult({ success: false, message: json.detail || "测试请求未能成功执行" });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `网络连接失败，请确认 Python 引擎服务运行正常: ${err.message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <AdminSpinner label="正在读取 AI 引擎大模型运行时状态..." />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow="AI 模型网关"
        title="AI 引擎与大模型配置"
        description="接入 408 考研真实大模型核心，支持多模态视觉原理图解析、RAG 知识库溯源问答与主观题采分点精批，配置保存后即时热重载。"
        icon={Cpu}
        badge={<AdminBadge tone="emerald" dot>实时热重载</AdminBadge>}
        actions={
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="admin-btn admin-btn-primary disabled:opacity-50"
          >
            {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {testing ? "正在测试连接..." : "一键连通性测试"}
          </button>
        }
      />

      {saveSuccessMsg && (
        <div className="admin-fade-up flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="font-bold">{saveSuccessMsg}</p>
        </div>
      )}

      {testResult && (
        <div
          className={cx(
            "admin-fade-up rounded-2xl border p-4 sm:p-5",
            testResult.success
              ? "border-emerald-500/20 bg-emerald-500/[0.08]"
              : "border-rose-500/20 bg-rose-500/[0.08]"
          )}
        >
          <div className="flex items-start gap-3">
            {testResult.success ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={cx("text-sm font-extrabold", testResult.success ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
                  {testResult.message}
                </p>
                {testResult.latency_ms !== undefined && testResult.latency_ms > 0 && (
                  <span className="rounded-full border border-current px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                    往返耗时 {testResult.latency_ms} ms
                  </span>
                )}
              </div>
              {testResult.reply && (
                <div className="rounded-xl border border-emerald-500/15 bg-[var(--a-surface-solid)] px-3 py-2.5 font-mono text-[11px] leading-relaxed" style={{ color: "var(--a-text)" }}>
                  <span className="font-bold text-emerald-600 dark:text-emerald-300">模型实时回复：</span>
                  {testResult.reply}
                </div>
              )}
              {testResult.error && (
                <div className="rounded-xl border border-rose-500/15 bg-[var(--a-surface-solid)] px-3 py-2.5 font-mono text-[11px] text-rose-600 dark:text-rose-300">
                  {testResult.error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="admin-kpi">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--a-faint)" }}>
              当前服务商
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-800/20 bg-sky-800/10 text-sky-800">
              <Bot className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-mono text-lg font-black" style={{ color: "var(--a-text)" }}>
            {config.provider || "CUSTOM"}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: "var(--a-faint)" }}>
            兼容 OpenAI 协议规范
          </p>
        </div>
        <div className="admin-kpi">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--a-faint)" }}>
              API 密钥状态
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
              <KeyRound className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-lg font-black text-emerald-600 dark:text-emerald-300">
            {config.has_key || inputApiKey ? "已配置" : "待配置"}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: "var(--a-faint)" }}>
            {config.masked_api_key || "尚未设置 API Key"}
          </p>
        </div>
        <div className="admin-kpi">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--a-faint)" }}>
              文本推理模型
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-500">
              <FileCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 truncate font-mono text-sm font-black" style={{ color: "var(--a-text)" }}>
            {config.text_model || "-"}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: "var(--a-faint)" }}>
            RAG 问答 · 主观题判分
          </p>
        </div>
        <div className="admin-kpi">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "var(--a-faint)" }}>
              多模态视觉模型
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 truncate font-mono text-sm font-black" style={{ color: "var(--a-text)" }}>
            {config.vl_model || "-"}
          </p>
          <p className="mt-1 text-[10px]" style={{ color: "var(--a-faint)" }}>
            原理图解析 · OCR 识别
          </p>
        </div>
      </div>

      <AdminPanel
        title="厂商服务商一键预设"
        subtitle="点击卡片即可填充模型参数与协议地址"
        icon={Sparkles}
        action={<AdminBadge tone="sky">5 种预设</AdminBadge>}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PRESETS.map((preset) => {
            const selected = config.provider === preset.provider;
            return (
              <button
                key={preset.provider}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cx(
                  "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
                  selected
                    ? "border-sky-800/50 bg-sky-800/[0.06] shadow-sm ring-2 ring-sky-800/15"
                    : "border-[var(--a-border)] hover:border-sky-800/30 hover:bg-sky-800/[0.03]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-black text-white", preset.tone)}>
                      {preset.name.slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-[12px] font-extrabold" style={{ color: "var(--a-text)" }}>
                        {preset.name}
                        <span className="ml-1 text-[10px] font-semibold" style={{ color: "var(--a-faint)" }}>
                          {preset.sub}
                        </span>
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--a-faint)" }}>
                        {preset.provider}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-[var(--a-border)] bg-[var(--a-surface-solid)] px-2 py-0.5 text-[9px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                    {preset.badge}
                  </span>
                </div>
                <p className="mt-3 line-clamp-1 text-[10px]" style={{ color: "var(--a-muted)" }}>
                  {preset.note}
                </p>
                <p className="mt-1 truncate font-mono text-[9px]" style={{ color: "var(--a-faint)" }}>
                  {preset.baseUrl}
                </p>
                {selected && (
                  <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-sky-800 text-[9px] font-black text-white">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </AdminPanel>

      <form onSubmit={handleSave} className="space-y-5">
        <AdminPanel
          title="核心连接与模型参数"
          subtitle="API 密钥、协议地址与生成参数"
          icon={Sliders}
          action={<AdminBadge tone="emerald" dot>配置已加载</AdminBadge>}
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field
              className="md:col-span-2"
              label={
                <span className="flex items-center gap-2">
                  大模型 API Key 密钥
                  {config.has_key && <AdminBadge tone="emerald">已就绪生效</AdminBadge>}
                </span>
              }
              icon={KeyRound}
              hint="支持 DeepSeek / 阿里百炼 / 智谱 / OpenAI / 自定义 Key"
            >
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="admin-input pr-11 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:text-sky-800"
                  aria-label={showKey ? "隐藏密钥" : "显示密钥"}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Field label="API Base URL（兼容 OpenAI 规范）" icon={Globe2} hint="结尾无需包含 /chat/completions，客户端会自动补齐">
              <input
                type="text"
                value={config.base_url}
                onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                required
                placeholder="https://api.deepseek.com/v1"
                className="admin-input font-mono"
              />
            </Field>

            <Field label="服务商标识（Provider Tag）" icon={ShieldCheck}>
              <input
                type="text"
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value.toUpperCase() })}
                required
                placeholder="DEEPSEEK / ALI_QWEN / OPENAI / CUSTOM"
                className="admin-input font-mono"
              />
            </Field>

            <Field label="文本主推理模型（Text LLM）" icon={FileCheck} hint="负责 RAG 知识库问答、主观大题采分点评改、变式题生成">
              <input
                type="text"
                value={config.text_model}
                onChange={(e) => setConfig({ ...config, text_model: e.target.value })}
                required
                placeholder="deepseek-chat / qwen-plus / glm-4-flash"
                className="admin-input font-mono"
              />
            </Field>

            <Field label="多模态视觉模型（Vision VL）" icon={Sparkles} hint="负责时序图、数据通路、算法树图、OCR 试卷真题截图解析">
              <input
                type="text"
                value={config.vl_model}
                onChange={(e) => setConfig({ ...config, vl_model: e.target.value })}
                required
                placeholder="qwen-vl-max / glm-4v-flash / gpt-4o"
                className="admin-input font-mono"
              />
            </Field>

            <div className="space-y-2 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                  <Gauge className="h-3.5 w-3.5 text-sky-800" />
                  采样温度（Temperature）
                </label>
                <span className="rounded-lg border border-sky-800/20 bg-sky-800/10 px-2 py-0.5 font-mono text-[11px] font-black text-sky-900 dark:text-sky-300">
                  {config.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full accent-sky-900"
              />
              <p className="text-[10px]" style={{ color: "var(--a-faint)" }}>
                考研场景建议 0.2 ~ 0.4（严谨防幻觉）
              </p>
            </div>

            <Field label="单次最大生成（Max Tokens）" icon={Layers} hint="建议 2048 ~ 4096">
              <input
                type="number"
                min="512"
                max="8192"
                step="256"
                value={config.max_tokens}
                onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 2048 })}
                className="admin-input font-mono"
              />
            </Field>

            <Field className="md:col-span-2" label="408 考研系统级 System Prompt" icon={Terminal} hint="导师人设与幻觉抑制约束">
              <textarea
                rows={4}
                value={config.system_prompt}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                className="admin-textarea font-mono leading-relaxed"
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5" style={{ borderColor: "var(--a-border)" }}>
            <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--a-faint)" }}>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              配置保存后将立即热重载至 Python AI 引擎
            </div>
            <button type="submit" disabled={saving} className="admin-btn admin-btn-primary disabled:opacity-50">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "正在保存..." : "保存并生效配置"}
            </button>
          </div>
        </AdminPanel>
      </form>

      <div className="admin-panel rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-black" style={{ color: "var(--a-text)" }}>
          <Activity className="h-4 w-4 text-sky-800 dark:text-sky-300" />
          大模型接入赋能体系
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              title: "真实多模态视觉 (Vision VL)",
              desc: "学员上传 Cache 地址映射图、流水线时空图、红黑树 / 哈夫曼树或真题截图时，系统自动将 Base64 图像送入 VL 视觉模型进行 OCR 提取与原理深度解析。",
              icon: Sparkles,
              dot: "bg-emerald-500",
            },
            {
              title: "RAG 知识库溯源与幻觉抑制",
              desc: "知识库混合检索匹配 kb_chunk 考点切片，将教材权威原文注入上下文 Prompt，强制模型标注《文档名》及页码出处，拒绝事实性幻觉。",
              icon: Database,
              dot: "bg-amber-500",
            },
            {
              title: "主观题采分点精批打分",
              desc: "结合 408 统考 18 年评分细则，对算法题时间 / 空间复杂度分析、PV 同步互斥信号量定义等主观大题逐点匹配判分，给出扣分原因与答题建议。",
              icon: FileCheck,
              dot: "bg-sky-700",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--a-border)", background: "var(--a-bg)" }}
              >
                <div className="flex items-center gap-2 text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                  <span className={cx("h-1.5 w-1.5 rounded-full", item.dot)} />
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                  {item.title}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed" style={{ color: "var(--a-muted)" }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Python 引擎", value: "FastAPI · 8000", icon: Server, tone: "text-sky-800" },
          { label: "协议兼容", value: "OpenAI Compatible", icon: Globe2, tone: "text-blue-500" },
          { label: "配置热重载", value: "即时生效", icon: RefreshCw, tone: "text-emerald-500" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-2xl border px-4 py-3.5"
              style={{ borderColor: "var(--a-border)", background: "var(--a-surface)" }}
            >
              <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500/5", item.tone)}>
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--a-faint)" }}>
                  {item.label}
                </p>
                <p className="text-[12px] font-extrabold" style={{ color: "var(--a-text)" }}>
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
