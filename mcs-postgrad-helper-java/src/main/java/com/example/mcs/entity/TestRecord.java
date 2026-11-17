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
public class TestRecord implements Serializable {
    private Long id;
    private Long userId;
    private Long paperId;
    private String testTitle;
    private String testType;
    private String subjectCode;
    private Integer totalScore;
    private BigDecimal userScore;
    private Integer timeSpentSeconds;
    private String status;
    private LocalDateTime startTime;
    private LocalDateTime submitTime;
    private String aiReportSummary;
    private String weakPointsJson;
    private LocalDateTime createdAt;
}

