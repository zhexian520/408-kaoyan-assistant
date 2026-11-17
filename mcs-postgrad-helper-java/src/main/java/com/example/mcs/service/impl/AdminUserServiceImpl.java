package com.example.mcs.service.impl;

import com.example.mcs.common.PageResult;
import com.example.mcs.dto.UserAdminQueryDTO;
import com.example.mcs.dto.UserUpdateDTO;
import com.example.mcs.entity.SysUser;
import com.example.mcs.mapper.SysUserMapper;
import com.example.mcs.service.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final SysUserMapper sysUserMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public PageResult<SysUser> getUserList(UserAdminQueryDTO query) {
        if (query.getPageNum() == null || query.getPageNum() < 1) query.setPageNum(1);
        if (query.getPageSize() == null || query.getPageSize() < 1) query.setPageSize(10);
        int offset = (query.getPageNum() - 1) * query.getPageSize();

        List<SysUser> list = sysUserMapper.selectUserList(query, offset, query.getPageSize());
        // 脱敏密码
        for (SysUser u : list) {
            u.setPassword(null);
        }
        Long total = sysUserMapper.countUserList(query);
        return PageResult.of(list, total, query.getPageNum(), query.getPageSize());
    }

    @Override
    public SysUser getUserById(Long id) {
        SysUser user = sysUserMapper.selectById(id);
        if (user != null) {
            user.setPassword(null);
        }
        return user;
    }

    @Override
    public boolean updateUserStatus(Long id, Integer status) {
        return sysUserMapper.updateStatus(id, status) > 0;
    }

    @Override
    public boolean resetPassword(Long id, String newPassword) {
        String encoded = passwordEncoder.encode(newPassword.trim());
        return sysUserMapper.updatePassword(id, encoded) > 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateUser(Long id, UserUpdateDTO dto) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null) return false;

        String finalRole = dto.getRoleCode();
        boolean isAdminRole = "ROLE_ADMIN".equalsIgnoreCase(finalRole == null ? "" : finalRole.trim());
        user.setNickname(dto.getNickname());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        if (isAdminRole) {
            // 管理员是平台运维身份，不保存考研目标与备考画像
            user.setTargetSchool(null);
            user.setTargetScore(null);
            user.setExamYear(null);
            user.setPrepStage(null);
        } else {
            user.setTargetSchool(dto.getTargetSchool());
            user.setTargetScore(dto.getTargetScore());
            if (dto.getExamYear() != null) {
                user.setExamYear(dto.getExamYear());
            }
            user.setPrepStage(dto.getPrepStage());
        }
        if (dto.getStatus() != null) {
            user.setStatus(dto.getStatus());
        }
        sysUserMapper.update(user);

        // 如果修改了角色
        if (dto.getRoleCode() != null && !dto.getRoleCode().trim().isEmpty()) {
            Long roleId = sysUserMapper.selectRoleIdByCode(dto.getRoleCode().trim());
            if (roleId != null) {
                sysUserMapper.deleteUserRoleByUserId(id);
                sysUserMapper.insertUserRole(id, roleId);
            }
        }
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean createUser(SysUser user, String roleCode) {
        if (user.getUsername() == null || user.getPassword() == null) {
            throw new IllegalArgumentException("用户名和密码不能为空");
        }
        SysUser exist = sysUserMapper.selectByUsername(user.getUsername().trim());
        if (exist != null) {
            throw new IllegalArgumentException("用户名已存在");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword().trim()));
        if (user.getAvatar() == null || user.getAvatar().isEmpty()) {
            user.setAvatar("https://api.dicebear.com/7.x/bottts/svg?seed=" + user.getUsername());
        }
        if (user.getStatus() == null) user.setStatus(1);
        String finalRole = (roleCode != null && !roleCode.isEmpty()) ? roleCode : "ROLE_USER";
        if ("ROLE_ADMIN".equalsIgnoreCase(finalRole)) {
            // 管理员账号不写入考研目标院校、分数与备考阶段
            user.setTargetSchool(null);
            user.setTargetScore(null);
            user.setExamYear(null);
            user.setPrepStage(null);
        } else {
            if (user.getExamYear() == null) user.setExamYear(2026);
            if (user.getPrepStage() == null) user.setPrepStage("BASIC");
        }

        sysUserMapper.insert(user);

        Long roleId = sysUserMapper.selectRoleIdByCode(finalRole);
        if (roleId != null) {
            sysUserMapper.insertUserRole(user.getId(), roleId);
        }
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteUser(Long id) {
        sysUserMapper.deleteUserRoleByUserId(id);
        return sysUserMapper.deleteById(id) > 0;
    }
}

