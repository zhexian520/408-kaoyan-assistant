package com.example.mcs.dto;

import lombok.Data;

import java.io.Serializable;

@Data
public class UserAdminQueryDTO implements Serializable {
    private String keyword;
    private Integer status;
    private String roleCode;
    private Integer pageNum = 1;
    private Integer pageSize = 10;
}

