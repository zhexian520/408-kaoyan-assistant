package com.example.mcs.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

/**
 * 个性化备考规划使用的真实学习活动聚合查询。
 * 所有统计都以登录用户为维度，避免前端固定 userId 造成串号。
 */
@Mapper
public interface StudyActivityMapper {

    Map<String, Object> selectUserTotals(@Param("userId") Long userId);

    List<Map<String, Object>> selectSubjectAnswerCounts(@Param("userId") Long userId);

    List<Map<String, Object>> selectWrongMasteredBySubject(@Param("userId") Long userId);

    List<Map<String, Object>> selectQuestionTotalsBySubject();

    List<Map<String, Object>> selectMasteryBySubject(@Param("userId") Long userId);

    List<Map<String, Object>> selectRecentDailyActivity(@Param("userId") Long userId, @Param("days") int days);

    Map<String, Object> selectLastMock(@Param("userId") Long userId);

    long selectDailyPushDays(@Param("userId") Long userId);
}
