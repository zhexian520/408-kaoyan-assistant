package com.example.mcs.service;

import com.example.mcs.dto.LoginDTO;
import com.example.mcs.dto.RegisterDTO;
import com.example.mcs.vo.LoginUserVO;

public interface AuthService {
    LoginUserVO login(LoginDTO dto);
    LoginUserVO register(RegisterDTO dto);
    LoginUserVO getCurrentUser(String token);
}

