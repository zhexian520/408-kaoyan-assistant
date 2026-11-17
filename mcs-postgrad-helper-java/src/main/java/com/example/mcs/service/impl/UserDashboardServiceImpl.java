package com.example.mcs.service.impl;

import com.example.mcs.entity.SysUser;
import com.example.mcs.entity.TestRecord;
import com.example.mcs.mapper.StudyActivityMapper;
import com.example.mcs.mapper.SysUserMapper;
import com.example.mcs.mapper.TestRecordMapper;
import com.example.mcs.mapper.UserWrongQuestionMapper;
import com.example.mcs.service.UserDashboardService;
import com.example.mcs.vo.UserDashboardVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserDashboardServiceImpl implements UserDashboardService {

    private final SysUserMapper sysUserMapper;
    private final TestRecordMapper testRecordMapper;
    private final UserWrongQuestionMapper userWrongQuestionMapper;
    private final StudyActivityMapper activityMapper;

    @Override
    public UserDashboardVO getUserDashboardStats(Long userId) {
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) {
            user = SysUser.builder()
                    .id(userId)
                    .username("考研学子")
                    .nickname("408必胜")
                    .targetSchool("浙江大学")
                    .targetScore(125)
                    .build();
        }

        // 考研年份按“入学年份”理解：2027 考研初试在 2026 年 12 月。
        // 兼容旧数据：如果按入学年份减 1 已经过去，则回退到当年 12 月。
        LocalDate today = LocalDate.now();
        int configuredYear = user.getExamYear() != null && user.getExamYear() >= today.getYear()
                ? user.getExamYear()
                : (today.getMonthValue() == 12 && today.getDayOfMonth() > 25 ? today.getYear() + 1 : today.getYear());
        LocalDate examDate = LocalDate.of(configuredYear - 1, 12, 21);
        if (examDate.isBefore(today.minusDays(30))) {
            examDate = LocalDate.of(configuredYear, 12, 21);
        }
        if (examDate.isBefore(today)) {
            examDate = LocalDate.of(configuredYear + 1, 12, 21);
        }
        int daysUntilExam = (int) ChronoUnit.DAYS.between(today, examDate);
        if (daysUntilExam <= 0) daysUntilExam = 1;

        // 模考记录
        List<TestRecord> userRecords = testRecordMapper.selectByUserId(userId);
        int totalTests = userRecords.size();
        double highestScore = 0.0;
        double totalScoreSum = 0.0;

        List<String> detectedWeakPoints = new ArrayList<>();
        for (TestRecord r : userRecords) {
            if (r.getUserScore() != null) {
                double scoreVal = r.getUserScore().doubleValue();
                if (scoreVal > highestScore) {
                    highestScore = scoreVal;
                }
                totalScoreSum += scoreVal;
            }
            if (r.getWeakPointsJson() != null && !r.getWeakPointsJson().isEmpty()) {
                // 拆分或清洗薄弱知识点
                String raw = r.getWeakPointsJson().replace("[", "").replace("]", "").replace("\"", "");
                for (String part : raw.split(",")) {
                    if (!part.trim().isEmpty() && !detectedWeakPoints.contains(part.trim())) {
                        detectedWeakPoints.add(part.trim());
                    }
                }
            }
        }
        double avgScore = totalTests > 0 ? Math.round((totalScoreSum / totalTests) * 10.0) / 10.0 : 0.0;

        // 错题统计
        int wrongCount = userWrongQuestionMapper.countByUserId(userId, "UNMASTERED");
        int masteredCount = userWrongQuestionMapper.countByUserId(userId, "MASTERED");

        // 真实作答与题库覆盖统计（与个性化备考规划使用同一口径）
        Map<String, Long> answeredMap = new HashMap<>();
        Map<String, Long> correctMap = new HashMap<>();
        Map<String, Long> totalMap = new HashMap<>();
        for (Map<String, Object> row : activityMapper.selectSubjectAnswerCounts(userId)) {
            String code = String.valueOf(row.get("subjectCode")).toUpperCase();
            answeredMap.put(code, longValue(row.get("answered")));
            correctMap.put(code, longValue(row.get("correct")));
        }
        for (Map<String, Object> row : activityMapper.selectQuestionTotalsBySubject()) {
            totalMap.put(String.valueOf(row.get("subjectCode")).toUpperCase(), longValue(row.get("total")));
        }

        List<UserDashboardVO.SubjectMasteryVO> subjectMastery = new ArrayList<>();
        String[][] subjectMeta = {
                {"DS", "数据结构", "📊"},
                {"CO", "计算机组成原理", "💻"},
                {"OS", "操作系统", "⚙️"},
                {"CN", "计算机网络", "🌐"}
        };
        List<Map.Entry<String, Double>> accuracyRanking = new ArrayList<>();
        for (String[] meta : subjectMeta) {
            String code = meta[0];
            long practiced = answeredMap.getOrDefault(code, 0L);
            long total = totalMap.getOrDefault(code, 0L);
            long correct = correctMap.getOrDefault(code, 0L);
            double rate = practiced > 0 ? Math.round((correct * 1000.0 / practiced)) / 10.0 : 0.0;
            String level = rate >= 75 ? "优秀" : rate >= 60 ? "良好" : rate > 0 ? "待巩固" : "未开始";
            subjectMastery.add(buildSubjectMastery(code, meta[1], (int) total, (int) practiced, rate, level, meta[2]));
            accuracyRanking.add(new AbstractMap.SimpleEntry<>(meta[1], rate));
        }
        accuracyRanking.sort(Comparator.comparingDouble(Map.Entry::getValue));

        // 没有足够薄弱点记录时，用真实正确率最低的科目生成可执行的复盘建议。
        if (detectedWeakPoints.isEmpty()) {
            for (int i = 0; i < Math.min(4, accuracyRanking.size()); i++) {
                Map.Entry<String, Double> item = accuracyRanking.get(i);
                detectedWeakPoints.add(item.getKey() + " · 基础章节与高频错题复盘");
            }
        }

        return UserDashboardVO.builder()
                .userId(userId)
                .username(user.getUsername())
                .nickname(user.getNickname() != null ? user.getNickname() : user.getUsername())
                .targetSchool(user.getTargetSchool() != null ? user.getTargetSchool() : "清华大学")
                .targetScore(user.getTargetScore() != null ? user.getTargetScore() : 125)
                .examYear(user.getExamYear() != null ? user.getExamYear() : configuredYear)
                .prepStage(user.getPrepStage() != null ? user.getPrepStage() : "BASIC")
                .daysUntilExam(daysUntilExam)
                .totalTestsTaken(totalTests)
                .highestScore(highestScore)
                .avgScore(avgScore)
                .wrongQuestionsCount(wrongCount)
                .masteredQuestionsCount(masteredCount)
                .subjectMastery(subjectMastery)
                .recentRecords(userRecords.size() > 5 ? userRecords.subList(0, 5) : userRecords)
                .weakKnowledgePoints(detectedWeakPoints)
                .build();
    }

    @Override
    public boolean updateUserTarget(Long userId, String targetSchool, Integer targetScore, Integer examYear, String prepStage) {
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) return false;
        if (targetSchool != null && !targetSchool.trim().isEmpty()) {
            user.setTargetSchool(targetSchool.trim());
        }
        if (targetScore != null && targetScore > 0) {
            user.setTargetScore(targetScore);
        }
        if (examYear != null && examYear >= 2024) {
            user.setExamYear(examYear);
        }
        if (prepStage != null && !prepStage.trim().isEmpty()) {
            user.setPrepStage(prepStage.trim());
        }
        return sysUserMapper.update(user) > 0;
    }

    private long longValue(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value == null) return 0L;
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException ignored) {
            return 0L;
        }
    }

    private UserDashboardVO.SubjectMasteryVO buildSubjectMastery(String code, String name, int total, int practiced, double rate, String level, String icon) {
        return UserDashboardVO.SubjectMasteryVO.builder()
                .subjectCode(code)
                .subjectName(name)
                .totalQuestions(total)
                .practicedCount(practiced)
                .correctRate(rate)
                .masteryLevel(level)
                .icon(icon)
                .build();
    }
}
