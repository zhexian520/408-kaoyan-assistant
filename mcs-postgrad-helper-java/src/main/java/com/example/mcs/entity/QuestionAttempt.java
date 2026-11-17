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
public class QuestionAttempt implements Serializable {
    private Long id;
    private Long userId;
    private String questionId;
    private String subjectCode;
    private Integer isCorrect;
    private String userAnswer;
    private String sourceType;
    private LocalDateTime createdAt;
}
