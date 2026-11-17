package com.example.mcs.controller;

import com.example.mcs.common.Result;
import com.example.mcs.service.UserDashboardService;
import com.example.mcs.util.JwtUtil;
import com.example.mcs.vo.UserDashboardVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user/dashboard")
@RequiredArgsConstructor
public class UserDashboardController {

    private final UserDashboardService userDashboardService;

    @GetMapping("/stats")
    public Result<UserDashboardVO> getUserDashboardStats(@RequestHeader(value = "Authorization", required = false) String token) {
        Long userId = JwtUtil.getUserIdFromAuthorization(token);
        if (userId == null) {
            userId = 2L; // 本地演示兼容
        }
        return Result.success(userDashboardService.getUserDashboardStats(userId));
    }

    @PutMapping("/target")
    public Result<UserDashboardVO> updateUserTarget(@RequestHeader(value = "Authorization", required = false) String token,
                                                    @RequestBody java.util.Map<String, Object> body) {
        Long userId = null;
        if (token != null && token.startsWith("Bearer ")) {
            userId = JwtUtil.getUserId(token.substring(7));
        }
        if (userId == null) {
            userId = 2L;
        }

        String targetSchool = body.get("targetSchool") != null ? body.get("targetSchool").toString() : null;
        Integer targetScore = body.get("targetScore") != null ? Integer.parseInt(body.get("targetScore").toString()) : null;
        Integer examYear = body.get("examYear") != null ? Integer.parseInt(body.get("examYear").toString()) : null;
        String prepStage = body.get("prepStage") != null ? body.get("prepStage").toString() : null;

        userDashboardService.updateUserTarget(userId, targetSchool, targetScore, examYear, prepStage);
        return Result.success("目标配置更新成功", userDashboardService.getUserDashboardStats(userId));
    }
}

