package com.example.mcs.service;

import com.example.mcs.common.PageResult;
import com.example.mcs.dto.UserAdminQueryDTO;
import com.example.mcs.dto.UserUpdateDTO;
import com.example.mcs.entity.SysUser;

public interface AdminUserService {
    PageResult<SysUser> getUserList(UserAdminQueryDTO query);
    SysUser getUserById(Long id);
    boolean updateUserStatus(Long id, Integer status);
    boolean resetPassword(Long id, String newPassword);
    boolean updateUser(Long id, UserUpdateDTO dto);
    boolean createUser(SysUser user, String roleCode);
    boolean deleteUser(Long id);
}

