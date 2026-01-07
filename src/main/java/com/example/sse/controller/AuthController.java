package com.example.sse.controller;

import com.example.sse.dto.LoginRequest;
import com.example.sse.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.security.ticker}")
    private String ticker;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        String expectedPassword = com.example.sse.util.PasswordUtil.generatePassword(ticker);
        if (!expectedPassword.equals(loginRequest.getPassword())) {
            return ResponseEntity.status(401).body("Invalid password");
        }

        // Use provided userId or generate random
        String userId = (loginRequest.getUserId() != null && !loginRequest.getUserId().isEmpty())
                ? loginRequest.getUserId()
                : UUID.randomUUID().toString();
        String token = jwtTokenProvider.createToken(userId);

        Map<String, String> response = Collections.singletonMap("token", token);
        return ResponseEntity.ok(response);
    }
}
