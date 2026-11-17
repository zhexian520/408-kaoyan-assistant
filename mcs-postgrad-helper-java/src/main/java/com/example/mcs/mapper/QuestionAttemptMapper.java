package com.example.mcs.mapper;

import com.example.mcs.entity.QuestionAttempt;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface QuestionAttemptMapper {
    int insert(QuestionAttempt attempt);
    int batchInsert(@Param("list") List<QuestionAttempt> list);
}
