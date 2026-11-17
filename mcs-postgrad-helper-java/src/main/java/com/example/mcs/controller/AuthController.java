package com.example.mcs.controller;

import com.example.mcs.common.Result;
import com.example.mcs.dto.LoginDTO;
import com.example.mcs.dto.RegisterDTO;
import com.example.mcs.service.AuthService;
import com.example.mcs.vo.LoginUserVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public Result<LoginUserVO> login(@RequestBody LoginDTO dto) {
        try {
            LoginUserVO vo = authService.login(dto);
            return Result.success("登录成功", vo);
        } catch (IllegalArgumentException e) {
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "登录失败: " + e.getMessage());
        }
    }

    @PostMapping("/register")
    public Result<LoginUserVO> register(@RequestBody RegisterDTO dto) {
        try {
            LoginUserVO vo = authService.register(dto);
            return Result.success("注册成功并已自动登录", vo);
        } catch (IllegalArgumentException e) {
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "注册失败: " + e.getMessage());
        }
    }

    @GetMapping("/me")
    public Result<LoginUserVO> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token == null || token.isEmpty()) {
            return Result.error(401, "未登录或登录凭证已失效");
        }
        LoginUserVO vo = authService.getCurrentUser(token);
        if (vo == null) {
            return Result.error(401, "登录已失效，请重新登录");
        }
        return Result.success(vo);
    }
}

