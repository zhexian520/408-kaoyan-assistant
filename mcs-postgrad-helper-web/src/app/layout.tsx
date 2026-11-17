import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AuthProvider } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import ApiAuthInterceptor from "@/components/ApiAuthInterceptor";

export const metadata: Metadata = {
  title: "408 计算机考研助手",
  description: "面向全国硕士研究生统一招生考试计算机学科专业基础综合 (408) 的全真研炼与智能备考平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem('408_theme');var dark=saved?saved==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var root=document.documentElement;root.classList.toggle('dark',dark);root.style.colorScheme=dark?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased selection:bg-blue-500 selection:text-white">
        <AuthProvider>
          <ApiAuthInterceptor />
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
