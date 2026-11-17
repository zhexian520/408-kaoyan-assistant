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
public class ExamQuestionKnowledge implements Serializable {
    private Long id;
    private String questionId;
    private String knowledgeBlockId;
}

