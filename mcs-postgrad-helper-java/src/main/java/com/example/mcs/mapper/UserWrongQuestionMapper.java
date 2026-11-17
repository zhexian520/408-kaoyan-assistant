package com.example.mcs.mapper;

import com.example.mcs.entity.UserWrongQuestion;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserWrongQuestionMapper {
    int insertOrUpdate(UserWrongQuestion wrongQuestion);
    List<UserWrongQuestion> selectByUserId(@Param("userId") Long userId,
                                          @Param("subjectCode") String subjectCode,
                                          @Param("masterStatus") String masterStatus);
    int countByUserId(@Param("userId") Long userId, @Param("masterStatus") String masterStatus);
    int deleteByUserId(@Param("userId") Long userId);
    int deleteById(@Param("id") Long id, @Param("userId") Long userId);
    int updateMasterStatus(@Param("id") Long id, @Param("userId") Long userId, @Param("masterStatus") String masterStatus);
}
