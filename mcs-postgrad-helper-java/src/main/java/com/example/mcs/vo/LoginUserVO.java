package com.example.mcs.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginUserVO implements Serializable {
    private String token;
    private Long userId;
    private String username;
    private String nickname;
    private String avatar;
    private String roleCode;
    private String targetSchool;
    private Integer targetScore;
    private Integer examYear;
    private String prepStage;
}

