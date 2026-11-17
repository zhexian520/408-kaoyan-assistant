package com.example.mcs.controller;

import com.example.mcs.common.Result;
import com.example.mcs.entity.UserKnowledgeMastery;
import com.example.mcs.mapper.KbMapper;
import com.example.mcs.mapper.KnowledgeMasteryMapper;
import com.example.mcs.mapper.TestRecordMapper;
import com.example.mcs.mapper.StudyActivityMapper;
import com.example.mcs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/user/analytics")
@RequiredArgsConstructor
public class KnowledgeMasteryController {

    private final KnowledgeMasteryMapper knowledgeMasteryMapper;
    private final KbMapper kbMapper;
    private final TestRecordMapper testRecordMapper;
    private final StudyActivityMapper activityMapper;

    @GetMapping("/mastery-graph")
    public Result<Map<String, Object>> getMasteryGraph(@RequestParam(required = false) String subjectCode,
                                                       @RequestHeader(value = "Authorization", required = false) String token) {
        Long userId = 2L;
        if (token != null && token.startsWith("Bearer ")) {
            Long uid = JwtUtil.getUserId(token.substring(7));
            if (uid != null) userId = uid;
        }

        List<UserKnowledgeMastery> masteryList = knowledgeMasteryMapper.selectByUserId(userId, subjectCode);

        // 统计掌握等级分布
        int masteredCount = 0;
        int familiarCount = 0;
        int weakCount = 0;
        Set<String> practicedPointIds = new HashSet<>();

        for (UserKnowledgeMastery m : masteryList) {
            if (m.getKnowledgeBlockId() != null) practicedPointIds.add(m.getKnowledgeBlockId());
            if ("MASTERED".equalsIgnoreCase(m.getMasteryLevel())) masteredCount++;
            else if ("FAMILIAR".equalsIgnoreCase(m.getMasteryLevel())) familiarCount++;
            else if ("WEAK".equalsIgnoreCase(m.getMasteryLevel())) weakCount++;
        }

        // 知识点名称映射：不再只显示 kp_ds_01 这类原始 ID。
        Map<String, String> pointNames = new LinkedHashMap<>();
        Map<String, String> pointSubjects = new LinkedHashMap<>();
        String[] codes = subjectCode == null || subjectCode.isBlank()
                ? new String[]{"DS", "CO", "OS", "CN"}
                : new String[]{subjectCode.toUpperCase()};
        for (String code : codes) {
            for (var point : kbMapper.selectPointsBySubject(code)) {
                pointNames.put(point.getId(), point.getTitle());
                pointSubjects.put(point.getId(), code);
            }
        }
        int totalPoints = pointNames.size();
        int unlearnedCount = Math.max(0, totalPoints - masteredCount - familiarCount - weakCount);

        // 四科雷达掌握度指标：使用真实作答正确率，和个性化规划保持同一口径。
        Map<String, Double> accuracyMap = new HashMap<>();
        Map<String, Object> subjectStatsMap = new LinkedHashMap<>();
        for (Map<String, Object> row : activityMapper.selectSubjectAnswerCounts(userId)) {
            String code = String.valueOf(row.get("subjectCode")).toUpperCase();
            long answered = row.get("answered") instanceof Number n ? n.longValue() : 0L;
            long correct = row.get("correct") instanceof Number n ? n.longValue() : 0L;
            accuracyMap.put(code, answered > 0 ? Math.round(correct * 1000.0 / answered) / 10.0 : 0.0);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("subjectCode", code);
            item.put("answered", answered);
            item.put("correct", correct);
            item.put("accuracy", answered > 0 ? Math.round(correct * 1000.0 / answered) / 10.0 : 0.0);
            subjectStatsMap.put(code, item);
        }
        Map<String, Object> radarStats = new LinkedHashMap<>();
        radarStats.put("DS", accuracyMap.getOrDefault("DS", 0.0));
        radarStats.put("CO", accuracyMap.getOrDefault("CO", 0.0));
        radarStats.put("OS", accuracyMap.getOrDefault("OS", 0.0));
        radarStats.put("NET", accuracyMap.getOrDefault("CN", 0.0));

        Map<String, Object> totals = activityMapper.selectUserTotals(userId);
        List<Map<String, Object>> dailyActivity = activityMapper.selectRecentDailyActivity(userId, 14);
        Map<String, Object> questionTotals = new LinkedHashMap<>();
        long allQuestions = 0;
        for (Map<String, Object> row : activityMapper.selectQuestionTotalsBySubject()) {
            String code = String.valueOf(row.get("subjectCode")).toUpperCase();
            long count = row.get("total") instanceof Number n ? n.longValue() : 0L;
            questionTotals.put(code, count);
            allQuestions += count;
        }
        if (totals != null) {
            totals.put("questionTotal", allQuestions);
            long answeredTotal = totals.get("answeredTotal") instanceof Number n ? n.longValue() : 0L;
            totals.put("coverage", allQuestions > 0
                    ? Math.round(answeredTotal * 1000.0 / allQuestions) / 10.0 : 0.0);
            long correctTotal = totals.get("correctTotal") instanceof Number n ? n.longValue() : 0L;
            totals.put("accuracy", answeredTotal > 0
                    ? Math.round(correctTotal * 1000.0 / answeredTotal) / 10.0 : 0.0);
        }

        // 薄弱考点：按正确率升序，附带真实名称与学科。
        List<Map<String, Object>> weakPoints = new ArrayList<>();
        masteryList.stream()
                .filter(m -> "WEAK".equalsIgnoreCase(m.getMasteryLevel()))
                .sorted(Comparator.comparingDouble(m -> m.getAccuracyRate() == null ? 0.0 : m.getAccuracyRate().doubleValue()))
                .limit(12)
                .forEach(m -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", m.getKnowledgeBlockId());
                    item.put("name", pointNames.getOrDefault(m.getKnowledgeBlockId(), m.getKnowledgeBlockId()));
                    item.put("subjectCode", m.getSubjectCode());
                    item.put("accuracyRate", m.getAccuracyRate());
                    item.put("totalAttempts", m.getTotalAttempts());
                    item.put("weaknessScore", m.getWeaknessScore());
                    weakPoints.add(item);
                });

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("masteryList", masteryList);
        res.put("pointNames", pointNames);
        res.put("pointSubjects", pointSubjects);
        res.put("radarStats", radarStats);
        res.put("levelCounts", Map.of(
                "mastered", masteredCount,
                "familiar", familiarCount,
                "weak", weakCount,
                "unlearned", unlearnedCount
        ));
        res.put("totals", totals);
        res.put("subjectStats", subjectStatsMap);
        res.put("questionTotals", questionTotals);
        res.put("dailyActivity", dailyActivity);
        res.put("weakPoints", weakPoints);
        res.put("recentRecords", testRecordMapper.selectByUserId(userId));

        return Result.success(res);
    }
}

