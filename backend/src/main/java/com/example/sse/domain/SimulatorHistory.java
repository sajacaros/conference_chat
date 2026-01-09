package com.example.sse.domain;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "simulator_history")
public class SimulatorHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_count", nullable = false)
    private int userCount;

    @Column(name = "calls_per_minute", nullable = false)
    private int callsPerMinute;

    @Column(name = "chat_messages_per_call", nullable = false)
    private int chatMessagesPerCall;

    @Column(name = "min_call_duration_seconds", nullable = false)
    private int minCallDurationSeconds;

    @Column(name = "max_call_duration_seconds", nullable = false)
    private int maxCallDurationSeconds;

    @Column(name = "connected_percent", nullable = false)
    private int connectedPercent;

    @Column(name = "rejected_percent", nullable = false)
    private int rejectedPercent;

    @Column(name = "cancelled_percent", nullable = false)
    private int cancelledPercent;

    @Column(name = "total_calls_generated", nullable = false)
    private int totalCallsGenerated = 0;

    @Column(name = "total_messages_generated", nullable = false)
    private int totalMessagesGenerated = 0;

    @Column(name = "calls_connected", nullable = false)
    private int callsConnected = 0;

    @Column(name = "calls_ended", nullable = false)
    private int callsEnded = 0;

    @Column(name = "calls_rejected", nullable = false)
    private int callsRejected = 0;

    @Column(name = "calls_cancelled", nullable = false)
    private int callsCancelled = 0;

    @Column(name = "calls_busy", nullable = false)
    private int callsBusy = 0;

    @Column(name = "running", nullable = false)
    private boolean running = true;

    @CreatedDate
    @Column(name = "started_at", updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "stopped_at")
    private LocalDateTime stoppedAt;

    protected SimulatorHistory() {
    }

    public SimulatorHistory(int userCount, int callsPerMinute, int chatMessagesPerCall,
                           int minCallDurationSeconds, int maxCallDurationSeconds,
                           int connectedPercent, int rejectedPercent, int cancelledPercent) {
        this.userCount = userCount;
        this.callsPerMinute = callsPerMinute;
        this.chatMessagesPerCall = chatMessagesPerCall;
        this.minCallDurationSeconds = minCallDurationSeconds;
        this.maxCallDurationSeconds = maxCallDurationSeconds;
        this.connectedPercent = connectedPercent;
        this.rejectedPercent = rejectedPercent;
        this.cancelledPercent = cancelledPercent;
    }

    // Getters
    public Long getId() { return id; }
    public int getUserCount() { return userCount; }
    public int getCallsPerMinute() { return callsPerMinute; }
    public int getChatMessagesPerCall() { return chatMessagesPerCall; }
    public int getMinCallDurationSeconds() { return minCallDurationSeconds; }
    public int getMaxCallDurationSeconds() { return maxCallDurationSeconds; }
    public int getConnectedPercent() { return connectedPercent; }
    public int getRejectedPercent() { return rejectedPercent; }
    public int getCancelledPercent() { return cancelledPercent; }
    public int getTotalCallsGenerated() { return totalCallsGenerated; }
    public int getTotalMessagesGenerated() { return totalMessagesGenerated; }
    public int getCallsConnected() { return callsConnected; }
    public int getCallsEnded() { return callsEnded; }
    public int getCallsRejected() { return callsRejected; }
    public int getCallsCancelled() { return callsCancelled; }
    public int getCallsBusy() { return callsBusy; }
    public boolean isRunning() { return running; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public LocalDateTime getStoppedAt() { return stoppedAt; }

    // Update methods
    public void updateStats(int totalCalls, int totalMessages,
                           int connected, int ended, int rejected, int cancelled, int busy) {
        this.totalCallsGenerated = totalCalls;
        this.totalMessagesGenerated = totalMessages;
        this.callsConnected = connected;
        this.callsEnded = ended;
        this.callsRejected = rejected;
        this.callsCancelled = cancelled;
        this.callsBusy = busy;
    }

    public void stop() {
        this.running = false;
        this.stoppedAt = LocalDateTime.now();
    }
}
