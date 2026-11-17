"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  title?: string;
  subtitle?: string;
  variant?: "portal" | "admin" | "user";
  href?: string;
  className?: string;
}

export default function Logo({
  size = "md",
  showText = true,
  title = "408 计算机考研助手",
  subtitle = "全国统考专业课备考平台",
  variant = "portal",
  href,
  className = "",
}: LogoProps) {
  const sizeMap = {
    sm: { box: 34, textTitle: "text-sm", textSub: "text-xs" },
    md: { box: 44, textTitle: "text-base font-black", textSub: "text-xs" },
    lg: { box: 52, textTitle: "text-xl font-black", textSub: "text-xs sm:text-sm" },
    xl: { box: 68, textTitle: "text-2xl font-black", textSub: "text-sm" },
  };

  const { box, textTitle, textSub } = sizeMap[size] || sizeMap.md;

  const badgeMap = {
    portal: {
      text: "408统考",
      class: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    },
    user: {
      text: "学员端",
      class: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300",
    },
    admin: {
      text: "管理后台",
      class: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
    },
  };

  const currentBadge = badgeMap[variant] || badgeMap.portal;

  const content = (
    <div className={`flex items-center gap-3 select-none group ${className}`}>
      {/* 408 核心矢量徽标图形 */}
      <div
        className="relative shrink-0 rounded-2xl overflow-hidden shadow-md shadow-indigo-500/20 group-hover:scale-105 group-hover:shadow-indigo-500/30 transition-all duration-300"
        style={{ width: box, height: box }}
      >
        <Image
          src="/logo.svg"
          alt="408 计算机考研助手 Logo"
          width={box}
          height={box}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {showText && (
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-black tracking-tight text-zinc-900 dark:text-zinc-100 truncate ${textTitle}`}>
              {title}
            </span>
            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] sm:text-xs shrink-0 ${currentBadge.class}`}>
              {currentBadge.text}
            </span>
          </div>
          {subtitle && (
            <p className={`text-zinc-400 dark:text-zinc-500 truncate -mt-0.5 ${textSub}`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block transition-opacity hover:opacity-95">
        {content}
      </Link>
    );
  }

  return content;
}

