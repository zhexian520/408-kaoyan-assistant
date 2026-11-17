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
public class SysUser implements Serializable {
    private Long id;
    private String username;
    private String password;
    private String nickname;
    private String avatar;
    private String email;
    private String phone;
    private String targetSchool;
    private Integer targetScore;
    private Integer examYear;
    private String prepStage;
    private Integer status; // 1: 正常, 0: 禁用
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 关联角色编码: ROLE_ADMIN / ROLE_USER
    private String roleCode;
}

