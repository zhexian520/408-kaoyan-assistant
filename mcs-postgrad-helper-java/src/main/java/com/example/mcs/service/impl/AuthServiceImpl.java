package com.example.mcs.service.impl;

import com.example.mcs.dto.LoginDTO;
import com.example.mcs.dto.RegisterDTO;
import com.example.mcs.entity.SysUser;
import com.example.mcs.mapper.SysUserMapper;
import com.example.mcs.service.AuthService;
import com.example.mcs.util.JwtUtil;
import com.example.mcs.vo.LoginUserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserMapper sysUserMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public LoginUserVO login(LoginDTO dto) {
        if (dto.getUsername() == null || dto.getPassword() == null) {
            throw new IllegalArgumentException("用户名或密码不能为空");
        }

        SysUser user = sysUserMapper.selectByUsername(dto.getUsername().trim());
        if (user == null) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new IllegalArgumentException("该账号已被管理员封禁，请联系管理员");
        }

        if (!passwordEncoder.matches(dto.getPassword().trim(), user.getPassword())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        String roleCode = user.getRoleCode() != null ? user.getRoleCode() : "ROLE_USER";
        String token = JwtUtil.generateToken(user.getId(), user.getUsername(), roleCode);

        return LoginUserVO.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname() != null ? user.getNickname() : user.getUsername())
                .avatar(user.getAvatar() != null ? user.getAvatar() : "https://api.dicebear.com/7.x/bottts/svg?seed=" + user.getUsername())
                .roleCode(roleCode)
                .targetSchool(user.getTargetSchool())
                .targetScore(user.getTargetScore())
                .examYear(user.getExamYear())
                .prepStage(user.getPrepStage())
                .build();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public LoginUserVO register(RegisterDTO dto) {
        String username = dto.getUsername() != null ? dto.getUsername().trim() : "";
        String password = dto.getPassword() != null ? dto.getPassword().trim() : "";
        if (username.length() < 3 || password.length() < 6) {
            throw new IllegalArgumentException("用户名至少3位，密码至少6位");
        }

        SysUser existing = sysUserMapper.selectByUsername(username);
        if (existing != null) {
            throw new IllegalArgumentException("该用户名已被注册，请更换其他用户名");
        }

        String encodedPwd = passwordEncoder.encode(password);
        SysUser newUser = SysUser.builder()
                .username(username)
                .password(encodedPwd)
                .nickname(dto.getNickname() != null && !dto.getNickname().trim().isEmpty() ? dto.getNickname().trim() : "考研学子_" + username)
                .avatar("https://api.dicebear.com/7.x/bottts/svg?seed=" + username)
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .targetSchool(dto.getTargetSchool() != null ? dto.getTargetSchool().trim() : "目标院校待定")
                .targetScore(dto.getTargetScore() != null ? dto.getTargetScore() : 120)
                .examYear(2026)
                .prepStage("BASIC")
                .status(1)
                .build();

        sysUserMapper.insert(newUser);

        // 绑定普通用户角色 ROLE_USER
        Long userRoleId = sysUserMapper.selectRoleIdByCode("ROLE_USER");
        if (userRoleId == null) {
            userRoleId = 2L;
        }
        sysUserMapper.insertUserRole(newUser.getId(), userRoleId);

        String token = JwtUtil.generateToken(newUser.getId(), newUser.getUsername(), "ROLE_USER");

        return LoginUserVO.builder()
                .token(token)
                .userId(newUser.getId())
                .username(newUser.getUsername())
                .nickname(newUser.getNickname())
                .avatar(newUser.getAvatar())
                .roleCode("ROLE_USER")
                .targetSchool(newUser.getTargetSchool())
                .targetScore(newUser.getTargetScore())
                .examYear(newUser.getExamYear())
                .prepStage(newUser.getPrepStage())
                .build();
    }

    @Override
    public LoginUserVO getCurrentUser(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        Long userId = JwtUtil.getUserId(token);
        if (userId == null) return null;

        SysUser user = sysUserMapper.selectById(userId);
        if (user == null || (user.getStatus() != null && user.getStatus() == 0)) {
            return null;
        }

        String roleCode = user.getRoleCode() != null ? user.getRoleCode() : "ROLE_USER";
        return LoginUserVO.builder()
                .token(token)
                .userId(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .roleCode(roleCode)
                .targetSchool(user.getTargetSchool())
                .targetScore(user.getTargetScore())
                .examYear(user.getExamYear())
                .prepStage(user.getPrepStage())
                .build();
    }
}

