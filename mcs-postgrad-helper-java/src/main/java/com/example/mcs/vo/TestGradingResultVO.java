package com.example.mcs.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestGradingResultVO implements Serializable {
    private Long testRecordId;
    private Long paperId;
    private String testTitle;
    private Integer totalScore;
    private BigDecimal userScore;
    private Integer timeSpentSeconds;
    private Integer totalCount;
    private Integer correctCount;
    private Integer wrongCount;
    private BigDecimal accuracyRate;
    private Map<String, BigDecimal> subjectScores;
    private List<TestAnswerDetailVO> details;
    private List<String> weakPoints;
    private String aiReportSummary;
}

