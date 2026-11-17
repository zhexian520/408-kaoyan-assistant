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
public class KSubject implements Serializable {
    private String code;
    private String name;
    private String icon;
    private Integer sortOrder;
    private String description;
}

