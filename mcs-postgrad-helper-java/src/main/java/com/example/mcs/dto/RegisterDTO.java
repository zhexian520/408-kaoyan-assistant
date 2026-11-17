package com.example.mcs.dto;

import lombok.Data;

import java.io.Serializable;

@Data
public class RegisterDTO implements Serializable {
    private String username;
    private String password;
    private String nickname;
    private String email;
    private String phone;
    private String targetSchool;
    private Integer targetScore;
}

