package com.example.mcs.controller;

import com.example.mcs.common.PageResult;
import com.example.mcs.common.Result;
import com.example.mcs.dto.UserAdminQueryDTO;
import com.example.mcs.dto.UserUpdateDTO;
import com.example.mcs.entity.SysUser;
import com.example.mcs.service.AdminUserService;
import com.example.mcs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    private void checkAdminPermission(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        String role = JwtUtil.getRoleCode(token);
        if (!"ROLE_ADMIN".equalsIgnoreCase(role)) {
            throw new SecurityException("无权访问：仅管理员可进行后台用户管理");
        }
    }

    @GetMapping
    public Result<PageResult<SysUser>> getUserList(UserAdminQueryDTO query,
                                                   @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            return Result.success(adminUserService.getUserList(query));
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public Result<SysUser> getUserById(@PathVariable Long id,
                                       @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            SysUser user = adminUserService.getUserById(id);
            if (user == null) return Result.error(404, "用户不存在");
            return Result.success(user);
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        }
    }

    @PutMapping("/{id}/status")
    public Result<Boolean> updateUserStatus(@PathVariable Long id,
                                            @RequestBody Map<String, Integer> body,
                                            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            Long currentUserId = JwtUtil.getUserIdFromAuthorization(token);
            if (currentUserId != null && currentUserId.equals(id)) {
                return Result.error(400, "不能修改当前登录管理员自己的账号状态");
            }
            Integer status = body.get("status");
            if (status == null) status = 1;
            boolean ok = adminUserService.updateUserStatus(id, status);
            return Result.success(status == 1 ? "账号已解封启用" : "账号已被禁用封禁", ok);
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        }
    }

    @PutMapping("/{id}/reset-password")
    public Result<Boolean> resetPassword(@PathVariable Long id,
                                         @RequestBody Map<String, String> body,
                                         @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            String newPassword = body.get("password");
            if (newPassword == null || newPassword.trim().length() < 6) {
                return Result.error(400, "新密码长度至少6位");
            }
            boolean ok = adminUserService.resetPassword(id, newPassword);
            return Result.success("密码重置成功", ok);
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public Result<Boolean> updateUser(@PathVariable Long id,
                                      @RequestBody UserUpdateDTO dto,
                                      @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            Long currentUserId = JwtUtil.getUserIdFromAuthorization(token);
            if (currentUserId != null && currentUserId.equals(id)) {
                if (dto.getStatus() != null && dto.getStatus() != 1) {
                    return Result.error(400, "不能禁用当前登录管理员自己的账号");
                }
                if (dto.getRoleCode() != null && !"ROLE_ADMIN".equalsIgnoreCase(dto.getRoleCode())) {
                    return Result.error(400, "不能取消当前登录管理员自己的管理权限");
                }
            }
            boolean ok = adminUserService.updateUser(id, dto);
            return Result.success("用户信息更新成功", ok);
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        }
    }

    @PostMapping
    public Result<Boolean> createUser(@RequestBody Map<String, Object> body,
                                      @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            String roleCode = (String) body.getOrDefault("roleCode", "ROLE_USER");
            boolean isAdminRole = "ROLE_ADMIN".equalsIgnoreCase(roleCode);
            SysUser user = SysUser.builder()
                    .username((String) body.get("username"))
                    .password((String) body.get("password"))
                    .nickname((String) body.get("nickname"))
                    .email((String) body.get("email"))
                    .phone((String) body.get("phone"))
                    .targetSchool(isAdminRole ? null : (String) body.get("targetSchool"))
                    .targetScore(isAdminRole ? null : (body.get("targetScore") != null ? Integer.parseInt(body.get("targetScore").toString()) : 120))
                    .build();
            boolean ok = adminUserService.createUser(user, roleCode);
            return Result.success("新建用户成功", ok);
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        } catch (Exception e) {
            return Result.error(400, e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public Result<Boolean> deleteUser(@PathVariable Long id,
                                      @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            Long currentUserId = JwtUtil.getUserIdFromAuthorization(token);
            if (currentUserId != null && currentUserId.equals(id)) {
                return Result.error(400, "不能删除当前登录的管理员账号");
            }
            if (id == 1L) {
                return Result.error(400, "初始超级管理员账号不可删除");
            }
            boolean ok = adminUserService.deleteUser(id);
            return Result.success("用户删除成功", ok);
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        }
    }
}

