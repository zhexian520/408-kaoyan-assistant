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
public class UserWrongQuestion implements Serializable {
    private Long id;
    private Long userId;
    private String questionId;
    private String customQuestionJson;
    private String subjectCode;
    private String knowledgeBlockId;
    private String sourceType;
    private Integer wrongCount;
    private String masterStatus;
    private String errorReasonTag;
    private String userNotes;
    private String lastWrongAnswer;
    private LocalDateTime lastPracticedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

