package com.example.mcs;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.example.mcs.mapper")
public class McsApplication {

    public static void main(String[] args) {
        SpringApplication.run(McsApplication.class, args);
    }

}

