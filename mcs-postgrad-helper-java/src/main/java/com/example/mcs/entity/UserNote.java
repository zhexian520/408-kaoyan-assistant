package com.example.mcs.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserNote implements Serializable {
    private Long id;
    private Long userId;
    private String title;
    private String subjectCode;
    private String contentMd;
    private String tagsJson;
    private String relatedKnowledgeId;
    private String relatedQuestionId;
    private String excerptSource;
    private Integer isAiSummarized;
    private String aiSummary;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

