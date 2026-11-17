package com.example.mcs.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamQuestionSub implements Serializable {
    private Long id;
    private String questionId;
    private Integer subNumber;
    private String subStem;
    private Integer score;
    private String standardAnswer;
    private String rubricPointsJson;
}

