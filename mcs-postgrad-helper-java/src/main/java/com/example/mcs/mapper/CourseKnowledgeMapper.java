package com.example.mcs.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface CourseKnowledgeMapper {
    List<Map<String, Object>> selectCourseChapters(@Param("subjectCode") String subjectCode);
    List<Map<String, Object>> selectCourseSections(@Param("chapterId") String chapterId);
    List<Map<String, Object>> selectCoursePoints(@Param("sectionId") String sectionId);
    List<Map<String, Object>> selectAllGraphRows();
    Map<String, Object> selectPointDetail(@Param("pointId") String pointId);
}
