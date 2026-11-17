package com.example.mcs.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KChapter implements Serializable {
    private String id;
    private String subjectCode;
    private String title;
    private Integer chapterNumber;
    private String layer;
    private Integer sortOrder;
}

