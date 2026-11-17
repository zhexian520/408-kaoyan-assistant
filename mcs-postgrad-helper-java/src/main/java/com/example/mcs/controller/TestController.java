package com.example.mcs.controller;

import com.example.mcs.common.Result;
import com.example.mcs.dto.ExamSubmitDTO;
import com.example.mcs.entity.TestRecord;
import com.example.mcs.entity.UserWrongQuestion;
import com.example.mcs.mapper.TestRecordMapper;
import com.example.mcs.service.TestService;
import com.example.mcs.util.JwtUtil;
import com.example.mcs.vo.TestGradingResultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController {

    private final TestService testService;
    private final TestRecordMapper testRecordMapper;

    private Long resolveUserId(String authorization, Long fallback) {
        Long uid = JwtUtil.getUserIdFromAuthorization(authorization);
        if (uid != null) return uid;
        return fallback != null ? fallback : 1L;
    }

    @PostMapping("/submit")
    public Result<TestGradingResultVO> submitExam(@RequestBody ExamSubmitDTO submitDTO,
                                                  @RequestHeader(value = "Authorization", required = false) String authorization) {
        // 始终以登录态为准，避免前端固定 userId 造成串号。
        submitDTO.setUserId(resolveUserId(authorization, submitDTO.getUserId()));
        TestGradingResultVO result = testService.submitExam(submitDTO);
        return Result.success("交卷成功，智能批改完成", result);
    }

    @GetMapping("/report/{testRecordId}")
    public Result<TestGradingResultVO> getTestReport(@PathVariable Long testRecordId,
                                                     @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = JwtUtil.getUserIdFromAuthorization(authorization);
        TestRecord record = testRecordMapper.selectById(testRecordId);
        if (record == null) {
            return Result.error(404, "测评报告未找到");
        }
        if (userId != null && record.getUserId() != null && !userId.equals(record.getUserId())) {
            return Result.error(403, "无权查看其他用户的测评报告");
        }
        TestGradingResultVO report = testService.getTestReport(testRecordId);
        if (report == null) {
            return Result.error(404, "测评报告未找到");
        }
        return Result.success(report);
    }

    @GetMapping("/records")
    public Result<List<TestRecord>> getUserTestRecords(
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long resolved = resolveUserId(authorization, userId);
        return Result.success(testService.getUserTestRecords(resolved));
    }

    @GetMapping("/wrong-questions")
    public Result<List<UserWrongQuestion>> getUserWrongQuestions(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String subjectCode,
            @RequestParam(required = false) String masterStatus,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long resolved = resolveUserId(authorization, userId);
        return Result.success(testService.getUserWrongQuestions(resolved, subjectCode, masterStatus));
    }

    @DeleteMapping("/wrong-questions")
    public Result<String> clearWrongQuestions(
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long resolved = resolveUserId(authorization, userId);
        testService.clearUserWrongQuestions(resolved);
        return Result.success("错题本已成功清空");
    }

    @PutMapping("/wrong-questions/{id}/master")
    public Result<String> updateWrongQuestionMasterStatus(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long resolved = resolveUserId(authorization, null);
        String status = body != null ? body.getOrDefault("masterStatus", "MASTERED") : "MASTERED";
        boolean updated = testService.updateWrongQuestionMasterStatus(resolved, id, status);
        return updated ? Result.success("错题掌握状态已更新") : Result.error(404, "错题记录不存在");
    }

    @DeleteMapping("/wrong-questions/{id}")
    public Result<String> deleteWrongQuestion(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long resolved = resolveUserId(authorization, userId);
        boolean removed = testService.deleteWrongQuestion(resolved, id);
        return removed ? Result.success("错题已移出") : Result.error(404, "错题记录不存在");
    }
}
