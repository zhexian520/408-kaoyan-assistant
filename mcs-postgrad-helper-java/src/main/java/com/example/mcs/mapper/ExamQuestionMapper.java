package com.example.mcs.mapper;

import com.example.mcs.dto.QuestionQueryDTO;
import com.example.mcs.entity.ExamQuestion;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface ExamQuestionMapper {
    ExamQuestion selectById(@Param("id") String id);
    List<ExamQuestion> selectByPaperId(@Param("paperId") Long paperId);
    List<ExamQuestion> selectByYear(@Param("year") Integer year);
    List<ExamQuestion> selectByConditions(@Param("query") QuestionQueryDTO query, @Param("offset") Integer offset, @Param("limit") Integer limit);
    Long countByConditions(@Param("query") QuestionQueryDTO query);
    List<String> selectDistinctChapters(@Param("subjectCode") String subjectCode);
    List<Map<String, Object>> selectTagsBySubject(@Param("subjectCode") String subjectCode);
    int insert(ExamQuestion question);
    int update(ExamQuestion question);
    int deleteById(@Param("id") String id);
}

