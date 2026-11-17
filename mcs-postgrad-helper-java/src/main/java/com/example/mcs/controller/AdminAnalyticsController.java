package com.example.mcs.controller;

import com.example.mcs.common.Result;
import com.example.mcs.mapper.AdminAnalyticsMapper;
import com.example.mcs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final AdminAnalyticsMapper adminAnalyticsMapper;

    private void checkAdminPermission(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        String role = JwtUtil.getRoleCode(token);
        if (!"ROLE_ADMIN".equalsIgnoreCase(role)) {
            throw new SecurityException("无权访问：仅管理员可查看全站分析");
        }
    }

    @GetMapping("/overview")
    public Result<Map<String, Object>> getOverview(
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("totals", adminAnalyticsMapper.selectPlatformTotals());
            res.put("subjectStats", adminAnalyticsMapper.selectSubjectAccuracy());
            res.put("topChapters", adminAnalyticsMapper.selectTopWeakChapters(8));
            res.put("topWrongQuestions", adminAnalyticsMapper.selectTopWrongQuestions(4));
            res.put("dailyActivity", adminAnalyticsMapper.selectDailyActivity(14));
            return Result.success(res);
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "获取全站分析失败：" + e.getMessage());
        }
    }
}
