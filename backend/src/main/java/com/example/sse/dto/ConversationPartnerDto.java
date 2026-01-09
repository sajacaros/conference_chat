package com.example.sse.dto;

import java.time.LocalDateTime;

public class ConversationPartnerDto {
    private String email;
    private String username;
    private String lastMessage;
    private LocalDateTime lastMessageTime;

    public ConversationPartnerDto(String email, String username, String lastMessage, LocalDateTime lastMessageTime) {
        this.email = email;
        this.username = username;
        this.lastMessage = lastMessage;
        this.lastMessageTime = lastMessageTime;
    }

    public String getEmail() {
        return email;
    }

    public String getUsername() {
        return username;
    }

    public String getLastMessage() {
        return lastMessage;
    }

    public LocalDateTime getLastMessageTime() {
        return lastMessageTime;
    }
}
