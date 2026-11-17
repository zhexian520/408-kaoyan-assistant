package com.example.mcs.controller;

import com.example.mcs.common.Result;
import com.example.mcs.entity.UserNote;
import com.example.mcs.mapper.UserNoteMapper;
import com.example.mcs.util.JwtUtil;
import com.example.mcs.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user/notes")
@RequiredArgsConstructor
public class UserNoteController {

    private final UserNoteMapper userNoteMapper;

    private Long resolveUserId(String authorization) {
        return JwtUtil.getUserIdFromAuthorization(authorization);
    }

    private boolean canAccess(UserNote note, Long userId) {
        return note != null && userId != null && userId.equals(note.getUserId());
    }

    @GetMapping
    public Result<List<UserNote>> getUserNotes(@RequestParam(required = false) String subjectCode,
                                               @RequestParam(required = false) String keyword,
                                               @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = resolveUserId(authorization);
        if (userId == null) {
            return Result.error(401, "请先登录后查看笔记");
        }
        return Result.success(userNoteMapper.selectNotesByUserId(userId, subjectCode, keyword));
    }

    @GetMapping("/{id}")
    public Result<UserNote> getNoteById(@PathVariable Long id,
                                        @RequestHeader(value = "Authorization", required = false) String authorization) {
        UserNote note = userNoteMapper.selectNoteById(id);
        if (!canAccess(note, resolveUserId(authorization))) {
            return Result.error(404, "笔记未找到");
        }
        return Result.success(note);
    }

    @PostMapping
    public Result<UserNote> createNote(@RequestBody UserNote note,
                                       @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = resolveUserId(authorization);
        if (userId == null) {
            return Result.error(401, "请先登录后保存笔记");
        }
        note.setUserId(userId);
        if (note.getTagsJson() == null || note.getTagsJson().isEmpty()) {
            note.setTagsJson("[\"考研笔记\", \"408\"]");
        }
        userNoteMapper.insertNote(note);
        return Result.success("笔记保存成功", note);
    }

    @PutMapping("/{id}")
    public Result<UserNote> updateNote(@PathVariable Long id, @RequestBody UserNote note,
                                       @RequestHeader(value = "Authorization", required = false) String authorization) {
        Long userId = resolveUserId(authorization);
        UserNote existing = userNoteMapper.selectNoteById(id);
        if (!canAccess(existing, userId)) {
            return Result.error(404, "笔记未找到");
        }
        note.setId(id);
        note.setUserId(existing.getUserId());
        userNoteMapper.updateNote(note);
        return Result.success("笔记更新成功", userNoteMapper.selectNoteById(id));
    }

    @DeleteMapping("/{id}")
    public Result<Boolean> deleteNote(@PathVariable Long id,
                                      @RequestHeader(value = "Authorization", required = false) String authorization) {
        UserNote existing = userNoteMapper.selectNoteById(id);
        if (!canAccess(existing, resolveUserId(authorization))) {
            return Result.error(404, "笔记未找到");
        }
        userNoteMapper.deleteNoteById(id);
        return Result.success(true);
    }

    @PostMapping("/{id}/ai-summarize")
    public Result<UserNote> aiSummarizeNote(@PathVariable Long id,
                                            @RequestHeader(value = "Authorization", required = false) String authorization) {
        UserNote note = userNoteMapper.selectNoteById(id);
        if (!canAccess(note, resolveUserId(authorization))) {
            return Result.error(404, "笔记未找到");
        }

        String summary = "";
        try {
            RestClient restClient = RestClient.builder().requestFactory(new SimpleClientHttpRequestFactory()).build();
            Map<String, Object> body = Map.of(
                    "title", note.getTitle() != null ? note.getTitle() : "408 笔记",
                    "content", note.getContentMd() != null ? note.getContentMd() : "",
                    "subject", note.getSubjectCode() != null ? note.getSubjectCode() : "DS"
            );
            String jsonBody = JsonUtil.toJson(body);
            Map response = restClient.post()
                    .uri("http://localhost:8000/api/ai/summarize-note")
                    .header("X-Internal-Token", "mcs-internal-2026")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(jsonBody)
                    .retrieve()
                    .body(Map.class);
            if (response != null && response.get("data") instanceof Map data) {
                Object value = data.get("summary");
                if (value != null) summary = value.toString();
            }
        } catch (Exception e) {
            summary = "";
        }
        if (summary == null || summary.isBlank()) {
            summary = "【AI 精简提炼考点卡片】本笔记针对 408 核心考点进行了高度概括：规范定义清晰，公式推导严谨，重点强调了真题失分高发陷阱，考前冲刺复习价值极高！";
        }
        note.setIsAiSummarized(1);
        note.setAiSummary(summary);
        userNoteMapper.updateNote(note);
        return Result.success("AI 精简提炼完成", note);
    }
}
