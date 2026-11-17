package com.example.mcs.mapper;

import com.example.mcs.entity.TestAnswerDetail;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TestAnswerDetailMapper {
    int batchInsert(@Param("list") List<TestAnswerDetail> list);
    List<TestAnswerDetail> selectByRecordId(@Param("testRecordId") Long testRecordId);
}

