package com.example.mcs.dto;

import lombok.Data;

import java.io.Serializable;

@Data
public class QuestionQueryDTO implements Serializable {
    private Integer year;
    private String subjectCode;
    private String questionType;
    private Integer difficulty;
    private String chapterName;
    private String knowledgePoint;
    private String keyword;
    private Integer pageNum = 1;
    private Integer pageSize = 10;
}

