package com.example.mcs.service;

import com.example.mcs.dto.ExamSubmitDTO;
import com.example.mcs.entity.TestRecord;
import com.example.mcs.entity.UserWrongQuestion;
import com.example.mcs.vo.TestGradingResultVO;

import java.util.List;

public interface TestService {
    TestGradingResultVO submitExam(ExamSubmitDTO submitDTO);
    TestGradingResultVO getTestReport(Long testRecordId);
    List<TestRecord> getUserTestRecords(Long userId);
    List<UserWrongQuestion> getUserWrongQuestions(Long userId, String subjectCode, String masterStatus);
    void clearUserWrongQuestions(Long userId);
    boolean deleteWrongQuestion(Long userId, Long id);
    boolean updateWrongQuestionMasterStatus(Long userId, Long id, String masterStatus);
}

