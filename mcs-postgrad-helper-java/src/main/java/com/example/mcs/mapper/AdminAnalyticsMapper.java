package com.example.mcs.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface AdminAnalyticsMapper {
    Map<String, Object> selectPlatformTotals();
    List<Map<String, Object>> selectSubjectAccuracy();
    List<Map<String, Object>> selectTopWeakChapters(@Param("limit") int limit);
    List<Map<String, Object>> selectTopWrongQuestions(@Param("limit") int limit);
    List<Map<String, Object>> selectDailyActivity(@Param("days") int days);
}
