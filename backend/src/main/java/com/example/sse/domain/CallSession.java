package com.example.sse.domain;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "call_session")
public class CallSession {

    @Id
    @Column(name = "session_id")
    private String sessionId;

    @Column(name = "caller_id", nullable = false)
    private Long callerId;

    @Column(name = "callee_id", nullable = false)
    private Long calleeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CallStatus status;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "connected_at")
    private LocalDateTime connectedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    // JPA requires a no-arg constructor
    protected CallSession() {
    }

    public CallSession(String sessionId, Long callerId, Long calleeId, CallStatus status) {
        this.sessionId = sessionId;
        this.callerId = callerId;
        this.calleeId = calleeId;
        this.status = status;
    }

    // Getters
    public String getSessionId() {
        return sessionId;
    }

    public Long getCallerId() {
        return callerId;
    }

    public Long getCalleeId() {
        return calleeId;
    }

    public CallStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getConnectedAt() {
        return connectedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    // Domain Logic
    public void connect() {
        updateStatus(CallStatus.CONNECTED);
        this.connectedAt = LocalDateTime.now();
    }

    public void end(CallStatus endStatus) {
        if (!endStatus.isTerminal()) {
            throw new IllegalArgumentException(
                    "Must end with a terminal status (ENDED, CANCELLED, REJECTED), but got: " + endStatus);
        }
        updateStatus(endStatus);
        this.endedAt = LocalDateTime.now();
    }

    // Helper to perform state validation
    private void updateStatus(CallStatus nextStatus) {
        if (this.status != null) {
            this.status.verifyTransition(nextStatus);
        }
        this.status = nextStatus;
    }
}
