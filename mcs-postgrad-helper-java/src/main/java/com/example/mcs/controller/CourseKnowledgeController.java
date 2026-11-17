package com.example.mcs.controller;

import com.example.mcs.common.Result;
import com.example.mcs.mapper.CourseKnowledgeMapper;
import com.example.mcs.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api/kb/course")
@RequiredArgsConstructor
public class CourseKnowledgeController {

    private final CourseKnowledgeMapper courseKnowledgeMapper;

    private static final Map<String, String> SUBJECT_NAMES = Map.of(
            "DS", "数据结构",
            "CO", "计算机组成原理",
            "OS", "操作系统",
            "CN", "计算机网络"
    );

    @GetMapping("/graph")
    public Result<List<Map<String, Object>>> getKnowledgeGraph() {
        List<Map<String, Object>> rows = courseKnowledgeMapper.selectAllGraphRows();
        Map<String, Map<String, Object>> subjects = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String code = String.valueOf(row.get("subjectCode")).toUpperCase();
            if ("NET".equals(code)) code = "CN";
            String subjectName = SUBJECT_NAMES.getOrDefault(code, code);
            Map<String, Object> subject = subjects.computeIfAbsent(code, key -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("subject", subjectName);
                item.put("code", key);
                item.put("chapters", new LinkedHashMap<String, Map<String, Object>>());
                return item;
            });

            @SuppressWarnings("unchecked")
            Map<String, Map<String, Object>> chapters = (Map<String, Map<String, Object>>) subject.get("chapters");
            String chapterTitle = row.get("chapterTitle") != null ? row.get("chapterTitle").toString() : "未分类章节";
            Map<String, Object> chapter = chapters.computeIfAbsent(chapterTitle, key -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("chapter_id", row.get("chapterId"));
                item.put("chapter_title", chapterTitle);
                item.put("chapter_order", row.get("chapterOrder"));
                item.put("points", new ArrayList<Map<String, Object>>());
                return item;
            });

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> points = (List<Map<String, Object>>) chapter.get("points");
            boolean keyPoint = row.get("importance") instanceof Number n && n.intValue() >= 4;
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("id", row.get("pointId"));
            point.put("title", row.get("pointTitle"));
            point.put("difficulty", keyPoint ? "重点" : "基础");
            point.put("importance", keyPoint ? "重要" : "一般");
            point.put("related_point_ids", Collections.emptyList());
            point.put("prerequisite_ids", Collections.emptyList());
            point.put("cross_subject_point_ids", Collections.emptyList());
            points.add(point);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> subject : subjects.values()) {
            @SuppressWarnings("unchecked")
            Map<String, Map<String, Object>> chapterMap = (Map<String, Map<String, Object>>) subject.remove("chapters");
            List<Map<String, Object>> chapterList = new ArrayList<>(chapterMap.values());
            int pointCount = chapterList.stream()
                    .mapToInt(item -> ((List<?>) item.get("points")).size())
                    .sum();
            subject.put("chapter_count", chapterList.size());
            subject.put("point_count", pointCount);
            subject.put("chapters", chapterList);
            result.add(subject);
        }
        return Result.success(result);
    }

    @GetMapping("/point/{pointId}")
    public Result<Map<String, Object>> getKnowledgePoint(@org.springframework.web.bind.annotation.PathVariable String pointId) {
        Map<String, Object> row = courseKnowledgeMapper.selectPointDetail(pointId);
        if (row == null) return Result.error(404, "知识点不存在");
        Map<String, Object> meta = JsonUtil.parseMap(row.get("metaJson") != null ? row.get("metaJson").toString() : null);
        String code = String.valueOf(row.get("subjectCode")).toUpperCase();
        if ("NET".equals(code)) code = "CN";
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", row.get("id"));
        res.put("title", row.get("title"));
        res.put("content", row.get("contentMd") != null ? row.get("contentMd") : row.get("summary"));
        res.put("subject", SUBJECT_NAMES.getOrDefault(code, code));
        res.put("chapter_title", row.get("chapterTitle"));
        res.put("score_points", meta.getOrDefault("examPitfalls", Collections.emptyList()));
        res.put("knowledge_points", JsonUtil.parseStringList(row.get("tagsJson") != null ? row.get("tagsJson").toString() : null));
        res.put("exam_questions", meta.getOrDefault("relatedTrueExams", Collections.emptyList()));
        res.put("related_point_ids", Collections.emptyList());
        res.put("cross_subject_point_ids", Collections.emptyList());
        return Result.success(res);
    }

    @GetMapping("/all")
    public Result<Map<String, Object>> getAllCourseKnowledge() {
        Map<String, Object> result = new LinkedHashMap<>();
        for (String code : new String[]{"DS", "CO", "OS", "CN"}) {
            List<Map<String, Object>> chapters = courseKnowledgeMapper.selectCourseChapters(code);
            List<Map<String, Object>> chapterList = new ArrayList<>();
            for (Map<String, Object> chapter : chapters) {
                String chapterId = String.valueOf(chapter.get("id"));
                List<Map<String, Object>> sections = courseKnowledgeMapper.selectCourseSections(chapterId);
                List<Map<String, Object>> sectionList = new ArrayList<>();
                for (Map<String, Object> section : sections) {
                    String sectionId = String.valueOf(section.get("id"));
                    List<Map<String, Object>> points = courseKnowledgeMapper.selectCoursePoints(sectionId);
                    Map<String, Object> point = points.isEmpty() ? Collections.emptyMap() : points.get(0);
                    Map<String, Object> meta = JsonUtil.parseMap(point.get("metaJson") != null ? point.get("metaJson").toString() : null);

                    Map<String, Object> sectionMap = new LinkedHashMap<>();
                    sectionMap.put("id", sectionId);
                    String prefix = "course_sec_" + code + "_";
                    String sourceId = sectionId.startsWith(prefix)
                            ? sectionId.substring(prefix.length()).replace('_', '.')
                            : sectionId;
                    sectionMap.put("sourceId", sourceId);
                    sectionMap.put("title", section.get("title"));
                    sectionMap.put("isKey", point.get("importance") instanceof Number n && n.intValue() >= 4);
                    sectionMap.put("syllabusRequirement", point.get("summary") != null ? point.get("summary") : section.get("summary"));
                    sectionMap.put("coreConcepts", point.get("contentMd") != null ? point.get("contentMd") : "");
                    sectionMap.put("examPitfalls", meta.getOrDefault("examPitfalls", Collections.emptyList()));
                    sectionMap.put("formulaList", meta.getOrDefault("formulaList", Collections.emptyList()));
                    sectionMap.put("relatedTrueExams", meta.getOrDefault("relatedTrueExams", Collections.emptyList()));
                    sectionMap.put("codeSnippet", meta.get("codeSnippet"));
                    sectionList.add(sectionMap);
                }
                Map<String, Object> chapterMap = new LinkedHashMap<>();
                chapterMap.put("id", chapterId);
                chapterMap.put("title", chapter.get("title"));
                chapterMap.put("status", "TODO");
                chapterMap.put("sections", sectionList);
                chapterList.add(chapterMap);
            }
            Map<String, Object> book = new LinkedHashMap<>();
            book.put("code", code);
            book.put("name", SUBJECT_NAMES.get(code));
            book.put("chapters", chapterList);
            result.put(code, book);
        }
        return Result.success(result);
    }
}
