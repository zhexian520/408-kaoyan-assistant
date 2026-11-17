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
public class UserQuestionFavorite implements Serializable {
    private Long id;
    private Long userId;
    private String questionId;
    private String tag;
    private String note;
    private LocalDateTime createdAt;
}

