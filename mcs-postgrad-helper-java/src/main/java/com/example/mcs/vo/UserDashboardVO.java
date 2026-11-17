package com.example.mcs.vo;

import com.example.mcs.entity.TestRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDashboardVO {
    private Long userId;
    private String username;
    private String nickname;
    private String targetSchool;
    private Integer targetScore;
    private Integer examYear;
    private String prepStage;
    private Integer daysUntilExam;
    private Integer totalTestsTaken;
    private Double highestScore;
    private Double avgScore;
    private Integer wrongQuestionsCount;
    private Integer masteredQuestionsCount;
    private List<SubjectMasteryVO> subjectMastery;
    private List<TestRecord> recentRecords;
    private List<String> weakKnowledgePoints;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubjectMasteryVO {
        private String subjectCode;
        private String subjectName;
        private Integer totalQuestions;
        private Integer practicedCount;
        private Double correctRate;
        private String masteryLevel; // 精通 / 良好 / 待巩固 / 薄弱
        private String icon;
    }
}

