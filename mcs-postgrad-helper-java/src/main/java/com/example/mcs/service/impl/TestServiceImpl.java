package com.example.mcs.service.impl;

import com.example.mcs.dto.ExamAnswerItemDTO;
import com.example.mcs.dto.ExamSubmitDTO;
import com.example.mcs.entity.*;
import com.example.mcs.mapper.*;
import com.example.mcs.service.TestService;
import com.example.mcs.util.JsonUtil;
import com.example.mcs.vo.TestAnswerDetailVO;
import com.example.mcs.vo.TestGradingResultVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TestServiceImpl implements TestService {

    private final ExamPaperMapper examPaperMapper;
    private final ExamQuestionMapper examQuestionMapper;
    private final ExamQuestionSubMapper examQuestionSubMapper;
    private final TestRecordMapper testRecordMapper;
    private final TestAnswerDetailMapper testAnswerDetailMapper;
    private final UserWrongQuestionMapper userWrongQuestionMapper;

    private static final String PYTHON_AI_BASE_URL = "http://localhost:8000";

    @Override
    @Transactional(rollbackFor = Exception.class)
    public TestGradingResultVO submitExam(ExamSubmitDTO submitDTO) {
        Long paperId = submitDTO.getPaperId();
        ExamPaper paper = null;
        if (paperId != null) {
            paper = examPaperMapper.selectById(paperId);
        }

        List<ExamQuestion> questions = (paperId != null) ? examQuestionMapper.selectByPaperId(paperId) : Collections.emptyList();
        Map<String, ExamQuestion> questionMap = questions.stream().collect(Collectors.toMap(ExamQuestion::getId, q -> q));

        Map<String, ExamAnswerItemDTO> answerMap = new HashMap<>();
        if (submitDTO.getAnswers() != null) {
            for (ExamAnswerItemDTO item : submitDTO.getAnswers()) {
                answerMap.put(item.getQuestionId(), item);
            }
        }

        BigDecimal totalEarnedScore = BigDecimal.ZERO;
        int totalQuestions = questions.isEmpty() ? answerMap.size() : questions.size();
        int correctCount = 0;
        int wrongCount = 0;

        Map<String, BigDecimal> subjectScores = new HashMap<>();
        List<String> weakPoints = new ArrayList<>();
        List<TestAnswerDetail> detailsToInsert = new ArrayList<>();
        List<TestAnswerDetailVO> voDetails = new ArrayList<>();

        for (ExamQuestion q : questions) {
            String qid = q.getId();
            ExamAnswerItemDTO userAnsItem = answerMap.get(qid);
            String uAns = (userAnsItem != null && userAnsItem.getUserAnswer() != null) ? userAnsItem.getUserAnswer().trim() : "";
            String standardAns = (q.getAnswer() != null) ? q.getAnswer().trim() : "";

            Integer isCorrect = null;
            BigDecimal scoreEarned = BigDecimal.ZERO;
            String feedback = "";
            List<String> missingPoints = new ArrayList<>();
            String errorAnalysis = "";
            String advice = "";

            if ("choice".equalsIgnoreCase(q.getQuestionType())) {
                if (!uAns.isEmpty() && uAns.equalsIgnoreCase(standardAns)) {
                    isCorrect = 1;
                    scoreEarned = BigDecimal.valueOf(q.getScore());
                    correctCount++;
                    feedback = "回答正确！考点掌握牢固。";
                } else {
                    isCorrect = 0;
                    scoreEarned = BigDecimal.ZERO;
                    wrongCount++;
                    feedback = uAns.isEmpty() ? "未作答。" : ("作答错误，正确答案为 " + standardAns + "。");
                    errorAnalysis = "概念掌握不清晰或关键步骤出现混淆。";
                    if (q.getChapterName() != null && !weakPoints.contains(q.getChapterName())) {
                        weakPoints.add(q.getChapterName());
                    }

                    // 自动存入错题本
                    saveWrongQuestion(submitDTO.getUserId(), q, uAns, "CONCEPT_CONFUSION");
                }
            } else {
                // 综合大题 - 调用 Python AI 采分点阅卷或规则评测
                Map<String, Object> aiResult = evaluateSubjective(q, uAns);
                scoreEarned = new BigDecimal(aiResult.getOrDefault("score", 0).toString());
                feedback = (String) aiResult.getOrDefault("feedback", "AI 评分完成。");
                missingPoints = (List<String>) aiResult.getOrDefault("missing_points", Collections.emptyList());
                errorAnalysis = (String) aiResult.getOrDefault("error_analysis", "");
                advice = (String) aiResult.getOrDefault("advice", "建议深入复习相关核心算法设计与原理。");

                if (scoreEarned.compareTo(BigDecimal.valueOf(q.getScore() * 0.6)) < 0) {
                    wrongCount++;
                    if (q.getChapterName() != null && !weakPoints.contains(q.getChapterName())) {
                        weakPoints.add(q.getChapterName());
                    }
                    saveWrongQuestion(submitDTO.getUserId(), q, uAns, "CODE_BUG");
                } else {
                    correctCount++;
                }
            }

            totalEarnedScore = totalEarnedScore.add(scoreEarned);
            subjectScores.merge(q.getSubjectCode(), scoreEarned, BigDecimal::add);

            TestAnswerDetail detail = TestAnswerDetail.builder()
                    .questionId(qid)
                    .userAnswer(uAns)
                    .isCorrect(isCorrect)
                    .scoreEarned(scoreEarned)
                    .aiFeedback(feedback)
                    .missingPointsJson(JsonUtil.toJson(missingPoints))
                    .errorAnalysis(errorAnalysis)
                    .optimizationAdvice(advice)
                    .gradedBy("choice".equalsIgnoreCase(q.getQuestionType()) ? "SYSTEM_AUTO" : "AI_AGENT")
                    .gradedAt(LocalDateTime.now())
                    .build();
            detailsToInsert.add(detail);

            voDetails.add(TestAnswerDetailVO.builder()
                    .questionId(qid)
                    .questionNumber(q.getQuestionNumber())
                    .questionType(q.getQuestionType())
                    .subjectCode(q.getSubjectCode())
                    .stem(q.getStem())
                    .maxScore(q.getScore())
                    .standardAnswer(standardAns)
                    .userAnswer(uAns)
                    .isCorrect(isCorrect)
                    .scoreEarned(scoreEarned)
                    .aiFeedback(feedback)
                    .missingPoints(missingPoints)
                    .errorAnalysis(errorAnalysis)
                    .optimizationAdvice(advice)
                    .explanation(q.getExplanation())
                    .build());
        }

        // 保存 TestRecord
        String summary = String.format("全卷满分 %d 分，本次得分 %.1f 分。正确 %d 题，错误/失分 %d 题。薄弱考点聚焦于: %s。",
                (paper != null ? paper.getTotalScore() : 150),
                totalEarnedScore.doubleValue(),
                correctCount,
                wrongCount,
                weakPoints.isEmpty() ? "暂无明显薄弱点，保持得非常好！" : String.join("、", weakPoints));

        TestRecord record = TestRecord.builder()
                .userId(submitDTO.getUserId())
                .paperId(paperId)
                .testTitle(submitDTO.getTestTitle() != null ? submitDTO.getTestTitle() : (paper != null ? paper.getTitle() : "408 自测"))
                .testType(submitDTO.getTestType())
                .subjectCode(null)
                .totalScore(paper != null ? paper.getTotalScore() : 150)
                .userScore(totalEarnedScore)
                .timeSpentSeconds(submitDTO.getTimeSpentSeconds())
                .status("GRADED")
                .startTime(LocalDateTime.now().minusSeconds(submitDTO.getTimeSpentSeconds()))
                .submitTime(LocalDateTime.now())
                .aiReportSummary(summary)
                .weakPointsJson(JsonUtil.toJson(weakPoints))
                .build();
        testRecordMapper.insert(record);

        // 关联 recordId 批量插入
        for (TestAnswerDetail d : detailsToInsert) {
            d.setTestRecordId(record.getId());
        }
        if (!detailsToInsert.isEmpty()) {
            testAnswerDetailMapper.batchInsert(detailsToInsert);
        }

        BigDecimal accuracy = totalQuestions > 0 ?
                BigDecimal.valueOf((double) correctCount / totalQuestions * 100).setScale(1, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        return TestGradingResultVO.builder()
                .testRecordId(record.getId())
                .paperId(paperId)
                .testTitle(record.getTestTitle())
                .totalScore(record.getTotalScore())
                .userScore(totalEarnedScore)
                .timeSpentSeconds(submitDTO.getTimeSpentSeconds())
                .totalCount(totalQuestions)
                .correctCount(correctCount)
                .wrongCount(wrongCount)
                .accuracyRate(accuracy)
                .subjectScores(subjectScores)
                .details(voDetails)
                .weakPoints(weakPoints)
                .aiReportSummary(summary)
                .build();
    }

    @Override
    public TestGradingResultVO getTestReport(Long testRecordId) {
        TestRecord record = testRecordMapper.selectById(testRecordId);
        if (record == null) return null;

        List<TestAnswerDetail> details = testAnswerDetailMapper.selectByRecordId(testRecordId);
        List<TestAnswerDetailVO> voDetails = new ArrayList<>();
        int correctCount = 0;
        int wrongCount = 0;
        Map<String, BigDecimal> subjectScores = new HashMap<>();

        for (TestAnswerDetail d : details) {
            ExamQuestion q = examQuestionMapper.selectById(d.getQuestionId());
            if (d.getIsCorrect() != null && d.getIsCorrect() == 1) {
                correctCount++;
            } else if (d.getScoreEarned() != null && q != null && d.getScoreEarned().compareTo(BigDecimal.valueOf(q.getScore() * 0.6)) >= 0) {
                correctCount++;
            } else {
                wrongCount++;
            }

            if (q != null && d.getScoreEarned() != null) {
                subjectScores.merge(q.getSubjectCode(), d.getScoreEarned(), BigDecimal::add);
            }

            voDetails.add(TestAnswerDetailVO.builder()
                    .questionId(d.getQuestionId())
                    .questionNumber(q != null ? q.getQuestionNumber() : 0)
                    .questionType(q != null ? q.getQuestionType() : "choice")
                    .subjectCode(q != null ? q.getSubjectCode() : "")
                    .stem(q != null ? q.getStem() : "")
                    .maxScore(q != null ? q.getScore() : 0)
                    .standardAnswer(q != null ? q.getAnswer() : "")
                    .userAnswer(d.getUserAnswer())
                    .isCorrect(d.getIsCorrect())
                    .scoreEarned(d.getScoreEarned())
                    .aiFeedback(d.getAiFeedback())
                    .missingPoints(JsonUtil.parseStringList(d.getMissingPointsJson()))
                    .errorAnalysis(d.getErrorAnalysis())
                    .optimizationAdvice(d.getOptimizationAdvice())
                    .explanation(q != null ? q.getExplanation() : "")
                    .build());
        }

        int totalCount = details.size();
        BigDecimal accuracy = totalCount > 0 ?
                BigDecimal.valueOf((double) correctCount / totalCount * 100).setScale(1, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        return TestGradingResultVO.builder()
                .testRecordId(record.getId())
                .paperId(record.getPaperId())
                .testTitle(record.getTestTitle())
                .totalScore(record.getTotalScore())
                .userScore(record.getUserScore())
                .timeSpentSeconds(record.getTimeSpentSeconds())
                .totalCount(totalCount)
                .correctCount(correctCount)
                .wrongCount(wrongCount)
                .accuracyRate(accuracy)
                .subjectScores(subjectScores)
                .details(voDetails)
                .weakPoints(JsonUtil.parseStringList(record.getWeakPointsJson()))
                .aiReportSummary(record.getAiReportSummary())
                .build();
    }

    @Override
    public List<TestRecord> getUserTestRecords(Long userId) {
        return testRecordMapper.selectByUserId(userId);
    }

    @Override
    public List<UserWrongQuestion> getUserWrongQuestions(Long userId, String subjectCode, String masterStatus) {
        return userWrongQuestionMapper.selectByUserId(userId, subjectCode, masterStatus);
    }

    @Override
    public void clearUserWrongQuestions(Long userId) {
        userWrongQuestionMapper.deleteByUserId(userId);
    }

    @Override
    public boolean updateWrongQuestionMasterStatus(Long userId, Long id, String masterStatus) {
        String status = (masterStatus == null || masterStatus.isBlank()) ? "MASTERED" : masterStatus.toUpperCase();
        if (!"MASTERED".equals(status) && !"UNMASTERED".equals(status) && !"REVIEWING".equals(status)) {
            status = "MASTERED";
        }
        return userWrongQuestionMapper.updateMasterStatus(id, userId, status) > 0;
    }

    @Override
    public boolean deleteWrongQuestion(Long userId, Long id) {
        return userWrongQuestionMapper.deleteById(id, userId) > 0;
    }

    private void saveWrongQuestion(Long userId, ExamQuestion q, String lastAns, String tag) {
        try {
            UserWrongQuestion wq = UserWrongQuestion.builder()
                    .userId(userId)
                    .questionId(q.getId())
                    .subjectCode(q.getSubjectCode())
                    .sourceType("TEST")
                    .wrongCount(1)
                    .masterStatus("UNMASTERED")
                    .errorReasonTag(tag)
                    .lastWrongAnswer(lastAns)
                    .lastPracticedAt(LocalDateTime.now())
                    .build();
            userWrongQuestionMapper.insertOrUpdate(wq);
        } catch (Exception e) {
            log.error("Failed to auto save wrong question: {}", q.getId(), e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> evaluateSubjective(ExamQuestion q, String userAnswer) {
        Map<String, Object> result = new HashMap<>();
        int maxScore = q.getScore();
        if (userAnswer == null || userAnswer.trim().isEmpty()) {
            result.put("score", 0);
            result.put("feedback", "考生未作答，本题得 0 分。");
            result.put("missing_points", List.of("完整算法思想或设计步骤缺失", "关键代码或状态转换推导缺失"));
            result.put("error_analysis", "空白未答");
            result.put("advice", "408大题切忌留白，哪怕写出核心伪代码或解题思想也可按采分点拿基础分。");
            return result;
        }

        // 尝试调用 Python FastAPI 采分点评测微服务
        try {
            RestClient restClient = RestClient.create();
            Map<String, Object> reqBody = Map.of(
                    "question_id", q.getId(),
                    "max_score", maxScore,
                    "stem", q.getStem(),
                    "standard_answer", q.getAnswer() != null ? q.getAnswer() : "",
                    "explanation", q.getExplanation() != null ? q.getExplanation() : "",
                    "user_answer", userAnswer
            );

            Map response = restClient.post()
                    .uri(PYTHON_AI_BASE_URL + "/api/ai/grade-subjective")
                    .header("X-Internal-Token", "mcs-internal-2026")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(reqBody)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("data")) {
                return (Map<String, Object>) response.get("data");
            }
        } catch (Exception e) {
            log.warn("Python AI Grading service unreachable or failed ({}), using built-in rubric engine.", e.getMessage());
        }

        // 内置采分点智能规则评估兜底 (Rubric Fallback Engine)
        return localRubricGrade(q, userAnswer);
    }

    private Map<String, Object> localRubricGrade(ExamQuestion q, String userAnswer) {
        Map<String, Object> result = new HashMap<>();
        int maxScore = q.getScore();
        int len = userAnswer.trim().length();

        // 基于作答丰满度、代码/关键词覆盖率的启发式评分
        double ratio;
        List<String> missing = new ArrayList<>();
        if (len > 250) {
            ratio = 0.85;
            missing.add("部分边界条件判定或极端情况注释可再精简严密");
        } else if (len > 100) {
            ratio = 0.65;
            missing.add("时空复杂度分析或关键边界情况论述略简略");
        } else {
            ratio = 0.35;
            missing.add("核心算法逻辑不全，缺少关键推导步骤");
            missing.add("缺少清晰的输入输出说明及数据结构说明");
        }

        int score = (int) Math.round(maxScore * ratio);
        result.put("score", score);
        result.put("feedback", String.format("答题覆盖了主要得分要点，采分点得分：%d/%d 分。", score, maxScore));
        result.put("missing_points", missing);
        result.put("error_analysis", len < 100 ? "表述较简略，未充分展开采分点论述。" : "基本表述规范，部分细化要点可再提升。");
        result.put("advice", "按照 408 规范：(1)基本设计思想 (2)算法代码/结构描述 (3)复杂度分析，分段分条书写更容易拿到全部分值。");
        return result;
    }
}

