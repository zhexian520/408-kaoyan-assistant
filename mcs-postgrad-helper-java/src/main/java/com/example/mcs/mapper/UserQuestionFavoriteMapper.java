package com.example.mcs.mapper;

import com.example.mcs.entity.UserQuestionFavorite;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserQuestionFavoriteMapper {
    int insert(UserQuestionFavorite favorite);
    int delete(@Param("userId") Long userId, @Param("questionId") String questionId);
    int checkFavorited(@Param("userId") Long userId, @Param("questionId") String questionId);
    List<String> selectUserFavoriteQuestionIds(@Param("userId") Long userId);
}

