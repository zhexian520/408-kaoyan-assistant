package com.example.mcs.mapper;

import com.example.mcs.entity.ExamQuestionSub;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ExamQuestionSubMapper {
    List<ExamQuestionSub> selectByQuestionId(@Param("questionId") String questionId);
    List<ExamQuestionSub> selectByQuestionIds(@Param("questionIds") List<String> questionIds);
}

