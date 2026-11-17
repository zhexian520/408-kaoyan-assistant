package com.example.mcs.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestAnswerDetailVO implements Serializable {
    private String questionId;
    private Integer questionNumber;
    private String questionType;
    private String subjectCode;
    private String stem;
    private Integer maxScore;
    private String standardAnswer;
    private String userAnswer;
    private Integer isCorrect;
    private BigDecimal scoreEarned;
    private String aiFeedback;
    private List<String> missingPoints;
    private String errorAnalysis;
    private String optimizationAdvice;
    private String explanation;
}

