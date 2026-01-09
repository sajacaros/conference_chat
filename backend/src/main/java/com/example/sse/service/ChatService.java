package com.example.sse.service;

import com.example.sse.domain.ChatMessage;
import com.example.sse.domain.User;
import com.example.sse.dto.ChatMessageDto;
import com.example.sse.dto.ConversationPartnerDto;
import com.example.sse.repository.ChatMessageRepository;
import com.example.sse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    @Transactional
    public ChatMessage saveMessage(String senderEmail, String receiverEmail, String message) {
        User sender = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));
        User receiver = userRepository.findByEmail(receiverEmail)
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));

        ChatMessage chatMessage = new ChatMessage(
                sender.getId(),
                receiver.getId(),
                message
        );
        return chatMessageRepository.save(chatMessage);
    }

    private static final int MAX_MESSAGES = 100;

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getConversation(String userEmail, String partnerEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        User partner = userRepository.findByEmail(partnerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Partner not found"));

        // 최신순으로 100건 조회 후 오래된 순으로 정렬
        List<ChatMessageDto> messages = chatMessageRepository
                .findRecentConversation(user.getId(), partner.getId(), PageRequest.of(0, MAX_MESSAGES))
                .stream()
                .map(m -> {
                    User sender = userRepository.findById(m.getSenderId()).orElse(null);
                    String senderEmail = sender != null ? sender.getEmail() : "unknown";
                    return new ChatMessageDto(senderEmail, m.getMessage(), m.getCreatedAt());
                })
                .collect(Collectors.toList());

        Collections.reverse(messages);
        return messages;
    }

    @Transactional(readOnly = true)
    public List<ConversationPartnerDto> getConversationPartners(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<Long> partnerIds = chatMessageRepository.findConversationPartnerIds(user.getId());

        return partnerIds.stream()
                .map(partnerId -> {
                    User partner = userRepository.findById(partnerId).orElse(null);
                    if (partner == null) {
                        return null;
                    }

                    // 최근 1건만 조회
                    List<ChatMessage> recentMessages = chatMessageRepository
                            .findRecentConversation(user.getId(), partnerId, PageRequest.of(0, 1));
                    ChatMessage lastMessage = recentMessages.isEmpty() ? null : recentMessages.get(0);

                    return new ConversationPartnerDto(
                            partner.getEmail(),
                            partner.getUsername(),
                            lastMessage != null ? lastMessage.getMessage() : "",
                            lastMessage != null ? lastMessage.getCreatedAt() : null
                    );
                })
                .filter(dto -> dto != null)
                .sorted(Comparator.comparing(ConversationPartnerDto::getLastMessageTime,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }
}
