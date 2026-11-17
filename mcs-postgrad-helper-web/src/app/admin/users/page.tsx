"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  Plus,
  Key,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  School,
  Target,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserCog,
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

interface UserItem {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  email: string;
  phone: string;
  targetSchool: string;
  targetScore: number;
  examYear?: number;
  prepStage: string;
  status: number;
  roleCode: string;
  createdAt: string;
}

const PREP_STAGE_LABELS: Record<string, string> = {
  BASIC: "基础阶段",
  INTENSIVE: "强化冲刺",
  TRUE_EXAMS: "真题攻坚",
  SPRINT: "终极冲刺",
};

export default function AdminUsersPage() {
  const { user, isAdmin } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [pageNum, setPageNum] = useState(1);
  const pageSize = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    nickname: "",
    email: "",
    phone: "",
    targetSchool: "浙江大学",
    targetScore: 125,
    examYear: 2026,
    roleCode: "ROLE_USER",
  });

  const [editForm, setEditForm] = useState({
    nickname: "",
    email: "",
    phone: "",
    targetSchool: "",
    targetScore: 120,
    examYear: 2026,
    prepStage: "BASIC",
    roleCode: "ROLE_USER",
    status: 1,
  });

  const fetchUsers = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.append("keyword", keyword.trim());
      if (statusFilter !== "") params.append("status", statusFilter);
      if (roleFilter !== "") params.append("roleCode", roleFilter);
      params.append("pageNum", String(pageNum));
      params.append("pageSize", String(pageSize));

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const json = await res.json();
      if (json.code === 200 && json.data) {
        setUsers(json.data.list || []);
        setTotal(json.data.total || 0);
      } else {
        alert(json.message || "获取用户列表失败");
      }
    } catch (err) {
      console.error("加载用户列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [pageNum, statusFilter, roleFilter, isAdmin]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPageNum(1);
    fetchUsers();
  };

  const toggleUserStatus = async (targetUser: UserItem) => {
    if (targetUser.id === user?.userId) {
      alert("不能修改当前登录管理员自己的账号状态");
      return;
    }
    const nextStatus = targetUser.status === 1 ? 0 : 1;
    const actionText = nextStatus === 1 ? "解封启用" : "禁用封禁";
    if (!window.confirm(`确定要对账号【${targetUser.username}】进行【${actionText}】操作吗？`)) return;

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, status: nextStatus } : u))
        );
      } else {
        alert(json.message || "修改状态失败");
      }
    } catch (err) {
      console.error("修改用户状态失败:", err);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      alert("新密码至少6位");
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const json = await res.json();
      if (json.code === 200) {
        alert(`账号【${selectedUser.username}】密码已重置为: ${newPassword}`);
        setShowResetPwdModal(false);
        setNewPassword("");
      } else {
        alert(json.message || "密码重置失败");
      }
    } catch (err) {
      console.error("重置密码失败:", err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username.trim() || !createForm.password.trim()) {
      alert("用户名和密码不能为空");
      return;
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (json.code === 200) {
        alert("新建用户成功");
        setShowCreateModal(false);
        setCreateForm({
          username: "",
          password: "",
          nickname: "",
          email: "",
          phone: "",
          targetSchool: "浙江大学",
          targetScore: 125,
          examYear: 2026,
          roleCode: "ROLE_USER",
        });
        fetchUsers();
      } else {
        alert(json.message || "创建失败");
      }
    } catch (err) {
      console.error("创建用户异常:", err);
    }
  };

  const openEditModal = (targetUser: UserItem) => {
    setSelectedUser(targetUser);
    setEditForm({
      nickname: targetUser.nickname || "",
      email: targetUser.email || "",
      phone: targetUser.phone || "",
      targetSchool: targetUser.targetSchool || "",
      targetScore: targetUser.targetScore || 120,
      examYear: targetUser.examYear || 2026,
      prepStage: targetUser.prepStage || "BASIC",
      roleCode: targetUser.roleCode || "ROLE_USER",
      status: targetUser.status,
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.code === 200) {
        alert("更新成功");
        setShowEditModal(false);
        fetchUsers();
      } else {
        alert(json.message || "更新失败");
      }
    } catch (err) {
      console.error("更新用户失败:", err);
    }
  };

  const handleDeleteUser = async (targetUser: UserItem) => {
    if (targetUser.id === user?.userId) {
      alert("不能删除当前登录的管理员账号");
      return;
    }
    if (targetUser.id === 1) {
      alert("初始超级管理员不可删除");
      return;
    }
    if (!window.confirm(`确定要彻底删除用户【${targetUser.username}】吗？删除后该用户的所有测评记录将一并清空！`)) return;

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        alert("删除成功");
        fetchUsers();
      } else {
        alert(json.message || "删除失败");
      }
    } catch (err) {
      console.error("删除用户失败:", err);
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const activeCount = users.filter((u) => u.status === 1).length;
  const adminCount = users.filter((u) => u.roleCode === "ROLE_ADMIN").length;
  const bannedCount = users.filter((u) => u.status === 0).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow="用户与权限"
        title="全站用户与权限管理"
        description="统一监管考研考生与管理员账号状态、重置密码、权限分配及备考档案维护，保障平台账号安全与数据合规。"
        icon={ShieldCheck}
        badge={<AdminBadge tone="sky" dot>超级管理员</AdminBadge>}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="admin-btn admin-btn-primary">
            <Plus className="h-4 w-4" />
            新建用户账号
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <AdminStatCard
          label="注册总人数"
          value={total}
          suffix="人"
          icon={Users}
          tone="sky"
          hint="平台全部注册账号"
        />
        <AdminStatCard
          label="本页正常账号"
          value={activeCount}
          suffix="人"
          icon={UserCheck}
          tone="emerald"
          hint="状态正常、可正常登录"
        />
        <AdminStatCard
          label="管理员账号"
          value={adminCount}
          suffix="人"
          icon={ShieldCheck}
          tone="blue"
          hint="拥有后台管理权限"
        />
        <AdminStatCard
          label="本页封禁账号"
          value={bannedCount}
          suffix="人"
          icon={UserX}
          tone="rose"
          hint="已禁用登录权限"
        />
      </div>

      <AdminPanel
        title="用户检索与筛选"
        subtitle="按账号状态、角色权限与关键词快速定位用户"
        icon={Filter}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                账号状态
              </span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPageNum(1);
                }}
                className="admin-select admin-select-sm w-auto text-[11px]"
              >
                <option value="">全部状态</option>
                <option value="1">正常启用</option>
                <option value="0">已禁用封禁</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                角色权限
              </span>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPageNum(1);
                }}
                className="admin-select admin-select-sm w-auto text-[11px]"
              >
                <option value="">全部角色</option>
                <option value="ROLE_USER">普通学生</option>
                <option value="ROLE_ADMIN">系统管理员</option>
              </select>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex w-full items-center gap-2 lg:w-auto">
            <div className="admin-search flex-1 lg:w-80">
              <Search className="h-3.5 w-3.5" />
              <input
                type="text"
                placeholder="搜索用户名 / 昵称 / 目标院校..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm shrink-0">
              搜索
            </button>
          </form>
        </div>
      </AdminPanel>

      <AdminPanel
        title="用户数据列表"
        subtitle={`共 ${total} 个账号 · 当前第 ${pageNum} 页`}
        icon={UserCog}
        action={<AdminBadge tone="emerald" dot>数据已同步</AdminBadge>}
        noPadding
      >
        {loading ? (
          <AdminSpinner label="正在拉取用户数据..." />
        ) : users.length === 0 ? (
          <AdminEmptyState
            title="暂无符合条件的用户"
            description="可以调整筛选条件，或新建一个用户账号。"
            icon={Users}
            action={
              <button onClick={() => setShowCreateModal(true)} className="admin-btn admin-btn-primary admin-btn-sm">
                <Plus className="h-3.5 w-3.5" />
                新建用户
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[980px]">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户名与昵称</th>
                  <th>角色权限</th>
                  <th>目标院校与分数</th>
                  <th>备考阶段</th>
                  <th>账号状态</th>
                  <th>注册时间</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="font-mono text-[10px] font-bold" style={{ color: "var(--a-faint)" }}>
                        #{u.id}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                          alt={u.username}
                          className="h-8 w-8 rounded-xl border border-[var(--a-border)] bg-sky-800/5"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-extrabold" style={{ color: "var(--a-text)" }}>
                            {u.username}
                          </p>
                          <p className="truncate text-[10px]" style={{ color: "var(--a-faint)" }}>
                            {u.nickname || "未设昵称"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.roleCode === "ROLE_ADMIN" ? (
                        <AdminBadge tone="sky">
                          <ShieldCheck className="h-3 w-3" /> 超级管理员
                        </AdminBadge>
                      ) : (
                        <AdminBadge tone="blue">考研学生</AdminBadge>
                      )}
                    </td>
                    <td>
                      {u.roleCode === "ROLE_ADMIN" ? (
                        <span className="text-[10px] font-bold" style={{ color: "var(--a-faint)" }}>
                          平台管理账号 · 无备考档案
                        </span>
                      ) : u.targetSchool ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-md border border-blue-500/15 bg-blue-500/10 px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-blue-600 dark:text-blue-300">
                              {u.examYear || 2026} 年
                            </span>
                            <span className="text-[11px] font-bold" style={{ color: "var(--a-text)" }}>
                              {u.targetSchool}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px]" style={{ color: "var(--a-faint)" }}>
                            目标 <strong className="font-mono text-blue-600 dark:text-blue-300">{u.targetScore || 120}</strong> 分
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px]" style={{ color: "var(--a-faint)" }}>
                          未设置
                        </span>
                      )}
                    </td>
                    <td>
                      {u.roleCode === "ROLE_ADMIN" ? (
                        <span className="text-[10px]" style={{ color: "var(--a-faint)" }}>—</span>
                      ) : (
                        <span className="text-[11px]" style={{ color: "var(--a-muted)" }}>
                          {PREP_STAGE_LABELS[u.prepStage] || u.prepStage || "-"}
                        </span>
                      )}
                    </td>
                    <td>
                      {u.status === 1 ? (
                        <AdminBadge tone="emerald" dot>
                          正常启用
                        </AdminBadge>
                      ) : (
                        <AdminBadge tone="rose" dot>
                          已禁用
                        </AdminBadge>
                      )}
                    </td>
                    <td>
                      <span className="font-mono text-[10px]" style={{ color: "var(--a-faint)" }}>
                        {u.createdAt ? u.createdAt.slice(0, 10) : "-"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleUserStatus(u)}
                          disabled={u.id === user?.userId}
                          className={`admin-btn admin-btn-sm ${
                            u.status === 1 ? "admin-btn-danger" : "admin-btn-ghost"
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                          title={u.id === user?.userId ? "不能修改当前登录账号状态" : u.status === 1 ? "禁用账号" : "解封账号"}
                        >
                          {u.status === 1 ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          {u.status === 1 ? "禁用" : "解封"}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setNewPassword("123456");
                            setShowResetPwdModal(true);
                          }}
                          className="admin-btn admin-btn-ghost admin-btn-sm"
                          title="重置密码"
                        >
                          <Key className="h-3.5 w-3.5" />
                          重置
                        </button>
                        <button
                          onClick={() => openEditModal(u)}
                          className="admin-btn admin-btn-ghost admin-btn-sm"
                          title="编辑用户"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          编辑
                        </button>
                        {u.id !== 1 && u.id !== user?.userId && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                            title="删除用户"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3.5 text-[11px]"
            style={{ borderColor: "var(--a-border)", color: "var(--a-muted)" }}
          >
            <span>
              共 {total} 条数据 · 每页 {pageSize} 条
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pageNum === 1}
                onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                className="admin-btn admin-btn-ghost admin-btn-sm disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                上一页
              </button>
              <span className="rounded-lg border border-[var(--a-border)] px-2.5 py-1 font-mono font-bold" style={{ color: "var(--a-text)" }}>
                {pageNum} / {totalPages}
              </span>
              <button
                disabled={pageNum === totalPages}
                onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))}
                className="admin-btn admin-btn-ghost admin-btn-sm disabled:opacity-40"
              >
                下一页
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </AdminPanel>

      {/* Reset password modal */}
      <AdminModal
        open={showResetPwdModal && !!selectedUser}
        onClose={() => setShowResetPwdModal(false)}
        title={`重置密码：${selectedUser?.username || ""}`}
        subtitle="重置后该用户将使用新密码登录"
        icon={Key}
        footer={
          <>
            <button onClick={() => setShowResetPwdModal(false)} className="admin-btn admin-btn-ghost">
              取消
            </button>
            <button onClick={handleResetPassword} className="admin-btn admin-btn-primary">
              确认重置
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
              新密码
            </label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少 6 位）"
              className="admin-input font-mono"
            />
          </div>
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
            请妥善保管并告知用户新密码，建议首次登录后立即修改。
          </div>
        </div>
      </AdminModal>

      {/* Create user modal */}
      <AdminModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新建用户档案"
        subtitle="创建学员或管理员账号"
        icon={Plus}
        maxWidth="max-w-xl"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="admin-btn admin-btn-ghost">
              取消
            </button>
            <button type="submit" form="create-user-form" className="admin-btn admin-btn-primary">
              确认创建
            </button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                登录用户名 *
              </label>
              <input
                type="text"
                required
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="请输入用户名"
                className="admin-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                登录密码 *
              </label>
              <input
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="请输入密码（至少 6 位）"
                className="admin-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
              考生昵称
            </label>
            <input
              type="text"
              value={createForm.nickname}
              onChange={(e) => setCreateForm({ ...createForm, nickname: e.target.value })}
              placeholder="如：计组高分突击手"
              className="admin-input"
            />
          </div>

          {createForm.roleCode === "ROLE_USER" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                  考研年份
                </label>
                <select
                  value={createForm.examYear}
                  onChange={(e) => setCreateForm({ ...createForm, examYear: Number(e.target.value) })}
                  className="admin-select"
                >
                  <option value={2025}>2025 年</option>
                  <option value={2026}>2026 年</option>
                  <option value={2027}>2027 年</option>
                  <option value={2028}>2028 年</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                  目标院校
                </label>
                <input
                  type="text"
                  value={createForm.targetSchool}
                  onChange={(e) => setCreateForm({ ...createForm, targetSchool: e.target.value })}
                  className="admin-input"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                  目标分数
                </label>
                <input
                  type="number"
                  value={createForm.targetScore}
                  onChange={(e) => setCreateForm({ ...createForm, targetScore: Number(e.target.value) })}
                  className="admin-input font-mono"
                />
              </div>
            </div>
          )}

          {createForm.roleCode === "ROLE_ADMIN" && (
            <div className="rounded-xl border border-sky-500/15 bg-sky-500/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-sky-700 dark:text-sky-300">
              管理员是平台运维身份，不需要填写目标院校、目标分数与备考阶段。
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
              角色权限
            </label>
            <select
              value={createForm.roleCode}
              onChange={(e) => setCreateForm({ ...createForm, roleCode: e.target.value })}
              className="admin-select"
            >
              <option value="ROLE_USER">普通学生</option>
              <option value="ROLE_ADMIN">系统管理员</option>
            </select>
          </div>
        </form>
      </AdminModal>

      {/* Edit user modal */}
      <AdminModal
        open={showEditModal && !!selectedUser}
        onClose={() => setShowEditModal(false)}
        title={`编辑用户：${selectedUser?.username || ""}`}
        subtitle="修改账号信息与角色权限"
        icon={Edit3}
        maxWidth="max-w-xl"
        footer={
          <>
            <button onClick={() => setShowEditModal(false)} className="admin-btn admin-btn-ghost">
              取消
            </button>
            <button type="submit" form="edit-user-form" className="admin-btn admin-btn-primary">
              保存修改
            </button>
          </>
        }
      >
        <form id="edit-user-form" onSubmit={handleUpdateUser} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
              昵称
            </label>
            <input
              type="text"
              value={editForm.nickname}
              onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
              className="admin-input"
            />
          </div>

          {editForm.roleCode === "ROLE_USER" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                  考研年份
                </label>
                <select
                  value={editForm.examYear}
                  onChange={(e) => setEditForm({ ...editForm, examYear: Number(e.target.value) })}
                  className="admin-select"
                >
                  <option value={2025}>2025 年</option>
                  <option value={2026}>2026 年</option>
                  <option value={2027}>2027 年</option>
                  <option value={2028}>2028 年</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                  目标院校
                </label>
                <input
                  type="text"
                  value={editForm.targetSchool}
                  onChange={(e) => setEditForm({ ...editForm, targetSchool: e.target.value })}
                  className="admin-input"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                  目标分数
                </label>
                <input
                  type="number"
                  value={editForm.targetScore}
                  onChange={(e) => setEditForm({ ...editForm, targetScore: Number(e.target.value) })}
                  className="admin-input font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                角色权限
              </label>
              <select
                value={editForm.roleCode}
                onChange={(e) => setEditForm({ ...editForm, roleCode: e.target.value })}
                disabled={selectedUser?.id === user?.userId}
                className="admin-select disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="ROLE_USER">普通学生</option>
                <option value="ROLE_ADMIN">系统管理员</option>
              </select>
              {selectedUser?.id === user?.userId && (
                <p className="text-[9px]" style={{ color: "var(--a-faint)" }}>
                  当前登录管理员不能取消自己的管理权限
                </p>
              )}
            </div>
            {editForm.roleCode === "ROLE_USER" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold" style={{ color: "var(--a-muted)" }}>
                  备考阶段
                </label>
                <select
                  value={editForm.prepStage}
                  onChange={(e) => setEditForm({ ...editForm, prepStage: e.target.value })}
                  className="admin-select"
                >
                  <option value="BASIC">基础阶段</option>
                  <option value="INTENSIVE">强化冲刺</option>
                  <option value="TRUE_EXAMS">真题攻坚</option>
                  <option value="SPRINT">终极冲刺</option>
                </select>
              </div>
            )}
          </div>

          {editForm.roleCode === "ROLE_ADMIN" && (
            <div className="rounded-xl border border-sky-500/15 bg-sky-500/[0.06] px-3 py-2.5 text-[10px] leading-relaxed text-sky-700 dark:text-sky-300">
              管理员账号不保存考研目标、目标分数与备考阶段，相关字段已自动隐藏。
            </div>
          )}
        </form>
      </AdminModal>
    </div>
  );
}
