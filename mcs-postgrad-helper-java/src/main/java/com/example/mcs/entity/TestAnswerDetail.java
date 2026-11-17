package com.example.mcs.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestAnswerDetail implements Serializable {
    private Long id;
    private Long testRecordId;
    private String questionId;
    private Long subQuestionId;
    private String userAnswer;
    private Integer isCorrect;
    private BigDecimal scoreEarned;
    private String aiFeedback;
    private String missingPointsJson;
    private String errorAnalysis;
    private String rubricMatchedJson;
    private String optimizationAdvice;
    private String gradedBy;
    private LocalDateTime gradedAt;
}

