package com.example.sse.controller;

import com.example.sse.dto.ChatMessageDto;
import com.example.sse.dto.ConversationPartnerDto;
import com.example.sse.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/history/{partnerEmail}")
    public ResponseEntity<List<ChatMessageDto>> getConversation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String partnerEmail
    ) {
        try {
            List<ChatMessageDto> messages = chatService.getConversation(
                    userDetails.getUsername(),
                    partnerEmail
            );
            return ResponseEntity.ok(messages);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/partners")
    public ResponseEntity<List<ConversationPartnerDto>> getConversationPartners(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            List<ConversationPartnerDto> partners = chatService.getConversationPartners(
                    userDetails.getUsername()
            );
            return ResponseEntity.ok(partners);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
