package com.example.mcs.dto;

import lombok.Data;

import java.io.Serializable;

@Data
public class QuestionFavoriteDTO implements Serializable {
    private Long userId = 1L;
    private String questionId;
    private String tag = "重点题";
    private String note;
}

