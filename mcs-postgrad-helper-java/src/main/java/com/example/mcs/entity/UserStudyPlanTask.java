package com.example.mcs.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStudyPlanTask implements Serializable {
    private Long id;
    private Long planId;
    private Integer weekNumber;
    private String stage;
    private String subjectCode;
    private String title;
    private String taskType;
    private String targetChapterId;
    private Integer isCompleted;
    private LocalDateTime completedAt;
    private String description;
    private String targetRoute;
    private Integer targetCount;
    private Integer progressCurrent;
    private String progressUnit;
    private String autoRule;
    private Integer baselineValue;
    private LocalDate dueDate;
    private Integer priority;
    private Integer isAuto;
    private LocalDateTime lastSyncedAt;
}

