package com.example.mcs.mapper;

import com.example.mcs.entity.KChapter;
import com.example.mcs.entity.KPoint;
import com.example.mcs.entity.KSubject;
import com.example.mcs.entity.KbChunk;
import com.example.mcs.entity.KbDocument;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface KbMapper {
    List<KbDocument> selectDocuments(@Param("userId") Long userId, 
                                     @Param("isPublic") Integer isPublic, 
                                     @Param("subjectCode") String subjectCode, 
                                     @Param("keyword") String keyword);

    KbDocument selectDocumentById(@Param("id") Long id);

    int insertDocument(KbDocument doc);

    int deleteDocumentById(@Param("id") Long id);

    List<KbChunk> selectChunksByDocId(@Param("documentId") Long documentId);

    int insertChunk(KbChunk chunk);

    List<KSubject> selectAllSubjects();

    List<KChapter> selectChaptersBySubject(@Param("subjectCode") String subjectCode);

    List<KPoint> selectPointsBySubject(@Param("subjectCode") String subjectCode);
}

