package com.example.mcs.service;

import com.example.mcs.vo.UserDashboardVO;

public interface UserDashboardService {
    UserDashboardVO getUserDashboardStats(Long userId);
    boolean updateUserTarget(Long userId, String targetSchool, Integer targetScore, Integer examYear, String prepStage);
}

