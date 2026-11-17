package com.example.mcs.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ExamQuestionKnowledgeMapper {
    List<String> selectKbIdsByQuestionId(@Param("questionId") String questionId);
}

