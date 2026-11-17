package com.example.mcs.dto;

import lombok.Data;

import java.io.Serializable;
import java.util.List;

@Data
public class ExamSubmitDTO implements Serializable {
    private Long userId = 1L;
    private Long paperId;
    private String testTitle;
    private String testType = "FULL_MOCK";
    private Integer timeSpentSeconds = 0;
    private List<ExamAnswerItemDTO> answers;
}

