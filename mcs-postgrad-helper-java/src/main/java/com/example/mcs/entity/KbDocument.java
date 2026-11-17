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
public class KbDocument implements Serializable {
    private Long id;
    private Long userId;
    private String title;
    private String fileType;
    private String fileUrl;
    private Long fileSize;
    private String subjectCode;
    private String parseStatus;
    private String errorMsg;
    private Integer chunkCount;
    private Integer isPublic;
    private LocalDateTime createdAt;
}

