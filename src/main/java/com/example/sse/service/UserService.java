package com.example.sse.service;

import com.example.sse.domain.User;
import com.example.sse.dto.LoginRequest;
import com.example.sse.dto.RegisterRequest;
import com.example.sse.jwt.JwtTokenProvider;
import com.example.sse.repository.UserRepository;
import com.example.sse.util.PasswordUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.security.ticker}")
    private String ticker;

    @Transactional
    public void register(RegisterRequest request) {
        String expectedCode = PasswordUtil.generatePassword(ticker);
        if (!expectedCode.equals(request.getCode())) {
            throw new IllegalArgumentException("Invalid invite code");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public String login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        return jwtTokenProvider.createToken(user.getEmail());
    }
}
