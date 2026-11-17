package com.example.mcs.controller;

import com.example.mcs.common.Result;
import com.example.mcs.service.StudyPlanService;
import com.example.mcs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user/study-plan")
@RequiredArgsConstructor
public class StudyPlanController {

    private final StudyPlanService studyPlanService;

    private Long resolveUserId(String authorization) {
        Long userId = JwtUtil.getUserIdFromAuthorization(authorization);
        // 本地演示兼容：没有携带 Token 时回退到学生账号，避免接口直接不可用。
        return userId != null ? userId : 2L;
    }

    @GetMapping
    public Result<Map<String, Object>> getActivePlan(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = resolveUserId(authorization);
        return Result.success(studyPlanService.getPlanData(userId));
    }

    @PostMapping("/generate")
    public Result<Map<String, Object>> generateNewPlan(
            @RequestBody(required = false) Map<String, Object> params,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = resolveUserId(authorization);
        return Result.success("个性化备考规划已根据你的目标与真实学习数据重新生成",
                studyPlanService.generatePlan(userId));
    }

    @PostMapping("/tasks")
    public Result<Map<String, Object>> addTask(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = resolveUserId(authorization);
        try {
            return Result.success("已加入个性化备考规划",
                    studyPlanService.addRemedialTask(userId, body != null ? body : Map.of()));
        } catch (Exception e) {
            return Result.error(500, e.getMessage() != null ? e.getMessage() : "加入学习计划失败");
        }
    }

    @PutMapping("/tasks/{id}/complete")
    public Result<Boolean> toggleTaskCompletion(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = resolveUserId(authorization);
        int isCompleted = body.getOrDefault("isCompleted", 1);
        boolean updated = studyPlanService.toggleTask(userId, id, isCompleted);
        if (!updated) {
            return Result.error(400, "该任务由学习数据自动统计，不能手动勾选");
        }
        return Result.success(true);
    }
}
