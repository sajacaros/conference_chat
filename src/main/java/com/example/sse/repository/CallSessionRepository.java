package com.example.sse.repository;

import com.example.sse.domain.CallSession;
import com.example.sse.domain.CallStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CallSessionRepository extends JpaRepository<CallSession, String> {

    // Find latest session between two users (for linking OFFER/ANSWER)
    Optional<CallSession> findTopByCallerIdAndCalleeIdOrderByCreatedAtDesc(String callerId, String calleeId);

    // For finding active sessions to close on logout
    List<CallSession> findByCallerIdAndStatus(String callerId, CallStatus status);

    List<CallSession> findByCalleeIdAndStatus(String calleeId, CallStatus status);

    @org.springframework.data.jpa.repository.Query("SELECT count(c) > 0 FROM CallSession c WHERE (c.callerId = :userId OR c.calleeId = :userId) AND c.status IN (com.example.sse.domain.CallStatus.TRYING, com.example.sse.domain.CallStatus.CONNECTED)")
    boolean existsActiveSession(@org.springframework.data.repository.query.Param("userId") String userId);
}
