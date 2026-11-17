package com.example.mcs.controller;

import com.example.mcs.common.PageResult;
import com.example.mcs.common.Result;
import com.example.mcs.dto.QuestionFavoriteDTO;
import com.example.mcs.dto.QuestionQueryDTO;
import com.example.mcs.entity.ExamPaper;
import com.example.mcs.entity.QuestionAttempt;
import com.example.mcs.mapper.QuestionAttemptMapper;
import com.example.mcs.service.ExamService;
import com.example.mcs.util.JwtUtil;
import com.example.mcs.vo.ExamFilterVO;
import com.example.mcs.vo.PaperDetailVO;
import com.example.mcs.vo.QuestionDetailVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;
    private final QuestionAttemptMapper questionAttemptMapper;

    @PostMapping("/attempt")
    public Result<Boolean> recordAttempt(@RequestBody Map<String, Object> body,
                                         @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = JwtUtil.getUserIdFromAuthorization(authorization);
        if (userId == null) {
            userId = body.get("userId") instanceof Number n ? n.longValue() : 1L;
        }
        String questionId = body.get("questionId") != null ? body.get("questionId").toString() : null;
        if (questionId == null || questionId.isBlank()) {
            return Result.error(400, "questionId 不能为空");
        }
        String subjectCode = body.get("subjectCode") != null ? body.get("subjectCode").toString().toUpperCase() : null;
        int isCorrect = body.get("isCorrect") instanceof Boolean b ? (b ? 1 : 0)
                : body.get("isCorrect") instanceof Number n ? (n.intValue() != 0 ? 1 : 0) : 0;
        String userAnswer = body.get("userAnswer") != null ? body.get("userAnswer").toString() : null;
        String sourceType = body.get("sourceType") != null ? body.get("sourceType").toString() : "PRACTICE";
        questionAttemptMapper.insert(QuestionAttempt.builder()
                .userId(userId)
                .questionId(questionId)
                .subjectCode(subjectCode)
                .isCorrect(isCorrect)
                .userAnswer(userAnswer)
                .sourceType(sourceType)
                .build());
        return Result.success(true);
    }

    @PostMapping("/attempt/batch")
    public Result<Integer> recordAttemptBatch(@RequestBody List<Map<String, Object>> body,
                                              @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = JwtUtil.getUserIdFromAuthorization(authorization);
        List<QuestionAttempt> attempts = new java.util.ArrayList<>();
        for (Map<String, Object> item : body) {
            String questionId = item.get("questionId") != null ? item.get("questionId").toString() : null;
            if (questionId == null || questionId.isBlank()) continue;
            Long rowUserId = JwtUtil.getUserIdFromAuthorization(authorization);
            if (rowUserId == null) {
                rowUserId = item.get("userId") instanceof Number n ? n.longValue() : userId != null ? userId : 1L;
            }
            int isCorrect = item.get("isCorrect") instanceof Boolean b ? (b ? 1 : 0)
                    : item.get("isCorrect") instanceof Number n ? (n.intValue() != 0 ? 1 : 0) : 0;
            attempts.add(QuestionAttempt.builder()
                    .userId(rowUserId)
                    .questionId(questionId)
                    .subjectCode(item.get("subjectCode") != null ? item.get("subjectCode").toString().toUpperCase() : null)
                    .isCorrect(isCorrect)
                    .userAnswer(item.get("userAnswer") != null ? item.get("userAnswer").toString() : null)
                    .sourceType(item.get("sourceType") != null ? item.get("sourceType").toString() : "PRACTICE")
                    .build());
        }
        if (!attempts.isEmpty()) questionAttemptMapper.batchInsert(attempts);
        return Result.success(attempts.size());
    }

    @GetMapping("/stats")
    public Result<Map<String, Object>> getQuestionStats() {
        return Result.success(examService.getQuestionStats());
    }

    @GetMapping("/papers")
    public Result<List<ExamPaper>> getAllPapers() {
        return Result.success(examService.getAllPapers());
    }

    @GetMapping("/papers/{paperId}")
    public Result<PaperDetailVO> getPaperDetail(@PathVariable Long paperId,
                                                @RequestParam(required = false, defaultValue = "1") Long userId) {
        PaperDetailVO detail = examService.getPaperDetail(paperId, userId);
        if (detail == null) {
            return Result.error(404, "试卷未找到");
        }
        return Result.success(detail);
    }

    @GetMapping("/year/{year}")
    public Result<PaperDetailVO> getPaperByYear(@PathVariable Integer year,
                                                @RequestParam(required = false, defaultValue = "1") Long userId) {
        PaperDetailVO detail = examService.getPaperByYear(year, userId);
        if (detail == null) {
            return Result.error(404, "该年份真题未找到");
        }
        return Result.success(detail);
    }

    @GetMapping("/questions")
    public Result<PageResult<QuestionDetailVO>> queryQuestions(QuestionQueryDTO query,
                                                              @RequestParam(required = false, defaultValue = "1") Long userId) {
        return Result.success(examService.queryQuestions(query, userId));
    }

    @GetMapping("/questions/{id}")
    public Result<QuestionDetailVO> getQuestionDetail(@PathVariable String id,
                                                      @RequestParam(required = false, defaultValue = "1") Long userId) {
        QuestionDetailVO detail = examService.getQuestionDetail(id, userId);
        if (detail == null) {
            return Result.error(404, "题目未找到");
        }
        return Result.success(detail);
    }

    @GetMapping("/knowledge-points")
    public Result<List<Map<String, Object>>> getKnowledgePoints(
            @RequestParam(required = false) String subjectCode) {
        return Result.success(examService.getKnowledgePointStats(subjectCode));
    }

    @GetMapping("/filters")
    public Result<ExamFilterVO> getExamFilters(@RequestParam(required = false) String subjectCode) {
        return Result.success(examService.getExamFilters(subjectCode));
    }

    @PostMapping("/favorite")
    public Result<Boolean> toggleFavorite(@RequestBody QuestionFavoriteDTO dto,
                                          @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = JwtUtil.getUserIdFromAuthorization(authorization);
        if (userId == null) {
            userId = dto.getUserId() != null ? dto.getUserId() : 1L;
        }
        boolean isFav = examService.toggleFavorite(userId, dto.getQuestionId(), dto.getTag());
        return Result.success(isFav ? "收藏成功" : "已取消收藏", isFav);
    }
}

