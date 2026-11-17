"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import MarkdownView from "@/components/MarkdownView";
import { useAuth } from "@/context/AuthContext";
import { 
  Image as ImageIcon, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  Cpu, 
  Clock, 
  Layers, 
  RefreshCw, 
  FileText, 
  ShieldCheck, 
  ChevronRight,
  BookOpen,
  Sliders,
  Compass,
  Plus,
  MessageSquare,
  Trash2,
  History,
  Menu,
  X
} from "lucide-react";

interface ConversationItem {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
  message_count?: number;
  last_message?: string;
}

const SUBJECT_RULES: Array<{ code: string; name: string; words: string[] }> = [
  {
    code: "DS",
    name: "数据结构",
    words: ["数据结构", "顺序表", "链表", "栈", "队列", "串", "二叉树", "树", "图", "邻接", "哈希", "散列", "查找", "排序", "复杂度", "递归", "并查集", "哈夫曼", "生成树", "拓扑", "关键路径", "最短路径", "B树", "B+树", "红黑树", "AVL", "KMP", "堆"],
  },
  {
    code: "CO",
    name: "计算机组成原理",
    words: ["计算机组成", "计组", "组成原理", "补码", "原码", "反码", "浮点", "定点", "ALU", "CPU", "指令", "寻址", "流水线", "存储器", "cache", "缓存", "主存", "总线", "中断", "DMA", "控制器", "微程序", "虚拟地址", "物理地址", "TLB", "局部性", "海明", "CRC", "IEEE", "数据通路", "寄存器", "RAID"],
  },
  {
    code: "OS",
    name: "操作系统",
    words: ["操作系统", "进程", "线程", "调度", "死锁", "同步", "互斥", "信号量", "管程", "分页", "分段", "页表", "快表", "缺页", "虚拟内存", "文件系统", "磁盘", "设备管理", "系统调用", "PV操作", "银行家", "页面置换", "LRU", "FIFO", "段页式", "inode", "SPOOLing"],
  },
  {
    code: "CN",
    name: "计算机网络",
    words: ["计算机网络", "计网", "OSI", "TCP", "UDP", "IP", "IPv4", "IPv6", "子网", "路由", "交换机", "以太网", "协议栈", "物理层", "数据链路层", "网络层", "传输层", "应用层", "CSMA", "VLAN", "NAT", "VPN", "RIP", "OSPF", "BGP", "CIDR", "子网掩码", "拥塞窗口", "慢开始", "快重传", "三次握手", "四次挥手", "HTTP", "DNS", "ARP", "DHCP"],
  },
];

function detectSubjectLocal(text: string): { code: string; name: string } {
  const lowered = (text || "").toLowerCase();
  if (!lowered.trim()) return { code: "", name: "自动识别" };
  let best = { code: "", name: "自动识别", score: 0 };
  for (const rule of SUBJECT_RULES) {
    let score = 0;
    for (const word of rule.words) {
      if (lowered.includes(word.toLowerCase())) score += Math.max(1, word.length);
    }
    if (score > best.score) best = { code: rule.code, name: rule.name, score };
  }
  return { code: best.code, name: best.name };
}

function formatMessageTime(value?: string): string {
  if (!value) return new Date().toLocaleTimeString().substring(0, 5);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(11, 16) || "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatRelativeTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < day * 7) return `${Math.floor(diff / day)} 天前`;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function readImageFile(file: File, onLoad: (dataUrl: string) => void) {
  if (!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result || ""));
  reader.readAsDataURL(file);
}

const WELCOME_MESSAGE: QAMessage = {
  role: "assistant",
  content: "你好！我是 408 计算机考研伴学助手。\n直接提问即可，我会自动识别数据结构、计算机组成原理、操作系统或计算机网络，并结合当前话题的上下文继续讲解。\n\n支持专业课概念、真题解法、代码与公式推导，也可以上传数据通路图、Cache 地址图或二叉树插图。",
  isRealAi: true,
  modelUsed: "408 Pilot Agent",
  timestamp: "10:00",
};

interface QAMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
  diagramType?: string;
  knowledgePoint?: string;
  steps?: string[];
  tips?: string;
  hallucinationCheck?: string;
  isRealAi?: boolean;
  modelUsed?: string;
  isStreaming?: boolean;
  citations?: Array<{
    doc_title?: string;
    page?: number;
    title?: string;
    source?: string;
    page_number?: number;
    doc_id?: number | string | null;
    chunk_id?: number | string | null;
  }>;
  agentSteps?: string[];
  timestamp: string;
}

export default function MultimodalQAPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<QAMessage[]>([WELCOME_MESSAGE]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSocratic, setIsSocratic] = useState(false); // 分步启发式辅导模式开关（参考视频01:48）
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [conversationLoading, setConversationLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [detectedSubject, setDetectedSubject] = useState<{ code: string; name: string }>({ code: "", name: "自动识别" });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 只滚动消息容器，避免加载历史时把整页顶到页面底部
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // 支持 Ctrl+V / Cmd+V 直接粘贴题目截图
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboard = event.clipboardData;
      if (!clipboard) return;
      const fileFromItems = Array.from(clipboard.items || [])
        .find((item) => item.kind === "file" && item.type.startsWith("image/"))
        ?.getAsFile();
      const imageFile =
        Array.from(clipboard.files || []).find((file) => file.type.startsWith("image/")) ||
        fileFromItems;
      if (!imageFile) return;
      event.preventDefault();
      readImageFile(imageFile, setSelectedImage);
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const initializedRef = useRef(false);

  const authHeaders = (): Record<string, string> => {
    const token =
      user?.token ||
      (typeof window !== "undefined" ? localStorage.getItem("408_auth_token") || "" : "");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchConversations = async (): Promise<ConversationItem[]> => {
    try {
      const res = await fetch("/pilot/chat/conversations?limit=50", {
        headers: authHeaders(),
      });
      if (!res.ok) return [];
      const json = await res.json();
      const list: ConversationItem[] = Array.isArray(json.conversations) ? json.conversations : [];
      setConversations(list);
      return list;
    } catch (err) {
      console.warn("加载历史话题失败:", err);
      return [];
    }
  };

  const startNewConversation = async (title = "新话题") => {
    setConversationLoading(true);
    try {
      const res = await fetch("/pilot/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title }),
      });
      const json = await res.json();
      const conversation: ConversationItem | undefined = json.conversation;
      if (conversation?.id) {
        setActiveConversationId(conversation.id);
        setMessages([WELCOME_MESSAGE]);
        setDetectedSubject({ code: "", name: "自动识别" });
        setShowHistory(false);
        await fetchConversations();
        return conversation.id;
      }
    } catch (err) {
      console.warn("新建话题失败:", err);
    } finally {
      setConversationLoading(false);
    }
    return "";
  };

  const openConversation = async (conversationId: string) => {
    if (!conversationId) return;
    setActiveConversationId(conversationId);
    setShowHistory(false);
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/pilot/chat/history?conversation_id=${encodeURIComponent(conversationId)}&limit=80`,
        { headers: authHeaders() }
      );
      const json = await res.json();
      const rows: Array<{ role: string; content: string; image?: string | null; created_at?: string }> = Array.isArray(json.messages)
        ? json.messages
        : [];
      if (rows.length === 0) {
        setMessages([WELCOME_MESSAGE]);
      } else {
        setMessages(
          rows.map((row) => ({
            role: row.role === "user" ? "user" : "assistant",
            content: row.content,
            image: row.image || undefined,
            isRealAi: row.role !== "user",
            modelUsed: row.role !== "user" ? "历史会话" : undefined,
            timestamp: formatMessageTime(row.created_at),
          })) as QAMessage[]
        );
      }
    } catch (err) {
      console.warn("加载话题历史失败:", err);
      setMessages([WELCOME_MESSAGE]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const removeConversation = async (conversationId: string) => {
    if (!conversationId) return;
    if (!confirm("确定删除这个话题及其全部聊天记录吗？")) return;
    try {
      await fetch(`/pilot/chat/conversations/${conversationId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const list = await fetchConversations();
      if (conversationId === activeConversationId) {
        if (list.length > 0) {
          await openConversation(list[0].id);
        } else {
          await startNewConversation();
        }
      }
    } catch (err) {
      console.warn("删除话题失败:", err);
    }
  };

  useEffect(() => {
    if (!user?.token || initializedRef.current) return;
    initializedRef.current = true;
    (async () => {
      setConversationLoading(true);
      const list = await fetchConversations();
      setConversationLoading(false);
      if (list.length > 0) {
        await openConversation(list[0].id);
      } else {
        await startNewConversation();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  const handleSend = async (overridePrompt?: string) => {
    const rawPrompt = overridePrompt ?? inputPrompt;
    if (!rawPrompt.trim() && !selectedImage) return;

    const userText = rawPrompt.trim();
    const userImg = selectedImage;

    let conversationId = activeConversationId;
    if (!conversationId) {
      conversationId = await startNewConversation();
    }
    if (userText) {
      setDetectedSubject(detectSubjectLocal(userText));
    }

    const userMsg: QAMessage = {
      role: "user",
      content: userText || "【上传了 408 专业课插图并请求智能解答】",
      image: userImg || undefined,
      timestamp: new Date().toLocaleTimeString().substring(0, 5)
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setSelectedImage(null);
    setLoading(true);

    // 如果上传了图片，优先走 408 Pilot 多模态流式 Agent，失败再回退旧视觉服务
    if (userImg) {
      let placeholderAdded = false;
      let imageStreamContent = "";

      try {
        const blob = await (await fetch(userImg)).blob();
        const file = new File([blob], "question.png", { type: blob.type || "image/png" });
        const form = new FormData();
        form.append("message", userMsg.content || "请解析这张 408 题目图片");
        form.append("image", file);
        form.append("user_id", String(user?.userId || 2));
        if (conversationId) form.append("conversation_id", conversationId);

        const assistantPlaceholder: QAMessage = {
          role: "assistant",
          content: "",
          isStreaming: true,
          isRealAi: true,
          modelUsed: "408 Pilot Agent",
          knowledgePoint: "408 多模态 Agent",
          timestamp: new Date().toLocaleTimeString().substring(0, 5),
        };
        setMessages((prev) => [...prev, assistantPlaceholder]);
        placeholderAdded = true;

        const imgRes = await fetch("/pilot/chat/image/stream", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user?.token || localStorage.getItem("408_auth_token") || ""}`,
          },
          body: form,
        });
        if (!imgRes.ok || !imgRes.body) throw new Error(`image stream ${imgRes.status}`);

        const updateLast = (patch: Partial<QAMessage>) => {
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.length - 1;
            if (idx >= 0 && updated[idx].role === "assistant") {
              updated[idx] = { ...updated[idx], ...patch };
            }
            return updated;
          });
        };

        const reader = imgRes.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let steps: string[] = [];
        let citations: QAMessage["citations"] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "conversation" && parsed.conversation_id) {
                setActiveConversationId(parsed.conversation_id);
              }
              if (parsed.type === "done") {
                if (parsed.conversation_id) setActiveConversationId(parsed.conversation_id);
                if (parsed.detected_subject) {
                  setDetectedSubject({
                    code: parsed.detected_subject_code || "",
                    name: parsed.detected_subject,
                  });
                }
                if (Array.isArray(parsed.citations) && parsed.citations.length > 0) {
                  citations = parsed.citations.map((c: any) => ({
                    doc_title: c.title || c.source || "408 知识库",
                    title: c.title || c.source || "408 知识库",
                    page: c.page_number || c.page || 1,
                    page_number: c.page_number || c.page || 1,
                    source: c.source || c.doc_title || c.title || "",
                    doc_id: c.doc_id ?? null,
                    chunk_id: c.chunk_id ?? null,
                  }));
                  updateLast({ citations });
                }
                if (!imageStreamContent && parsed.content) {
                  imageStreamContent = parsed.content;
                  updateLast({ content: imageStreamContent, citations });
                }
              }
              if (parsed.type === "error" && parsed.content) {
                imageStreamContent += parsed.content;
                updateLast({ content: imageStreamContent, isStreaming: false });
              }

              let stepText = "";
              if (parsed.type === "preparing") stepText = "正在读取上下文并匹配相关资料";
              else if (parsed.type === "plan_created") {
                const count = Array.isArray(parsed.plan) ? parsed.plan.length : 1;
                stepText = `已生成任务规划（${count} 个步骤）`;
              } else if (parsed.type === "tool_started") stepText = `正在调用工具：${parsed.tool || "专业工具"}`;
              else if (parsed.type === "tool_finished") stepText = `工具执行完成：${parsed.tool || "专业工具"}`;
              else if (parsed.type === "validated") {
                const confidence = typeof parsed.confidence === "number" ? `，置信度 ${Math.round(parsed.confidence * 100)}%` : "";
                stepText = `答案验证完成${confidence}`;
              } else if (parsed.type === "replan") stepText = "检测到答案不足，正在重新规划";
              if (stepText && !steps.includes(stepText)) {
                steps.push(stepText);
                updateLast({ agentSteps: [...steps] });
              }

              const isAnswerChunk = parsed.type === "chunk" || parsed.type === undefined;
              if (isAnswerChunk && parsed.content) {
                imageStreamContent += parsed.content;
                updateLast({
                  content: imageStreamContent,
                  citations,
                  agentSteps: steps,
                  isStreaming: true,
                });
              }
            } catch {
              // 忽略不完整的 SSE JSON 片段
            }
          }
        }

        if (!imageStreamContent) throw new Error("empty image stream");
        updateLast({
          content: imageStreamContent,
          citations,
          agentSteps: steps,
          isStreaming: false,
        });
        await fetchConversations();
        setLoading(false);
        return;
      } catch (pilotErr) {
        console.warn("408 Pilot 多模态流式失败，回退旧视觉服务:", pilotErr);
        if (imageStreamContent) {
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.length - 1;
            if (idx >= 0 && updated[idx].role === "assistant") {
              updated[idx] = { ...updated[idx], isStreaming: false };
            }
            return updated;
          });
          setLoading(false);
          return;
        }
        if (placeholderAdded) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && !last.content) return prev.slice(0, -1);
            return prev;
          });
        }
      }

      // 旧视觉服务兜底（非流式）
      try {
        const res = await fetch("/ai-api/api/ai/multimodal-qa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_text: userMsg.content,
            image_base64: userImg,
            subject_hint: detectSubjectLocal(userMsg.content).code
          })
        });
        const json = await res.json();
        if (json.code === 200 && json.data) {
          const d = json.data;
          const aiMsg: QAMessage = {
            role: "assistant",
            content: `${d.extracted_content}\n\n${d.analysis_summary}`,
            diagramType: d.diagram_type,
            knowledgePoint: d.knowledge_point,
            steps: d.solution_steps,
            tips: d.exam_tips,
            hallucinationCheck: d.hallucination_check,
            isRealAi: d.is_real_ai,
            modelUsed: d.model_used,
            timestamp: new Date().toLocaleTimeString().substring(0, 5)
          };
          setMessages((prev) => [...prev, aiMsg]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    // 纯文本问答走【真实大模型 SSE 流式输出打字机接口】
    try {
      const assistantPlaceholder: QAMessage = {
        role: "assistant",
        content: "",
        isStreaming: true,
        isRealAi: true,
        modelUsed: "deepseek-chat",
        timestamp: new Date().toLocaleTimeString().substring(0, 5)
      };
      setMessages((prev) => [...prev, assistantPlaceholder]);

      const authToken = typeof window !== "undefined" ? localStorage.getItem("408_auth_token") || "" : "";
      let response: Response;
      try {
        // 优先使用 408 Pilot 多智能体引擎（Agent Runtime + 混合 RAG + Skills）
        response = await fetch("/pilot/chat/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            message: userText,
            conversation_id: conversationId || undefined,
            metadata: {
              is_socratic: isSocratic,
              history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
            },
          }),
        });
        if (!response.ok) throw new Error(`pilot ${response.status}`);
      } catch (pilotError) {
        // 兼容旧 AI 服务，保证 8010 不可用时仍可对话
        console.warn("408 Pilot 不可用，回退旧 AI 服务:", pilotError);
        response = await fetch("/ai-api/api/ai/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: userText,
            subject: detectSubjectLocal(userText).code,
            is_socratic: isSocratic,
            history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
          }),
        });
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullContent = "";
      let capturedCitations: NonNullable<QAMessage["citations"]> = [];
      let capturedSteps: string[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // 最后未完成的行暂存回 buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const dataStr = trimmed.slice(6).trim();
          if (dataStr === "[DONE]") {
            break;
          }
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.citations) {
              capturedCitations = (parsed.citations as any[]).map((citation) => ({
                doc_title:
                  citation.title ||
                  citation.doc_title ||
                  citation.source ||
                  "408 知识库",
                title:
                  citation.title ||
                  citation.doc_title ||
                  citation.source ||
                  "408 知识库",
                page: citation.page_number || citation.page || 1,
                page_number: citation.page_number || citation.page || 1,
                source: citation.source || citation.doc_title || citation.title || "",
                doc_id: citation.doc_id ?? null,
                chunk_id: citation.chunk_id ?? null,
              }));
            }
            if (parsed.type === "conversation" && parsed.conversation_id) {
              setActiveConversationId(parsed.conversation_id);
            }
            if (parsed.type === "done") {
              if (parsed.conversation_id) setActiveConversationId(parsed.conversation_id);
              if (parsed.detected_subject) {
                setDetectedSubject({
                  code: parsed.detected_subject_code || "",
                  name: parsed.detected_subject,
                });
              }
            }
            if (parsed.type === "error" && parsed.content) {
              fullContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: fullContent,
                    isStreaming: false,
                  };
                }
                return updated;
              });
            }

            // 把 Agent 的规划、工具调用、验证过程转成可展示的思考时间线
            let stepText = "";
            if (parsed.type === "preparing") stepText = "正在读取上下文并匹配相关资料";
            else if (parsed.type === "plan_created") {
              const count = Array.isArray(parsed.plan) ? parsed.plan.length : 1;
              stepText = `已生成任务规划（${count} 个步骤）`;
            } else if (parsed.type === "tool_started") stepText = `正在调用工具：${parsed.tool || "专业工具"}`;
            else if (parsed.type === "tool_finished") stepText = `工具执行完成：${parsed.tool || "专业工具"}`;
            else if (parsed.type === "validated") {
              const confidence = typeof parsed.confidence === "number" ? `，置信度 ${Math.round(parsed.confidence * 100)}%` : "";
              stepText = `答案验证完成${confidence}`;
            } else if (parsed.type === "replan") stepText = "检测到答案不足，正在重新规划";
            if (stepText && !capturedSteps.includes(stepText)) {
              capturedSteps.push(stepText);
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                  updated[lastIdx] = { ...updated[lastIdx], agentSteps: [...capturedSteps] };
                }
                return updated;
              });
            }

            // Pilot 会发送 preparing / plan_created / tool_started / done 等事件，
            // 只把真正的正文 chunk 拼进回答，避免重复或状态文案混入正文。
            const isAnswerChunk = parsed.type === "chunk" || parsed.type === undefined;
            if (isAnswerChunk && parsed.content) {
              fullContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: fullContent,
                    citations: capturedCitations.length > 0 ? capturedCitations : updated[lastIdx].citations,
                    agentSteps: capturedSteps.length > 0 ? [...capturedSteps] : updated[lastIdx].agentSteps,
                    isStreaming: true
                  };
                }
                return updated;
              });
            }
          } catch (e) {
            // 忽略未完整的临时 JSON 片段，绝不将 raw json 混入正文
          }
        }
      }

      // 流式传输完毕，取消 isStreaming 标记
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
          updated[lastIdx] = {
            ...updated[lastIdx],
            citations: capturedCitations.length > 0 ? capturedCitations : updated[lastIdx].citations,
            agentSteps: capturedSteps.length > 0 ? [...capturedSteps] : updated[lastIdx].agentSteps,
            isStreaming: false,
          };
        }
        return updated;
      });

    } catch (err: any) {
      console.error("流式读取失败:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `【连接错误】: 无法获取流式回复 (${err.message})，请检查服务。`,
          timestamp: new Date().toLocaleTimeString().substring(0, 5)
        }
      ]);
    } finally {
      setLoading(false);
      await fetchConversations();
    }
  };

  const liveSubject = inputPrompt.trim() ? detectSubjectLocal(inputPrompt) : detectedSubject;
  const activeConversation = conversations.find((item) => item.id === activeConversationId);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* 顶部标题区 */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="flex flex-wrap items-center gap-2 text-lg font-extrabold text-slate-900 sm:text-xl dark:text-zinc-100">
                408 研炼问答伴学助手
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200">
                  DeepSeek 实时流式响应
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                支持专业课提问、时序图/真题图 OCR 多模态提取、分步启发式辅导与 KaTeX 公式实时渲染
              </p>
            </div>
          </div>
        </div>

        {/* 模式切换与学科选择 */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 分步启发式辅导切换（参考视频01:48） */}
          <button
            type="button"
            onClick={() => setIsSocratic(!isSocratic)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isSocratic
                ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                : "bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:border-slate-300"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{isSocratic ? "分步启发辅导 (开)" : "分步启发辅导 (关)"}</span>
          </button>

          {/* 科目自动识别（无需手动选择） */}
          <div className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            <Cpu className="w-3.5 h-3.5" />
            <span>
              自动识别：{liveSubject.code ? `${liveSubject.name} (${liveSubject.code})` : "待识别"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => startNewConversation()}
            disabled={conversationLoading}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            新建话题
          </button>

          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 lg:hidden dark:border-zinc-700 dark:text-zinc-300"
          >
            <History className="w-3.5 h-3.5" />
            {showHistory ? "收起历史" : "历史话题"}
          </button>
        </div>
      </div>

      {/* 左侧历史话题 + 右侧对话区 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={`${showHistory ? "block" : "hidden"} lg:block`}>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-4">
            <div className="flex items-center justify-between border-b border-slate-100 px-1 pb-2 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-zinc-200">
                <History className="h-3.5 w-3.5 text-blue-600" />
                历史话题
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500 dark:bg-zinc-800">
                  {conversations.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => startNewConversation()}
                disabled={conversationLoading}
                title="新建话题"
                className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-950/40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 max-h-[420px] space-y-1 overflow-y-auto pr-0.5">
              {conversationLoading && conversations.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-slate-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  正在加载话题...
                </div>
              ) : conversations.length === 0 ? (
                <p className="px-1 py-6 text-center text-[11px] text-slate-400">
                  暂无历史话题，点击 + 开始第一段对话。
                </p>
              ) : (
                conversations.map((item) => {
                  const isActive = item.id === activeConversationId;
                  return (
                    <div
                      key={item.id}
                      className={`group flex items-start gap-2 rounded-xl border px-2.5 py-2 transition-colors ${
                        isActive
                          ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
                          : "border-transparent hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => openConversation(item.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          <MessageSquare
                            className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`}
                          />
                          <span
                            className={`truncate text-[11px] font-bold ${
                              isActive ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-zinc-200"
                            }`}
                          >
                            {item.title || "新话题"}
                          </span>
                        </div>
                        <p className="mt-0.5 pl-5 text-[9px] text-slate-400">
                          {formatRelativeTime(item.updated_at)} · {item.message_count || 0} 条消息
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeConversation(item.id)}
                        title="删除话题"
                        className="mt-0.5 rounded-md p-1 text-slate-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-2 border-t border-slate-100 px-1 pt-2 dark:border-zinc-800">
              <p className="truncate text-[9px] text-slate-400">
                当前话题：{activeConversation?.title || "未选择"}
              </p>
              <p className="mt-0.5 text-[9px] text-slate-400">
                每个话题独立保存上下文，切换后互不干扰。
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">

      {/* 对话消息展示列表 (带流式打字机光标动画) */}
      <div
        ref={messagesContainerRef}
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs min-h-[300px] max-h-[58dvh] sm:min-h-[420px] sm:max-h-[620px] overflow-y-auto space-y-5"
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-purple-600 text-white shadow-xs"
              }`}
            >
              {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-4 sm:p-5 space-y-3 ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-xs"
                  : "bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-200 rounded-tl-xs"
              }`}
            >
              {/* 头部元数据 */}
              {m.role === "assistant" && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-zinc-700/60 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{m.knowledgePoint || "408 考研伴学导师"}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {m.isRealAi && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono font-bold border border-emerald-200">
                        {m.modelUsed || "deepseek-chat"} 直连
                      </span>
                    )}
                    {m.isStreaming && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        正在流式生成中...
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 上传的插图展示 */}
              {m.image && (
                <div className="rounded-xl overflow-hidden border border-white/20 max-w-sm">
                  <img src={m.image} alt="Upload" className="w-full h-auto object-cover max-h-48" />
                </div>
              )}

              {/* Agent 思考过程时间线 */}
              {m.agentSteps && m.agentSteps.length > 0 && (
                <details className="group rounded-xl border border-blue-200/70 bg-blue-50/60 px-3 py-2 text-[11px] dark:border-blue-900/60 dark:bg-blue-950/30">
                  <summary className="cursor-pointer select-none font-bold text-blue-700 dark:text-blue-300">
                    AI 思考过程（{m.agentSteps.length} 步）
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {m.agentSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* 回复文本内容 (支持全真 Markdown 与表格渲染以及打字机光标动画) */}
              <div className="text-xs sm:text-sm leading-relaxed font-sans">
                {m.role === "assistant" ? (
                  <MarkdownView content={m.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
                {m.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-blue-600 animate-pulse align-middle"></span>
                )}
              </div>

              {/* 溯源资料出处 (参考视频01:03) */}
              {m.citations && m.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    参考考纲切片出处：
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.citations.map((c, cIdx) => {
                      const citationTitle =
                        c.doc_title || c.title || c.source || "408 知识库";
                      const citationPage = c.page ?? c.page_number ?? 1;
                      const isQuestionBank =
                        c.source === "mysql_question_bank" ||
                        (c.doc_id == null && c.chunk_id == null && citationTitle.startsWith("第"));
                      const label = isQuestionBank
                        ? `题库 · ${citationTitle}`
                        : `《${citationTitle}》第 ${citationPage} 页`;
                      const href =
                        c.doc_id != null
                          ? `/user/knowledge?doc=${encodeURIComponent(String(c.doc_id))}${
                              c.chunk_id != null ? `&chunk=${encodeURIComponent(String(c.chunk_id))}` : ""
                            }`
                          : null;
                      const className =
                        "inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[11px] text-blue-600 dark:text-blue-400 font-mono hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors";
                      return href ? (
                        <Link key={cIdx} href={href} className={className} title="跳转到知识库原文切片">
                          {label}
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span key={cIdx} className={className}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 多模态解题步骤与采分点剖析 */}
              {m.steps && m.steps.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                    标准解题推理步骤：
                  </span>
                  <div className="space-y-1">
                    {m.steps.map((step, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-700/60 text-xs font-medium"
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 避坑提示 */}
              {m.tips && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs">
                  {m.tips}
                </div>
              )}

              {/* 底部时间戳 */}
              <div
                className={`text-[10px] text-right font-mono ${
                  m.role === "user" ? "text-blue-200" : "text-slate-400"
                }`}
              >
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}
        {messages.length <= 1 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-800/30">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              试着这样问
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                {
                  label: "梳理 408 四科冲刺重点",
                  prompt: "请按数据结构、计算机组成原理、操作系统、计算机网络四科，帮我梳理 408 冲刺阶段最值得优先复习的高频考点，并给出每天的时间分配建议。",
                },
                {
                  label: "讲透 Cache 组相联映射",
                  prompt: "请用 408 统考的讲法解释 Cache 组相联映射，包括主存地址划分、组号计算、替换算法和常见陷阱。",
                },
                {
                  label: "带我复盘一道错题",
                  prompt: "我想复盘一道错题：请先告诉我应该提供哪些信息，然后带我按「错因归因 → 正确路径 → 同类变式」三步走。",
                },
                {
                  label: "生成 3 道线性表变式题",
                  prompt: "请围绕数据结构第 2 章线性表，生成 3 道不同难度的变式练习题，并给出答案和解析。",
                },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleSend(item.prompt)}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-xs font-bold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:text-purple-700 hover:shadow-xs disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-purple-800 dark:hover:text-purple-300"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部输入框与工具栏 */}
      <div className="sticky bottom-2 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-lg shadow-slate-900/5 space-y-3 sm:static sm:z-auto sm:shadow-xs">
        {selectedImage && (
          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700 w-fit">
            <img
              src={selectedImage}
              alt="待解析题目图片"
              className="h-12 w-12 rounded-lg border border-slate-200 object-cover dark:border-zinc-700"
            />
            <span className="text-xs text-slate-600 dark:text-zinc-300 font-medium">已选择待解析图片</span>
            <button
              onClick={() => setSelectedImage(null)}
              className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
            >
              移除
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* 上传图片按钮 */}
          <label
            title="上传图片，也可直接 Ctrl+V / Cmd+V 粘贴"
            className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer shrink-0"
          >
            <ImageIcon className="w-5 h-5" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readImageFile(file, setSelectedImage);
                e.target.value = "";
              }}
            />
          </label>

          {/* 文本输入域 */}
          <textarea
            rows={2}
            placeholder={
              isSocratic 
                ? "【当前为分步启发辅导】：输入您的思考或疑问，导师将一步步引导您推导..."
                : "输入专业课考点、算法题意或粘贴题目；可直接 Ctrl+V / Cmd+V 粘贴图片，按 Enter 发送（Shift + Enter 换行）..."
            }
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none transition-all"
          />

          {/* 发送按钮 */}
          <button
            onClick={() => handleSend()}
            disabled={loading || (!inputPrompt.trim() && !selectedImage)}
            className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400 dark:text-zinc-500">
          支持上传图片，也支持在输入框内 Ctrl+V / Cmd+V 直接粘贴题目截图。
        </p>
      </div>
        </div>
      </div>
    </div>
  );
}
