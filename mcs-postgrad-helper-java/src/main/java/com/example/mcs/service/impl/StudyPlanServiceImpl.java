package com.example.mcs.service.impl;

import com.example.mcs.entity.SysUser;
import com.example.mcs.entity.UserStudyPlan;
import com.example.mcs.entity.UserStudyPlanTask;
import com.example.mcs.mapper.StudyActivityMapper;
import com.example.mcs.mapper.StudyPlanMapper;
import com.example.mcs.mapper.SysUserMapper;
import com.example.mcs.service.StudyPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class StudyPlanServiceImpl implements StudyPlanService {

    private final StudyPlanMapper studyPlanMapper;
    private final StudyActivityMapper activityMapper;
    private final SysUserMapper sysUserMapper;

    private static final String[] SUBJECTS = {"DS", "CO", "OS", "CN"};
    private static final Map<String, String> SUBJECT_NAMES = Map.of(
            "DS", "数据结构",
            "CO", "计算机组成原理",
            "OS", "操作系统",
            "CN", "计算机网络"
    );
    private static final Map<String, String> STAGE_NAMES = Map.of(
            "BASIC", "基础阶段",
            "ENHANCE", "强化阶段",
            "TRUE_EXAM", "真题阶段",
            "SPRINT", "冲刺阶段"
    );

    @Override
    public UserStudyPlan getActivePlan(Long userId) {
        return studyPlanMapper.selectActivePlanByUserId(userId);
    }

    @Override
    public List<UserStudyPlanTask> getTasks(Long planId) {
        return studyPlanMapper.selectTasksByPlanId(planId);
    }

    @Override
    public Map<String, Object> getPlanData(Long userId) {
        UserStudyPlan plan = studyPlanMapper.selectActivePlanByUserId(userId);
        List<UserStudyPlanTask> tasks = plan == null
                ? Collections.emptyList()
                : studyPlanMapper.selectTasksByPlanId(plan.getId());

        // 旧版固定任务没有自动统计规则/站内入口，首次访问时自动升级为动态规划。
        boolean legacyPlan = plan != null && !tasks.isEmpty()
                && tasks.stream().anyMatch(t -> t.getAutoRule() == null && t.getTargetRoute() == null);
        if (plan == null || tasks.isEmpty() || legacyPlan) {
            return generatePlan(userId);
        }

        Map<String, Object> activity = buildActivity(userId);
        syncTasks(tasks, activity);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("plan", plan);
        res.put("tasks", tasks);
        res.put("activity", activity);
        return res;
    }

    @Override
    @Transactional
    public Map<String, Object> generatePlan(Long userId) {
        studyPlanMapper.deactivatePlans(userId);

        SysUser user = sysUserMapper.selectById(userId);
        Map<String, Object> activity = buildActivity(userId);

        LocalDate today = LocalDate.now();
        int enrollmentYear = user != null && user.getExamYear() != null ? user.getExamYear() : today.getYear();
        // 考研年份按入学年份理解：2027 考研初试在 2026 年 12 月。
        LocalDate examDate = LocalDate.of(enrollmentYear - 1, 12, 21);
        if (!examDate.isAfter(today)) {
            examDate = LocalDate.of(enrollmentYear, 12, 21);
        }
        if (!examDate.isAfter(today)) {
            examDate = LocalDate.of(enrollmentYear + 1, 12, 21);
        }

        long daysLeft = Math.max(1, ChronoUnit.DAYS.between(today, examDate));
        String baseLevel = determineBaseLevel(activity);
        String currentStage = determineStage(user, daysLeft);
        int targetScore = user != null && user.getTargetScore() != null ? user.getTargetScore() : 125;
        String targetSchool = user != null && user.getTargetSchool() != null && !user.getTargetSchool().isBlank()
                ? user.getTargetSchool()
                : "目标院校";
        int durationMonths = (int) Math.max(1, ChronoUnit.MONTHS.between(today, examDate));
        BigDecimal dailyHours = dailyHours(baseLevel, currentStage);

        UserStudyPlan plan = UserStudyPlan.builder()
                .userId(userId)
                .planName(targetSchool + " · " + targetScore + " 分 408 个性化备考规划")
                .prepDurationMonths(durationMonths)
                .baseLevel(baseLevel)
                .targetScore(targetScore)
                .currentStage(currentStage)
                .startDate(today)
                .examDate(examDate)
                .dailyTargetHours(dailyHours)
                .isActive(1)
                .build();
        studyPlanMapper.insertPlan(plan);

        List<UserStudyPlanTask> tasks = buildTasks(plan, targetSchool, targetScore, currentStage, activity, today);
        scheduleTasks(tasks, daysLeft, today);
        for (UserStudyPlanTask task : tasks) {
            studyPlanMapper.insertTask(task);
        }

        syncTasks(tasks, activity);
        tasks = studyPlanMapper.selectTasksByPlanId(plan.getId());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("plan", plan);
        res.put("tasks", tasks);
        res.put("activity", activity);
        res.put("generated", true);
        return res;
    }

    @Override
    @Transactional
    public Map<String, Object> addRemedialTask(Long userId, Map<String, Object> payload) {
        UserStudyPlan plan = studyPlanMapper.selectActivePlanByUserId(userId);
        if (plan == null) {
            generatePlan(userId);
            plan = studyPlanMapper.selectActivePlanByUserId(userId);
        }
        if (plan == null) {
            throw new IllegalStateException("个性化备考规划尚未生成，请先打开学习计划页面");
        }

        String subjectCode = normalizeSubject(payload.get("subjectCode"));
        String title = stringValue(payload.get("title"), "错题医生补救任务");
        String description = stringValue(payload.get("description"), "复盘错题并完成 3 道同类变式题。");
        String targetRoute = stringValue(payload.get("targetRoute"), "/user/wrong-notebook");
        int targetCount = intValue(payload.get("targetCount"), 3);
        String progressUnit = stringValue(payload.get("progressUnit"), "题");

        LocalDate today = LocalDate.now();
        UserStudyPlanTask task = UserStudyPlanTask.builder()
                .planId(plan.getId())
                .weekNumber(currentWeek(plan, today))
                .stage(plan.getCurrentStage())
                .subjectCode(subjectCode)
                .title(title)
                .taskType("REMEDIAL")
                .isCompleted(0)
                .description(description)
                .targetRoute(targetRoute)
                .targetCount(targetCount)
                .progressCurrent(0)
                .progressUnit(progressUnit)
                .autoRule(null)
                .baselineValue(0)
                .dueDate(today)
                .priority(5)
                .isAuto(0)
                .lastSyncedAt(LocalDateTime.now())
                .build();
        studyPlanMapper.insertTask(task);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("task", task);
        res.put("planId", plan.getId());
        res.put("planName", plan.getPlanName());
        return res;
    }

    private int currentWeek(UserStudyPlan plan, LocalDate today) {
        if (plan.getStartDate() == null) {
            return 1;
        }
        long days = Math.max(0, ChronoUnit.DAYS.between(plan.getStartDate(), today));
        int week = (int) Math.max(1, Math.ceil((days + 1) / 7.0));
        if (plan.getExamDate() != null) {
            long left = Math.max(1, ChronoUnit.DAYS.between(today, plan.getExamDate()));
            int totalWeeks = (int) Math.max(1, Math.ceil(left / 7.0));
            week = Math.min(week, totalWeeks);
        }
        return week;
    }

    private String normalizeSubject(Object value) {
        String code = value == null ? "" : String.valueOf(value).trim().toUpperCase();
        if ("NET".equals(code)) {
            code = "CN";
        }
        return Arrays.asList(SUBJECTS).contains(code) ? code : "ALL";
    }

    private String stringValue(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? fallback : text;
    }

    private int intValue(Object value, int fallback) {
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception e) {
            return fallback;
        }
    }

    @Override
    @Transactional
    public boolean toggleTask(Long userId, Long taskId, Integer isCompleted) {
        UserStudyPlan plan = studyPlanMapper.selectActivePlanByUserId(userId);
        if (plan == null) {
            return false;
        }
        List<UserStudyPlanTask> tasks = studyPlanMapper.selectTasksByPlanId(plan.getId());
        UserStudyPlanTask task = tasks.stream()
                .filter(item -> Objects.equals(item.getId(), taskId))
                .findFirst()
                .orElse(null);
        if (task == null) {
            return false;
        }
        // 自动统计任务不允许手动勾选，避免和真实作答数据冲突。
        if (task.getIsAuto() != null && task.getIsAuto() == 1) {
            return false;
        }
        int completed = isCompleted != null && isCompleted == 1 ? 1 : 0;
        int progress = completed == 1 && task.getTargetCount() != null ? task.getTargetCount() : 0;
        studyPlanMapper.updateTaskProgress(taskId, progress, completed, LocalDateTime.now());
        return true;
    }

    private void syncTasks(List<UserStudyPlanTask> tasks, Map<String, Object> activity) {
        for (UserStudyPlanTask task : tasks) {
            String rule = task.getAutoRule();
            // 旧版每日补给任务是手动任务，升级为按真实作答日期自动累计
            if ((rule == null || rule.isBlank()) && "DAILY".equals(task.getTaskType())) {
                rule = "DAILY_PUSH_DAYS";
                task.setAutoRule(rule);
                task.setIsAuto(1);
            }
            if (rule == null || rule.isBlank()) {
                continue;
            }
            long current = currentForRule(rule, activity);
            int baseline = task.getBaselineValue() != null ? task.getBaselineValue() : 0;
            // 第 1 周是“当前周”，应统计本周已经真实发生的学习行为，而不是只统计生成计划之后的行为
            if (task.getWeekNumber() != null && task.getWeekNumber() <= 1) {
                baseline = 0;
            }
            int target = task.getTargetCount() != null ? task.getTargetCount() : 0;
            int progress = (int) Math.max(0, current - baseline);
            int completed = target > 0 && progress >= target ? 1 : 0;

            boolean changed = !Objects.equals(task.getProgressCurrent(), progress)
                    || !Objects.equals(task.getIsCompleted(), completed);
            if (changed) {
                studyPlanMapper.updateTaskProgress(task.getId(), progress, completed, LocalDateTime.now());
                task.setProgressCurrent(progress);
                task.setIsCompleted(completed);
                task.setLastSyncedAt(LocalDateTime.now());
            }
        }
    }

    private List<UserStudyPlanTask> buildTasks(UserStudyPlan plan, String targetSchool, int targetScore,
                                               String currentStage, Map<String, Object> activity, LocalDate today) {
        List<UserStudyPlanTask> tasks = new ArrayList<>();
        String weakest = String.valueOf(activity.getOrDefault("weakestSubject", "DS"));
        String[] subjects = {"DS", "CO", "OS", "CN"};
        long daysLeft = Math.max(1, ChronoUnit.DAYS.between(today, plan.getExamDate()));
        int totalWeeks = (int) Math.max(1, Math.ceil(daysLeft / 7.0));

        for (int week = 1; week <= totalWeeks; week++) {
            double ratio = totalWeeks <= 1 ? 1.0 : (double) week / totalWeeks;
            String stage = stageForRatio(ratio, daysLeft);
            int stageIdx = stageIndex(stage);
            String subject = subjects[(week - 1) % subjects.length];
            String subjectLabel = subjectName(subject);
            String stageLabel = stageName(stage);

            // 1. 课程中心精读 + 章节配套题
            addTask(tasks, plan.getId(), week, stage, subject,
                    "课程中心 · " + subjectLabel + "：" + stageLabel + "精读本周章节并完成配套例题",
                    "COURSE", "/user/courses?subject=" + subject, 1, "轮", null, activity, today,
                    priority(stageIdx, 0),
                    "先在课程中心完成本周章节精讲、动态演示和公式/代码学习，再进入题库验证。", false);

            // 2. 题库/真题专项训练
            addTask(tasks, plan.getId(), week, stage, subject,
                    "真题题库 · " + subjectLabel + "：完成 20 道" + stageLabel + "专项题",
                    "DRILL", "/user/exams?subject=" + subject, 20, "题", "ANSWER_SUBJECT:" + subject, activity, today,
                    priority(stageIdx, 1),
                    "按真实作答自动统计，正确率低于 60% 时优先回看课程中心对应章节。", true);

            // 3. 错题复盘
            addTask(tasks, plan.getId(), week, stage, "ALL",
                    "错题本 · 复盘 5 道未掌握错题并标记掌握",
                    "WRONG_REVIEW", "/user/wrong-notebook", 5, "道", "WRONG_MASTERED_TOTAL", activity, today,
                    priority(stageIdx, 2),
                    "错题本会记录真实错题，标记掌握后自动同步进度。", true);

            // 4. 每周轮换：模考 / 笔记 / AI 问答 / 每日补给
            int rotate = week % 4;
            if (rotate == 0) {
                addTask(tasks, plan.getId(), week, stage, "ALL",
                        "全真模拟考场 · 完成 1 套 180 分钟整卷模考",
                        "MOCK", "/user/exam-hall", 1, "套", "MOCK_COUNT", activity, today,
                        priority(stageIdx, 3),
                        "严格按考试时间交卷，系统自动生成战报并计入进度。", true);
            } else if (rotate == 1) {
                addTask(tasks, plan.getId(), week, stage, "ALL",
                        "考研云笔记 · 输出 1 篇本周复盘笔记",
                        "NOTES", "/user/notes", 1, "篇", "NOTE_COUNT", activity, today,
                        priority(stageIdx, 3),
                        "把本周最容易混淆的考点写成自己的话，保存后自动完成。", true);
            } else if (rotate == 2) {
                addTask(tasks, plan.getId(), week, stage, weakest,
                        "研炼问答助手 · 向 AI 追问 2 个 " + subjectName(weakest) + " 薄弱考点",
                        "AI_QA", "/user/qa", 2, "个", null, activity, today,
                        priority(stageIdx, 3),
                        "把仍然模糊的考点直接问 AI，结合回答里的引用回到知识库原文。", false);
            } else {
                addTask(tasks, plan.getId(), week, stage, "ALL",
                        "每日补给 · 连续完成 5 天知识点与配套题",
                        "DAILY", "/user/daily-push", 5, "天", "DAILY_PUSH_DAYS", activity, today,
                        priority(stageIdx, 3),
                        "每天完成每日补给，系统按真实作答日期自动累计天数。", true);
            }

            // 5. 每两周一次知识图谱梳理
            if (week % 2 == 0) {
                addTask(tasks, plan.getId(), week, stage, "ALL",
                        "408 知识图谱 · 梳理 10 个薄弱考点并标记疑问",
                        "GRAPH", "/user/knowledge-graph", 10, "个", null, activity, today,
                        priority(stageIdx, 4),
                        "在知识图谱中定位薄弱章节，完成后手动打卡。", false);
            }
        }

        // 把目标院校/分数写进任务说明，强化目标感。
        for (UserStudyPlanTask task : tasks) {
            task.setDescription(task.getDescription() + " 目标：" + targetSchool + " " + targetScore + " 分。");
        }
        return tasks;
    }

    private String stageForRatio(double ratio, long daysLeft) {
        if (daysLeft <= 45) return "SPRINT";
        if (ratio < 0.42) return "BASIC";
        if (ratio < 0.68) return "ENHANCE";
        if (ratio < 0.9) return "TRUE_EXAM";
        return "SPRINT";
    }

    private String stageName(String stage) {
        return switch (stage) {
            case "BASIC" -> "基础";
            case "ENHANCE" -> "强化";
            case "TRUE_EXAM" -> "真题";
            case "SPRINT" -> "冲刺";
            default -> "备考";
        };
    }

    /**
     * 把 24 个任务压缩到“距离考试还剩的周数”内，避免只剩 38 天却出现第 13 周任务。
     */
    private void scheduleTasks(List<UserStudyPlanTask> tasks, long daysLeft, LocalDate today) {
        if (tasks.isEmpty()) return;
        int totalWeeks = (int) Math.max(1, Math.ceil(daysLeft / 7.0));
        for (UserStudyPlanTask task : tasks) {
            int week = task.getWeekNumber() != null ? task.getWeekNumber() : 1;
            week = Math.min(totalWeeks, Math.max(1, week));
            task.setWeekNumber(week);
            task.setDueDate(today.plusWeeks(week - 1L));
        }
    }

    private int addTask(List<UserStudyPlanTask> tasks, Long planId, int week, String stage, String subject,
                        String title, String taskType, String route, int targetCount, String unit,
                        String autoRule, Map<String, Object> activity, LocalDate today, int priority,
                        String description, boolean auto) {
        LocalDate due = today.plusWeeks(Math.max(0, week - 1));
        int baseline = autoRule == null ? 0 : (int) currentForRule(autoRule, activity);
        UserStudyPlanTask task = UserStudyPlanTask.builder()
                .planId(planId)
                .weekNumber(week)
                .stage(stage)
                .subjectCode(subject)
                .title(title)
                .taskType(taskType)
                .targetChapterId(null)
                .isCompleted(0)
                .description(description)
                .targetRoute(route)
                .targetCount(targetCount)
                .progressCurrent(0)
                .progressUnit(unit)
                .autoRule(autoRule)
                .baselineValue(baseline)
                .dueDate(due)
                .priority(priority)
                .isAuto(auto ? 1 : 0)
                .lastSyncedAt(LocalDateTime.now())
                .build();
        tasks.add(task);
        return week + 1;
    }

    private int priority(int currentStageIndex, int taskStageIndex) {
        int distance = taskStageIndex - currentStageIndex;
        if (distance == 0) return 5;
        if (distance == 1) return 4;
        if (distance < 0) return 2;
        return 3;
    }

    private int stageIndex(String stage) {
        return switch (stage) {
            case "BASIC" -> 0;
            case "ENHANCE" -> 1;
            case "TRUE_EXAM" -> 2;
            case "SPRINT" -> 3;
            default -> 0;
        };
    }

    private String subjectName(String code) {
        return SUBJECT_NAMES.getOrDefault(code, code);
    }

    private String determineStage(SysUser user, long daysLeft) {
        // 先按剩余天数给出“最低应处阶段”，再与用户自报阶段取更靠后的一个。
        // 这样不会出现“只剩 38 天但规划仍停留在基础阶段”的冲突。
        String daysStage = daysLeft <= 45 ? "SPRINT"
                : daysLeft <= 90 ? "TRUE_EXAM"
                : daysLeft <= 180 ? "ENHANCE"
                : "BASIC";
        if (user != null && user.getPrepStage() != null) {
            String userStage = switch (user.getPrepStage().toUpperCase()) {
                case "BASIC" -> "BASIC";
                case "INTENSIVE", "ENHANCE" -> "ENHANCE";
                case "TRUE_EXAMS", "TRUE_EXAM" -> "TRUE_EXAM";
                case "SPRINT" -> "SPRINT";
                default -> daysStage;
            };
            if (stageIndex(userStage) > stageIndex(daysStage)) {
                return userStage;
            }
        }
        return daysStage;
    }

    private String determineBaseLevel(Map<String, Object> activity) {
        long answered = longValue(activity.get("answeredTotal"));
        double accuracy = doubleValue(activity.get("accuracy"));
        if (answered < 50 || accuracy < 0.60) return "ZERO";
        if (accuracy < 0.75) return "MEDIUM";
        return "ADVANCED";
    }

    private BigDecimal dailyHours(String baseLevel, String stage) {
        double hours = switch (baseLevel) {
            case "ZERO" -> 5.5;
            case "ADVANCED" -> 4.0;
            default -> 4.5;
        };
        if ("SPRINT".equals(stage)) hours += 0.5;
        return BigDecimal.valueOf(Math.min(8.0, hours)).setScale(1, RoundingMode.HALF_UP);
    }

    private Map<String, Object> buildActivity(Long userId) {
        Map<String, Object> totals = activityMapper.selectUserTotals(userId);
        if (totals == null) totals = new LinkedHashMap<>();

        long answeredTotal = longValue(totals.get("answeredTotal"));
        long correctTotal = longValue(totals.get("correctTotal"));
        double accuracy = answeredTotal > 0 ? (double) correctTotal / answeredTotal : 0.0;

        Map<String, Map<String, Object>> subjectStats = new LinkedHashMap<>();
        for (String code : SUBJECTS) {
            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("subjectCode", code);
            stat.put("subjectName", subjectName(code));
            stat.put("answered", 0L);
            stat.put("correct", 0L);
            stat.put("accuracy", 0.0);
            stat.put("total", 0L);
            stat.put("coverage", 0.0);
            stat.put("mastery", 0.0);
            stat.put("masteredWrong", 0L);
            subjectStats.put(code, stat);
        }

        for (Map<String, Object> row : activityMapper.selectSubjectAnswerCounts(userId)) {
            String code = upper(row.get("subjectCode"));
            if (code == null || !subjectStats.containsKey(code)) continue;
            Map<String, Object> stat = subjectStats.get(code);
            long answered = longValue(row.get("answered"));
            long correct = longValue(row.get("correct"));
            stat.put("answered", answered);
            stat.put("correct", correct);
            stat.put("accuracy", answered > 0 ? (double) correct / answered : 0.0);
        }
        for (Map<String, Object> row : activityMapper.selectQuestionTotalsBySubject()) {
            String code = upper(row.get("subjectCode"));
            if (code == null || !subjectStats.containsKey(code)) continue;
            subjectStats.get(code).put("total", longValue(row.get("total")));
        }
        for (Map<String, Object> row : activityMapper.selectMasteryBySubject(userId)) {
            String code = upper(row.get("subjectCode"));
            if (code == null || !subjectStats.containsKey(code)) continue;
            subjectStats.get(code).put("mastery", doubleValue(row.get("avgAccuracy")));
        }
        for (Map<String, Object> row : activityMapper.selectWrongMasteredBySubject(userId)) {
            String code = upper(row.get("subjectCode"));
            if (code == null || !subjectStats.containsKey(code)) continue;
            subjectStats.get(code).put("masteredWrong", longValue(row.get("mastered")));
        }
        long questionTotal = 0;
        for (Map<String, Object> stat : subjectStats.values()) {
            long total = longValue(stat.get("total"));
            long answered = longValue(stat.get("answered"));
            stat.put("coverage", total > 0 ? Math.min(1.0, (double) answered / total) : 0.0);
            questionTotal += total;
        }

        String weakest = "DS";
        double lowest = Double.MAX_VALUE;
        boolean found = false;
        for (Map<String, Object> stat : subjectStats.values()) {
            long answered = longValue(stat.get("answered"));
            if (answered < 10) continue;
            double acc = doubleValue(stat.get("accuracy"));
            if (acc < lowest) {
                lowest = acc;
                weakest = String.valueOf(stat.get("subjectCode"));
                found = true;
            }
        }
        if (!found) {
            // 没有足够作答数据时，优先选择错题最多的科目；仍无数据则默认数据结构。
            weakest = subjectStats.values().stream()
                    .max(Comparator.comparingLong(item -> longValue(item.get("masteredWrong"))))
                    .map(item -> String.valueOf(item.get("subjectCode")))
                    .orElse("DS");
        }

        Map<String, Object> activity = new LinkedHashMap<>();
        activity.put("answeredTotal", answeredTotal);
        activity.put("correctTotal", correctTotal);
        activity.put("accuracy", accuracy);
        activity.put("mockCount", longValue(totals.get("mockCount")));
        activity.put("noteCount", longValue(totals.get("noteCount")));
        activity.put("wrongTotal", longValue(totals.get("wrongTotal")));
        activity.put("wrongOpen", longValue(totals.get("wrongOpen")));
        activity.put("wrongMastered", longValue(totals.get("wrongMastered")));
        activity.put("dailyPushDays", activityMapper.selectDailyPushDays(userId));
        activity.put("questionTotal", questionTotal);
        activity.put("coverage", questionTotal > 0 ? Math.min(1.0, (double) answeredTotal / questionTotal) : 0.0);
        activity.put("weakestSubject", weakest);
        activity.put("subjectStats", subjectStats);
        activity.put("recentDaily", activityMapper.selectRecentDailyActivity(userId, 7));
        activity.put("lastMock", activityMapper.selectLastMock(userId));
        activity.put("syncedAt", LocalDateTime.now());
        return activity;
    }

    private long currentForRule(String rule, Map<String, Object> activity) {
        if (rule == null) return 0;
        if (rule.startsWith("ANSWER_SUBJECT:")) {
            String code = rule.substring("ANSWER_SUBJECT:".length());
            Map<String, Object> stat = subjectStat(activity, code);
            return longValue(stat.get("answered"));
        }
        if (rule.startsWith("WRONG_MASTERED_SUBJECT:")) {
            String code = rule.substring("WRONG_MASTERED_SUBJECT:".length());
            Map<String, Object> stat = subjectStat(activity, code);
            return longValue(stat.get("masteredWrong"));
        }
        return switch (rule) {
            case "ANSWER_TOTAL" -> longValue(activity.get("answeredTotal"));
            case "MOCK_COUNT" -> longValue(activity.get("mockCount"));
            case "NOTE_COUNT" -> longValue(activity.get("noteCount"));
            case "WRONG_MASTERED_TOTAL" -> longValue(activity.get("wrongMastered"));
            case "DAILY_PUSH_DAYS" -> longValue(activity.get("dailyPushDays"));
            default -> 0;
        };
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> subjectStat(Map<String, Object> activity, String code) {
        Object stats = activity.get("subjectStats");
        if (stats instanceof Map<?, ?> map) {
            Object stat = map.get(upper(code));
            if (stat instanceof Map<?, ?> statMap) {
                return (Map<String, Object>) statMap;
            }
        }
        return Collections.emptyMap();
    }

    private String upper(Object value) {
        return value == null ? null : value.toString().toUpperCase(Locale.ROOT);
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

    private double doubleValue(Object value) {
        if (value instanceof Number number) return number.doubleValue();
        if (value == null) return 0.0;
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException ignored) {
            return 0.0;
        }
    }
}
