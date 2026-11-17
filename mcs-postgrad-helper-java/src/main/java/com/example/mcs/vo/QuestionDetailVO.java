package com.example.mcs.vo;

import com.example.mcs.entity.ExamQuestionSub;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionDetailVO implements Serializable {
    private String id;
    private Long paperId;
    private Integer year;
    private Integer questionNumber;
    private Integer score;
    private String questionType;
    private String subjectCode;
    private String subjectName;
    private String chapterName;
    private String stem;
    private List<Map<String, Object>> options;
    private String answer;
    private Integer difficulty;
    private List<String> tags;
    private String explanation;
    private String examPointAnalysis;
    private List<String> resourceLinks;
    private List<String> knowledgeBlockIds;
    private List<ExamQuestionSub> subQuestions;
    private Boolean isFavorited;
}

