"use client";

import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Inbox } from "lucide-react";

type Tone = "sky" | "blue" | "emerald" | "amber" | "rose" | "slate";

const toneMap: Record<
  Tone,
  { tile: string; line: string; dot: string; text: string; soft: string }
> = {
  sky: {
    tile: "bg-sky-800/10 text-sky-900 dark:text-sky-200 border-sky-800/20",
    line: "bg-sky-900",
    dot: "bg-sky-900",
    text: "text-sky-900 dark:text-sky-200",
    soft: "bg-sky-800/10 text-sky-900 dark:text-sky-200 border-sky-800/20",
  },
  blue: {
    tile: "bg-blue-500/10 text-blue-700 dark:text-blue-200 border-blue-500/20",
    line: "bg-blue-700",
    dot: "bg-blue-700",
    text: "text-blue-700 dark:text-blue-200",
    soft: "bg-blue-500/10 text-blue-700 dark:text-blue-200 border-blue-500/20",
  },
  emerald: {
    tile: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 border-emerald-500/20",
    line: "bg-emerald-600",
    dot: "bg-emerald-600",
    text: "text-emerald-700 dark:text-emerald-200",
    soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 border-emerald-500/20",
  },
  amber: {
    tile: "bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-500/20",
    line: "bg-amber-600",
    dot: "bg-amber-600",
    text: "text-amber-700 dark:text-amber-200",
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-500/20",
  },
  rose: {
    tile: "bg-rose-500/10 text-rose-700 dark:text-rose-200 border-rose-500/20",
    line: "bg-rose-600",
    dot: "bg-rose-600",
    text: "text-rose-700 dark:text-rose-200",
    soft: "bg-rose-500/10 text-rose-700 dark:text-rose-200 border-rose-500/20",
  },
  slate: {
    tile: "bg-slate-500/10 text-slate-700 dark:text-slate-200 border-slate-500/20",
    line: "bg-slate-600",
    dot: "bg-slate-600",
    text: "text-slate-700 dark:text-slate-200",
    soft: "bg-slate-500/10 text-slate-700 dark:text-slate-200 border-slate-500/20",
  },
};

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  badge,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="admin-page-head">
      <div className="relative z-10 flex items-start gap-4 min-w-0">
        {Icon && (
          <div className="admin-icon-tile border-sky-800/20 bg-sky-800/10 text-sky-900 dark:text-sky-200">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-sky-800 dark:text-sky-300">
              <span className="h-1 w-1 rounded-full bg-sky-800" />
              {eyebrow}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1
              className="text-[1.45rem] font-black leading-tight tracking-tight sm:text-[1.7rem]"
              style={{ color: "var(--a-text)" }}
            >
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p
              className="mt-1.5 max-w-3xl text-xs leading-relaxed sm:text-[0.8rem]"
              style={{ color: "var(--a-muted)" }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2.5 sm:ml-auto">
          {actions}
        </div>
      )}
    </header>
  );
}

export function AdminStatCard({
  label,
  value,
  suffix,
  hint,
  icon: Icon,
  tone = "sky",
  badge,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  badge?: React.ReactNode;
}) {
  const t = toneMap[tone];
  return (
    <div className="admin-kpi group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[10px] font-extrabold uppercase tracking-[0.16em]"
            style={{ color: "var(--a-faint)" }}
          >
            {label}
          </p>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span
              className="font-mono text-[1.85rem] font-black leading-none tracking-tight"
              style={{ color: "var(--a-text)" }}
            >
              {value}
            </span>
            {suffix && (
              <span className="text-[11px] font-bold" style={{ color: "var(--a-faint)" }}>
                {suffix}
              </span>
            )}
          </div>
        </div>
        <div className={cx("admin-icon-tile", t.tile)}>
          <Icon className="h-[1.15rem] w-[1.15rem]" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="min-w-0 text-[11px] leading-relaxed" style={{ color: "var(--a-muted)" }}>
          {hint}
        </div>
        {badge}
      </div>
    </div>
  );
}

export function AdminPanel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  noPadding,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}) {
  return (
    <section className={cx("admin-panel overflow-hidden rounded-3xl", className)}>
      {(title || action) && (
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4 sm:px-6"
          style={{ borderColor: "var(--a-border)" }}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
              <span className="mt-0.5 text-sky-800 dark:text-sky-300">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              <h2
                className="truncate text-[0.85rem] font-extrabold tracking-tight"
                style={{ color: "var(--a-text)" }}
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--a-faint)" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cx(!noPadding && "p-5 sm:p-6", bodyClassName)}>{children}</div>
    </section>
  );
}

export function AdminBadge({
  children,
  tone = "slate",
  dot,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
}) {
  const t = toneMap[tone];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide",
        t.soft
      )}
    >
      {dot && <span className={cx("h-1.5 w-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}

export function AdminEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-800/15 bg-sky-800/5 text-sky-800">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-bold" style={{ color: "var(--a-text)" }}>
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-xs text-[11px] leading-relaxed" style={{ color: "var(--a-faint)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AdminSpinner({ label = "正在加载数据..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div className="relative h-10 w-10">
        <span className="absolute inset-0 rounded-full border-2 border-sky-800/20" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-sky-800" />
      </div>
      <p className="text-xs font-semibold" style={{ color: "var(--a-muted)" }}>
        {label}
      </p>
    </div>
  );
}

export function AdminModal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="admin-modal-backdrop" onMouseDown={onClose}>
      <div
        className={cx("admin-modal admin-fade-up", maxWidth)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-6 py-4"
          style={{ borderColor: "var(--a-border)" }}
        >
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-800/20 bg-sky-800/10 text-sky-900 dark:text-sky-300">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <div>
              <h3 className="text-sm font-extrabold" style={{ color: "var(--a-text)" }}>
                {title}
              </h3>
              {subtitle && (
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--a-faint)" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-lg leading-none transition-colors hover:bg-slate-500/10"
            style={{ color: "var(--a-faint)" }}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div
            className="flex justify-end gap-2 border-t px-6 py-4"
            style={{ borderColor: "var(--a-border)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center gap-1 text-[11px] font-extrabold text-sky-900 transition-colors hover:text-sky-800 dark:text-sky-300",
        className
      )}
    >
      {children}
      <ArrowUpRight className="h-3 w-3" />
    </Link>
  );
}
