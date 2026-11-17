package com.example.mcs.mapper;

import com.example.mcs.entity.ExamPaper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ExamPaperMapper {
    List<ExamPaper> selectAllPapers(@Param("status") Integer status);
    ExamPaper selectById(@Param("id") Long id);
    ExamPaper selectByYear(@Param("year") Integer year);
    List<Integer> selectDistinctYears();
    int refreshQuestionCount(@Param("paperId") Long paperId);
}

