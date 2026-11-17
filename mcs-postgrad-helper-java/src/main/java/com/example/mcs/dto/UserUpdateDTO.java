package com.example.mcs.dto;

import lombok.Data;

import java.io.Serializable;

@Data
public class UserUpdateDTO implements Serializable {
    private String nickname;
    private String email;
    private String phone;
    private String targetSchool;
    private Integer targetScore;
    private Integer examYear;
    private String prepStage;
    private Integer status;
    private String roleCode;
}

