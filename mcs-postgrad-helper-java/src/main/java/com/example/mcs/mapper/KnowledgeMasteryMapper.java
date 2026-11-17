package com.example.mcs.mapper;

import com.example.mcs.entity.UserKnowledgeMastery;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface KnowledgeMasteryMapper {
    List<UserKnowledgeMastery> selectByUserId(@Param("userId") Long userId, @Param("subjectCode") String subjectCode);
    int insertOrUpdate(UserKnowledgeMastery mastery);
}

