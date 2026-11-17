package com.example.mcs.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStudyPlan implements Serializable {
    private Long id;
    private Long userId;
    private String planName;
    private Integer prepDurationMonths;
    private String baseLevel;
    private Integer targetScore;
    private String currentStage;
    private LocalDate startDate;
    private LocalDate examDate;
    private BigDecimal dailyTargetHours;
    private Integer isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

