"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import type { Scene } from "manim-web";
import type { ManimWebAnimation } from "@/animations/types";

interface ManimPlayerProps {
  animation: ManimWebAnimation;
  className?: string;
}

export default function ManimPlayer({ animation, className = "" }: ManimPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const tokenRef = useRef(0);
  const [index, setIndex] = useState(animation.initialState ? -1 : 0);
  const [rendering, setRendering] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const stepCount = animation.steps.length;
  const progress = index >= 0 ? ((index + 1) / stepCount) * 100 : 0;

  const renderStep = async (target: number, animate: boolean) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const token = ++tokenRef.current;
    setRendering(true);
    scene.clear({ render: false });
    try {
      if (target === -1 && animation.initialState) {
        await animation.initialState.render(scene, false);
      } else {
        const step = animation.steps[target];
        if (step) await step.render(scene, animate);
        else scene.render();
      }
    } finally {
      if (token === tokenRef.current) setRendering(false);
    }
  };

  useEffect(() => {
    let disposed = false;
    (async () => {
      const { Scene } = await import("manim-web");
      if (disposed || !hostRef.current) return;
      sceneRef.current?.dispose();
      const config = animation.scene;
      const scene = new Scene(hostRef.current, {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
        backgroundColor: config.backgroundColor,
      });
      (scene.camera as any).aspectMode = "contain";
      sceneRef.current = scene;
      setIndex(animation.initialState ? -1 : 0);
      await renderStep(animation.initialState ? -1 : 0, true);
    })();
    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation]);

  useEffect(() => {
    if (!sceneRef.current) return;
    void renderStep(index, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen().catch(() => {});
  };

  return (
    <div
      ref={rootRef}
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 ${
        fullscreen ? "flex h-full w-full flex-col" : ""
      } ${className}`}
      aria-label={animation.ariaLabel}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 dark:border-zinc-800">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">分步动画 · Manim</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-700 dark:text-zinc-200">{animation.ariaLabel}</p>
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          title={fullscreen ? "退出全屏" : "全屏"}
        >
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className={fullscreen ? "min-h-0 flex-1 bg-slate-50 p-2 dark:bg-zinc-950" : "bg-slate-50 p-2 dark:bg-zinc-950"}>
        <div
          className="relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800"
          style={fullscreen ? { height: "calc(100vh - 150px)" } : { aspectRatio: `${animation.scene.width} / ${animation.scene.height}` }}
        >
          <div
            ref={hostRef}
            className="absolute inset-0 [&_canvas]:!absolute [&_canvas]:!inset-0 [&_canvas]:!h-full [&_canvas]:!w-full"
          />
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex(animation.initialState ? -1 : 0)}
            disabled={rendering}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 disabled:opacity-40 dark:hover:text-zinc-200"
          >
            <RotateCcw className="h-3 w-3" /> 重置
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIndex((value) => Math.max(animation.initialState ? -1 : 0, value - 1))}
              disabled={rendering || index === (animation.initialState ? -1 : 0)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> 上一步
            </button>
            <span className="min-w-[68px] text-center font-mono text-[10px] font-bold text-slate-500">
              {index < 0 ? "准备开始" : `${index + 1} / ${stepCount}`}
            </span>
            <button
              type="button"
              onClick={() => setIndex((value) => Math.min(stepCount - 1, value + 1))}
              disabled={rendering || index === stepCount - 1}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              下一步 <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
