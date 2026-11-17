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
public class ExamQuestion implements Serializable {
    private String id;
    private Long paperId;
    private Integer year;
    private Integer questionNumber;
    private Integer score;
    private String questionType;
    private String subjectCode;
    private String chapterName;
    private String stem;
    private String optionsJson;
    private String answer;
    private Integer difficulty;
    private String tagsJson;
    private String explanation;
    private String examPointAnalysis;
    private String resourceLinksJson;
    private Integer isVariant;
    private String parentQuestionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

