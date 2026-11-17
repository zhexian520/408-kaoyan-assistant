"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface UserInfo {
  userId: number;
  username: string;
  nickname: string;
  avatar: string;
  roleCode: "ROLE_ADMIN" | "ROLE_USER" | string;
  targetSchool?: string;
  targetScore?: number;
  examYear?: number;
  prepStage?: string;
  token: string;
}

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<UserInfo | null>;
  register: (data: {
    username: string;
    password: string;
    nickname?: string;
    targetSchool?: string;
    targetScore?: number;
    examYear?: number;
  }) => Promise<boolean>;
  updateUserTarget: (data: {
    targetSchool?: string;
    targetScore?: number;
    examYear?: number;
    prepStage?: string;
  }) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => null,
  register: async () => false,
  updateUserTarget: async () => false,
  logout: () => {},
  isAdmin: false,
});

export const PUBLIC_PATHS = ["/", "/login", "/register"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 从 localStorage 恢复登录态，并向 Java 网关校验 Token 是否仍然有效
    let cancelled = false;
    const restore = async () => {
      try {
        const stored = localStorage.getItem("408_auth_user");
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (cancelled) return;
        setUser(parsed);

        const token = parsed?.token || localStorage.getItem("408_auth_token") || "";
        if (!token) return;
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 10000);
        try {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          const json = await res.json();
          if (!cancelled && json.code !== 200) {
            localStorage.removeItem("408_auth_user");
            localStorage.removeItem("408_auth_token");
            setUser(null);
          } else if (!cancelled && json.code === 200 && json.data) {
            // 用服务端最新档案覆盖本地缓存，避免目标院校/考研年份修改后仍显示旧值
            const merged = { ...parsed, ...json.data, token: json.data.token || token };
            setUser(merged);
            localStorage.setItem("408_auth_user", JSON.stringify(merged));
            localStorage.setItem("408_auth_token", merged.token);
          }
        } catch {
          // 后端暂时不可用时保留本地登录态，避免离线时被误踢出
        } finally {
          window.clearTimeout(timer);
        }
      } catch (e) {
        console.error("恢复登录态失败:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username: string, password: string): Promise<UserInfo | null> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setUser(json.data);
        localStorage.setItem("408_auth_user", JSON.stringify(json.data));
        localStorage.setItem("408_auth_token", json.data.token);
        return json.data;
      } else {
        alert(json.message || "登录失败，请检查账号密码");
        return null;
      }
    } catch (err) {
      console.error("登录异常:", err);
      alert("登录连接超时，请确认后端已启动");
      return null;
    }
  };

  const register = async (data: {
    username: string;
    password: string;
    nickname?: string;
    targetSchool?: string;
    targetScore?: number;
    examYear?: number;
  }): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setUser(json.data);
        localStorage.setItem("408_auth_user", JSON.stringify(json.data));
        localStorage.setItem("408_auth_token", json.data.token);
        return true;
      } else {
        alert(json.message || "注册失败");
        return false;
      }
    } catch (err) {
      console.error("注册异常:", err);
      alert("注册连接失败");
      return false;
    }
  };

  const updateUserTarget = async (data: {
    targetSchool?: string;
    targetScore?: number;
    examYear?: number;
    prepStage?: string;
  }): Promise<boolean> => {
    try {
      const token = user?.token || localStorage.getItem("408_auth_token") || "";
      const res = await fetch("/api/user/dashboard/target", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.code === 200) {
        // 更新当前本地用户对象
        setUser((prev) => {
          if (!prev) return null;
          const updated = {
            ...prev,
            targetSchool: data.targetSchool !== undefined ? data.targetSchool : prev.targetSchool,
            targetScore: data.targetScore !== undefined ? data.targetScore : prev.targetScore,
            examYear: data.examYear !== undefined ? data.examYear : prev.examYear,
            prepStage: data.prepStage !== undefined ? data.prepStage : prev.prepStage,
          };
          localStorage.setItem("408_auth_user", JSON.stringify(updated));
          return updated;
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("更新目标配置失败:", e);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("408_auth_user");
    localStorage.removeItem("408_auth_token");
    router.push("/login");
  };

  const isAdmin = user?.roleCode === "ROLE_ADMIN";

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateUserTarget, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
