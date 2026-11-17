package com.example.mcs.dto;

import lombok.Data;

import java.io.Serializable;

@Data
public class ExamAnswerItemDTO implements Serializable {
    private String questionId;
    private Long subQuestionId;
    private String userAnswer;
}

