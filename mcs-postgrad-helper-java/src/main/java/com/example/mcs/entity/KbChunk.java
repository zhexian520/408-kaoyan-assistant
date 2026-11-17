package com.example.mcs.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KbChunk implements Serializable {
    private Long id;
    private Long documentId;
    private Integer chunkIndex;
    private String content;
    private Integer tokenCount;
    private Integer pageNumber;
    private String bboxJson;
    private String imageUrl;
    private String vectorId;
    private LocalDateTime createdAt;
}

