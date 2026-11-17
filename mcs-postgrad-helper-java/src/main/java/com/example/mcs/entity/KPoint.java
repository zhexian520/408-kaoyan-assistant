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
public class KPoint implements Serializable {
    private String id;
    private String sectionId;
    private String title;
    private String summary;
    private Integer importance;
    private Integer examFrequency;
    private String tagsJson;
    private Integer sortOrder;
}

