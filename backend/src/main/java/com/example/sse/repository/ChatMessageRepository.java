package com.example.sse.repository;

import com.example.sse.domain.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m " +
           "WHERE (m.senderId = :user1 AND m.receiverId = :user2) " +
           "   OR (m.senderId = :user2 AND m.receiverId = :user1) " +
           "ORDER BY m.createdAt DESC")
    List<ChatMessage> findRecentConversation(@Param("user1") Long user1, @Param("user2") Long user2, Pageable pageable);

    @Query("SELECT m FROM ChatMessage m " +
           "WHERE (m.senderId = :user1 AND m.receiverId = :user2) " +
           "   OR (m.senderId = :user2 AND m.receiverId = :user1) " +
           "ORDER BY m.createdAt ASC")
    List<ChatMessage> findConversation(@Param("user1") Long user1, @Param("user2") Long user2);

    @Query("SELECT DISTINCT CASE " +
           "  WHEN m.senderId = :userId THEN m.receiverId " +
           "  ELSE m.senderId END " +
           "FROM ChatMessage m " +
           "WHERE m.senderId = :userId OR m.receiverId = :userId")
    List<Long> findConversationPartnerIds(@Param("userId") Long userId);
}
