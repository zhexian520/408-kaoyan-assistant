package com.example.mcs.controller;

import com.example.mcs.common.Result;
import com.example.mcs.service.AdminDashboardService;
import com.example.mcs.util.JwtUtil;
import com.example.mcs.vo.AdminDashboardVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    private void checkAdminPermission(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        String role = JwtUtil.getRoleCode(token);
        if (!"ROLE_ADMIN".equalsIgnoreCase(role)) {
            throw new SecurityException("无权访问：仅管理员可查看后台全景仪表盘");
        }
    }

    @GetMapping("/stats")
    public Result<AdminDashboardVO> getDashboardStats(@RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            return Result.success(adminDashboardService.getDashboardStats());
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "获取管理员仪表盘数据失败：" + e.getMessage());
        }
    }
}

