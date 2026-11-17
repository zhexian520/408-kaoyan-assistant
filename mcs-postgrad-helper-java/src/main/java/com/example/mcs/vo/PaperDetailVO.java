package com.example.mcs.vo;

import com.example.mcs.entity.ExamPaper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaperDetailVO implements Serializable {
    private ExamPaper paper;
    private List<QuestionDetailVO> questions;
}

