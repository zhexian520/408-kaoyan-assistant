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
public class UserKnowledgeMastery implements Serializable {
    private Long id;
    private Long userId;
    private String knowledgeBlockId;
    private String subjectCode;
    private Integer totalAttempts;
    private Integer correctAttempts;
    private BigDecimal accuracyRate;
    private String masteryLevel;
    private BigDecimal weaknessScore;
    private LocalDateTime lastPracticedAt;
    private LocalDateTime updatedAt;
}

