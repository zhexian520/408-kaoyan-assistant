package com.example.mcs.mapper;

import com.example.mcs.entity.TestRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TestRecordMapper {
    int insert(TestRecord record);
    int update(TestRecord record);
    TestRecord selectById(@Param("id") Long id);
    List<TestRecord> selectByUserId(@Param("userId") Long userId);
    List<TestRecord> selectRecentRecords(@Param("limit") Integer limit);
    Long countAllRecords();
    Double selectAvgScore();
}
