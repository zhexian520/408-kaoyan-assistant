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
public class ExamPaper implements Serializable {
    private Long id;
    private Integer year;
    private String title;
    private Integer totalScore;
    private Integer durationMinutes;
    private Integer questionCount;
    private String paperType;
    private Integer status;
    private LocalDateTime createdAt;
}

