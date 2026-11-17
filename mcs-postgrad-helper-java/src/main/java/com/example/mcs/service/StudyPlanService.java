package com.example.mcs.service;

import com.example.mcs.entity.UserStudyPlan;
import com.example.mcs.entity.UserStudyPlanTask;

import java.util.List;
import java.util.Map;

public interface StudyPlanService {

    Map<String, Object> getPlanData(Long userId);

    Map<String, Object> generatePlan(Long userId);

    boolean toggleTask(Long userId, Long taskId, Integer isCompleted);

    UserStudyPlan getActivePlan(Long userId);

    List<UserStudyPlanTask> getTasks(Long planId);

    Map<String, Object> addRemedialTask(Long userId, Map<String, Object> payload);
}
