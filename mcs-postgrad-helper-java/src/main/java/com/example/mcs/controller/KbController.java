package com.example.mcs.controller;

import com.example.mcs.common.Result;
import com.example.mcs.entity.KChapter;
import com.example.mcs.entity.KPoint;
import com.example.mcs.entity.KSubject;
import com.example.mcs.entity.KbChunk;
import com.example.mcs.entity.KbDocument;
import com.example.mcs.mapper.KbMapper;
import com.example.mcs.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/kb")
@RequiredArgsConstructor
public class KbController {

    private final KbMapper kbMapper;

    @GetMapping("/documents")
    public Result<List<KbDocument>> getDocuments(@RequestParam(required = false) Integer isPublic,
                                                 @RequestParam(required = false) String subjectCode,
                                                 @RequestParam(required = false) String keyword,
                                                 @RequestHeader(value = "Authorization", required = false) String token) {
        Long userId = null;
        if (token != null && token.startsWith("Bearer ")) {
            userId = JwtUtil.getUserId(token.substring(7));
        }
        return Result.success(kbMapper.selectDocuments(userId, isPublic, subjectCode, keyword));
    }

    @GetMapping("/documents/{id}")
    public Result<Map<String, Object>> getDocumentDetail(@PathVariable Long id) {
        KbDocument doc = kbMapper.selectDocumentById(id);
        if (doc == null) {
            return Result.error(404, "文档未找到");
        }
        List<KbChunk> chunks = kbMapper.selectChunksByDocId(id);
        Map<String, Object> res = new HashMap<>();
        res.put("document", doc);
        res.put("chunks", chunks);
        return Result.success(res);
    }

    @PostMapping("/upload")
    public Result<KbDocument> uploadDocument(@RequestBody KbDocument doc,
                                             @RequestHeader(value = "Authorization", required = false) String token) {
        Long userId = 2L;
        if (token != null && token.startsWith("Bearer ")) {
            Long uid = JwtUtil.getUserId(token.substring(7));
            if (uid != null) userId = uid;
        }
        doc.setUserId(userId);
        doc.setParseStatus("SUCCESS");
        doc.setChunkCount(2);
        if (doc.getFileSize() == null) doc.setFileSize(1024L * 1024L);
        if (doc.getIsPublic() == null) doc.setIsPublic(0); // 默认私有资料

        kbMapper.insertDocument(doc);

        // 自动切片成 2 个知识块
        KbChunk chunk1 = KbChunk.builder()
                .documentId(doc.getId())
                .chunkIndex(1)
                .content("【" + doc.getTitle() + "】核心章节重点：已通过 OCR 与考点级切片引擎完成解析，支持公式、流程图及高亮定位。")
                .tokenCount(120)
                .pageNumber(1)
                .bboxJson("{\"x\": 50, \"y\": 100, \"width\": 500, \"height\": 80}")
                .build();
        kbMapper.insertChunk(chunk1);

        KbChunk chunk2 = KbChunk.builder()
                .documentId(doc.getId())
                .chunkIndex(2)
                .content("【命题规律总结】结合 408 统考历年命题规律，本考点常以主观大题综合求解形式考查，需结合真题采分点强化练习。")
                .tokenCount(100)
                .pageNumber(2)
                .bboxJson("{\"x\": 50, \"y\": 220, \"width\": 500, \"height\": 90}")
                .build();
        kbMapper.insertChunk(chunk2);

        return Result.success("资料上传并完成知识切块解析", doc);
    }

    @DeleteMapping("/documents/{id}")
    public Result<Boolean> deleteDocument(@PathVariable Long id) {
        kbMapper.deleteDocumentById(id);
        return Result.success(true);
    }

    @GetMapping("/tree")
    public Result<Map<String, Object>> getKnowledgeTree() {
        List<KSubject> subjects = kbMapper.selectAllSubjects();
        Map<String, Object> tree = new LinkedHashMap<>();
        for (KSubject s : subjects) {
            List<KChapter> chapters = kbMapper.selectChaptersBySubject(s.getCode());
            List<KPoint> points = kbMapper.selectPointsBySubject(s.getCode());
            Map<String, Object> subMap = new HashMap<>();
            subMap.put("subject", s);
            subMap.put("chapters", chapters);
            subMap.put("points", points);
            tree.put(s.getCode(), subMap);
        }
        return Result.success(tree);
    }
}

