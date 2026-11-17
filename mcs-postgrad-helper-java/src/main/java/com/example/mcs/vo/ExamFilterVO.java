package com.example.mcs.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamFilterVO implements Serializable {
    private List<Integer> years;
    private List<SubjectOptionVO> subjects;
    private List<String> questionTypes;
    private List<Integer> difficulties;
    private List<String> chapters;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SubjectOptionVO implements Serializable {
        private String value;
        private String label;
    }
}

