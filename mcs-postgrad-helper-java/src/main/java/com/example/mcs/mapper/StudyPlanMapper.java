package com.example.mcs.mapper;

import com.example.mcs.entity.UserStudyPlan;
import com.example.mcs.entity.UserStudyPlanTask;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface StudyPlanMapper {
    UserStudyPlan selectActivePlanByUserId(@Param("userId") Long userId);
    int insertPlan(UserStudyPlan plan);
    int updatePlan(UserStudyPlan plan);
    List<UserStudyPlanTask> selectTasksByPlanId(@Param("planId") Long planId);
    int insertTask(UserStudyPlanTask task);
    int updateTaskCompletion(@Param("taskId") Long taskId, @Param("isCompleted") Integer isCompleted);
    int updateTaskProgress(@Param("taskId") Long taskId,
                           @Param("progressCurrent") Integer progressCurrent,
                           @Param("isCompleted") Integer isCompleted,
                           @Param("lastSyncedAt") LocalDateTime lastSyncedAt);
    int deactivatePlans(@Param("userId") Long userId);
}

