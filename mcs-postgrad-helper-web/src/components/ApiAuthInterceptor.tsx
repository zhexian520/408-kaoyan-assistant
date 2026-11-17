"use client";

import { useEffect } from "react";

/**
 * 给所有发往 Python AI 服务（8000/8010）的请求自动补上 Java 登录态 Token。
 * 这样无需逐个修改页面，也不会覆盖已有的 Authorization 头。
 */
export default function ApiAuthInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const originalFetch = window.fetch;

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input instanceof Request
          ? input.url
          : "";

      let path = url;
      try {
        path = url.startsWith("http") ? new URL(url).pathname : url.split("?")[0];
      } catch {
        path = url;
      }
      const isAiService =
        path.startsWith("/pilot/") ||
        path.startsWith("/ai-api/") ||
        /localhost:8000|127\.0\.0\.1:8000|localhost:8010|127\.0\.0\.1:8010/.test(url);

      if (isAiService) {
        const token = localStorage.getItem("408_auth_token");
        if (token) {
          const headers = new Headers(
            init?.headers || (input instanceof Request ? input.headers : undefined)
          );
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          init = { ...(init || {}), headers };
        }
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
