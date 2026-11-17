"use client";

import React, { useState } from "react";
import { X, Target, Calendar, Award, Sparkles, Check, School } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface TargetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const TOP_UNIVERSITIES = [
  "清华大学", "北京大学", "浙江大学", "复旦大学", 
  "上海交通大学", "中国科学技术大学", "北京航空航天大学", 
  "电子科技大学", "华中科技大学", "哈尔滨工业大学", "西安交通大学"
];

const EXAM_YEARS = [2025, 2026, 2027, 2028];
const TARGET_SCORES = [105, 115, 120, 125, 130, 135];

export default function TargetConfigModal({ isOpen, onClose, onSaved }: TargetConfigModalProps) {
  const { user, updateUserTarget } = useAuth();
  
  const [examYear, setExamYear] = useState<number>(user?.examYear || 2026);
  const [targetSchool, setTargetSchool] = useState<string>(user?.targetSchool || "清华大学");
  const [targetScore, setTargetScore] = useState<number>(user?.targetScore || 125);
  const [prepStage, setPrepStage] = useState<string>(user?.prepStage || "BASIC");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await updateUserTarget({
        examYear,
        targetSchool,
        targetScore,
        prepStage
      });
      if (ok) {
        if (onSaved) onSaved();
        onClose();
      } else {
        alert("保存失败，请检查网络或后端服务");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-zinc-100">
                个性化备考目标与年份设置
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                AI 伴学引擎将依据目标院校录取要求与剩余天数实时动态调整每日清单
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* 考研年份 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              考研年份（入学年份）
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EXAM_YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setExamYear(y)}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                    examYear === y
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                      : "bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-blue-400"
                  }`}
                >
                  {y} 考研
                </button>
              ))}
            </div>
          </div>

          {/* 目标院校 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <School className="w-4 h-4 text-amber-500" />
              目标高校
            </label>
            <input
              type="text"
              value={targetSchool}
              onChange={(e) => setTargetSchool(e.target.value)}
              placeholder="请输入目标大学名称，例如：清华大学、浙江大学"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            {/* 热门高校快捷标签 */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TOP_UNIVERSITIES.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setTargetSchool(u)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    targetSchool === u
                      ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* 目标分数 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                408 统考目标分数
              </label>
              <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                {targetScore} 分
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {TARGET_SCORES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTargetScore(s)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                    targetScore === s
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-emerald-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 当前备考阶段 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              当前备考阶段
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { code: "BASIC", label: "基础夯实 (第 1 轮地毯式复习)" },
                { code: "ENHANCE", label: "专题强化 (大题高频突破)" },
                { code: "TRUE_EXAM", label: "真题模拟 (全真计时训练)" },
                { code: "SPRINT", label: "考前冲刺 (查漏补缺押题)" },
              ].map((st) => (
                <button
                  key={st.code}
                  type="button"
                  onClick={() => setPrepStage(st.code)}
                  className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                    prepStage === st.code
                      ? "bg-indigo-50 border-indigo-500 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-600 dark:text-indigo-200"
                      : "bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            保存后系统与 AI 伴学引擎将实时基于新目标重新规划
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>保存中...</>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  保存并同步 AI 每日清单
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

