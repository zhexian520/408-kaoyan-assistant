package com.example.mcs.service;

import com.example.mcs.common.PageResult;
import com.example.mcs.dto.QuestionQueryDTO;
import com.example.mcs.entity.ExamPaper;
import com.example.mcs.vo.ExamFilterVO;
import com.example.mcs.vo.PaperDetailVO;
import com.example.mcs.vo.QuestionDetailVO;

import java.util.List;
import java.util.Map;

public interface ExamService {
    List<ExamPaper> getAllPapers();
    PaperDetailVO getPaperDetail(Long paperId, Long userId);
    PaperDetailVO getPaperByYear(Integer year, Long userId);
    PageResult<QuestionDetailVO> queryQuestions(QuestionQueryDTO query, Long userId);
    QuestionDetailVO getQuestionDetail(String questionId, Long userId);
    ExamFilterVO getExamFilters(String subjectCode);
    List<Map<String, Object>> getKnowledgePointStats(String subjectCode);
    boolean toggleFavorite(Long userId, String questionId, String tag);
    Map<String, Object> getQuestionStats();
}

