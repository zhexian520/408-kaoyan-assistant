package com.example.mcs.controller;

import com.example.mcs.common.PageResult;
import com.example.mcs.common.Result;
import com.example.mcs.dto.QuestionQueryDTO;
import com.example.mcs.entity.ExamPaper;
import com.example.mcs.entity.ExamQuestion;
import com.example.mcs.mapper.ExamPaperMapper;
import com.example.mcs.mapper.ExamQuestionMapper;
import com.example.mcs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin/questions")
@RequiredArgsConstructor
public class AdminQuestionController {

    private final ExamPaperMapper examPaperMapper;
    private final ExamQuestionMapper examQuestionMapper;

    private void checkAdminPermission(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        String role = JwtUtil.getRoleCode(token);
        if (!"ROLE_ADMIN".equalsIgnoreCase(role)) {
            throw new SecurityException("无权访问：仅管理员可进行题库运维管理");
        }
    }

    @GetMapping("/papers")
    public Result<List<Map<String, Object>>> getAdminPapers(@RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            List<ExamPaper> papers = examPaperMapper.selectAllPapers(null);
            List<Map<String, Object>> result = new ArrayList<>();
            for (ExamPaper p : papers) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", p.getId());
                map.put("year", p.getYear());
                map.put("title", p.getTitle());
                map.put("questionCount", p.getQuestionCount());
                map.put("totalScore", p.getTotalScore());
                map.put("durationMinutes", p.getDurationMinutes());
                map.put("status", p.getStatus());
                map.put("paperType", p.getPaperType());
                result.add(map);
            }
            return Result.success(result);
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        }
    }

    @GetMapping
    public Result<PageResult<ExamQuestion>> listQuestions(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String subjectCode,
            @RequestParam(required = false) String questionType,
            @RequestParam(required = false) Integer difficulty,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") Integer pageNum,
            @RequestParam(defaultValue = "10") Integer pageSize,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            QuestionQueryDTO query = new QuestionQueryDTO();
            query.setYear(year);
            query.setSubjectCode(subjectCode);
            query.setQuestionType(questionType);
            query.setDifficulty(difficulty);
            query.setKeyword(keyword);
            int page = Math.max(1, pageNum);
            int size = Math.min(100, Math.max(1, pageSize));
            List<ExamQuestion> list = examQuestionMapper.selectByConditions(query, (page - 1) * size, size);
            Long total = examQuestionMapper.countByConditions(query);
            return Result.success(PageResult.of(list, total, page, size));
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "题目列表加载失败：" + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public Result<ExamQuestion> getQuestion(@PathVariable String id,
                                            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            ExamQuestion question = examQuestionMapper.selectById(id);
            return question != null ? Result.success(question) : Result.error(404, "题目不存在");
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        }
    }

    @PostMapping
    public Result<ExamQuestion> createQuestion(@RequestBody ExamQuestion question,
                                               @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            if (question.getStem() == null || question.getStem().isBlank()) {
                return Result.error(400, "题干不能为空");
            }
            if (question.getId() == null || question.getId().isBlank()) {
                question.setId("custom-" + System.currentTimeMillis());
            }
            if (examQuestionMapper.selectById(question.getId()) != null) {
                return Result.error(400, "题目 ID 已存在");
            }
            if (question.getYear() == null) question.setYear(Calendar.getInstance().get(Calendar.YEAR));
            if (question.getQuestionNumber() == null) question.setQuestionNumber(1);
            if (question.getScore() == null) question.setScore(2);
            if (question.getQuestionType() == null) question.setQuestionType("choice");
            if (question.getSubjectCode() == null) question.setSubjectCode("DS");
            if (question.getDifficulty() == null) question.setDifficulty(3);
            if (question.getIsVariant() == null) question.setIsVariant(0);
            examQuestionMapper.insert(question);
            if (question.getPaperId() != null) examPaperMapper.refreshQuestionCount(question.getPaperId());
            return Result.success("题目创建成功", question);
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "题目创建失败：" + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public Result<ExamQuestion> updateQuestion(@PathVariable String id,
                                               @RequestBody ExamQuestion question,
                                               @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            ExamQuestion existing = examQuestionMapper.selectById(id);
            if (existing == null) return Result.error(404, "题目不存在");
            question.setId(id);
            examQuestionMapper.update(question);
            Long paperId = question.getPaperId() != null ? question.getPaperId() : existing.getPaperId();
            if (paperId != null) examPaperMapper.refreshQuestionCount(paperId);
            return Result.success("题目更新成功", examQuestionMapper.selectById(id));
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "题目更新失败：" + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public Result<Boolean> deleteQuestion(@PathVariable String id,
                                          @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            checkAdminPermission(token);
            ExamQuestion existing = examQuestionMapper.selectById(id);
            if (existing == null) return Result.error(404, "题目不存在");
            examQuestionMapper.deleteById(id);
            if (existing.getPaperId() != null) examPaperMapper.refreshQuestionCount(existing.getPaperId());
            return Result.success(true);
        } catch (SecurityException e) {
            return Result.error(403, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "题目删除失败：" + e.getMessage());
        }
    }
}
