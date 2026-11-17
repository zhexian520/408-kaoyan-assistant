package com.example.mcs.vo;

import com.example.mcs.entity.SysUser;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardVO {
    private Long totalUsers;
    private Long todayNewUsers;
    private Integer totalExamPapers;
    private Long totalQuestions;
    private Long totalTestSubmissions;
    private Long totalAiGradingCalls;
    private Double avgExamScore;
    private String aiEngineStatus;
    private String javaBackendStatus;
    private Map<String, Integer> subjectQuestionStats;
    private List<RecentSubmissionVO> recentSubmissions;
    private List<SysUser> recentUsers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentSubmissionVO {
        private Long id;
        private Long userId;
        private String username;
        private String nickname;
        private Long paperId;
        private String testTitle;
        private Double userScore;
        private Double totalScore;
        private Integer timeSpentSeconds;
        private LocalDateTime submitTime;
    }
}

