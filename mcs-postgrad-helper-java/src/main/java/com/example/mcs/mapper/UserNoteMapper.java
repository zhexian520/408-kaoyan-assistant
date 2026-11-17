package com.example.mcs.mapper;

import com.example.mcs.entity.UserNote;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserNoteMapper {
    List<UserNote> selectNotesByUserId(@Param("userId") Long userId, 
                                       @Param("subjectCode") String subjectCode, 
                                       @Param("keyword") String keyword);

    UserNote selectNoteById(@Param("id") Long id);

    int insertNote(UserNote note);

    int updateNote(UserNote note);

    int deleteNoteById(@Param("id") Long id);
}

