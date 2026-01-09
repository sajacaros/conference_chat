package com.example.sse.service;

import com.example.sse.domain.CallSession;
import com.example.sse.domain.CallStatus;
import com.example.sse.domain.ChatMessage;
import com.example.sse.domain.User;
import com.example.sse.dto.SimulatorConfigRequest;
import com.example.sse.dto.SimulatorStatusResponse;
import com.example.sse.repository.CallSessionRepository;
import com.example.sse.repository.ChatMessageRepository;
import com.example.sse.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class SimulatorService {

    private static final Logger log = LoggerFactory.getLogger(SimulatorService.class);

    private final CallSessionRepository callSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    // Simulation state
    private volatile boolean running = false;
    private SimulatorConfigRequest currentConfig;
    private ScheduledExecutorService scheduler;
    private List<Long> userIds = new ArrayList<>();

    // Statistics
    private final AtomicInteger totalCalls = new AtomicInteger(0);
    private final AtomicInteger totalMessages = new AtomicInteger(0);
    private final ConcurrentHashMap<CallStatus, AtomicInteger> callsByStatus = new ConcurrentHashMap<>();
    private volatile LocalDateTime startedAt;
    private volatile LocalDateTime lastCallAt;

    // Active call tracking (userId -> sessionId)
    private final ConcurrentHashMap<Long, String> activeCallsByUser = new ConcurrentHashMap<>();

    // Sample chat messages pool
    private static final List<String> CHAT_MESSAGES = Arrays.asList(
            "안녕하세요!", "잘 들리시나요?", "네, 잘 들립니다!",
            "화면 공유할게요", "잠시만요", "네, 알겠습니다",
            "좋은 아이디어네요", "감사합니다!", "다음에 또 연락드릴게요",
            "수고하셨습니다", "확인했습니다", "진행하겠습니다"
    );

    private final Random random = new Random();

    public SimulatorService(CallSessionRepository callSessionRepository,
                           ChatMessageRepository chatMessageRepository,
                           UserRepository userRepository) {
        this.callSessionRepository = callSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;

        // Initialize stats
        for (CallStatus status : CallStatus.values()) {
            callsByStatus.put(status, new AtomicInteger(0));
        }
    }

    public synchronized void start(SimulatorConfigRequest config) {
        if (running) {
            throw new IllegalStateException("Simulation already running");
        }

        validateConfig(config);

        // Load virtual users
        List<String> emails = IntStream.rangeClosed(1, config.getUserCount())
                .mapToObj(i -> "vuser" + i + "@dacon.kr")
                .collect(Collectors.toList());

        List<User> users = userRepository.findByEmailIn(emails);
        if (users.size() < 2) {
            throw new IllegalStateException("Not enough virtual users found. Required: 2, Found: " + users.size());
        }

        this.userIds = users.stream().map(User::getId).collect(Collectors.toList());
        this.currentConfig = config;
        this.running = true;
        this.startedAt = LocalDateTime.now();

        // Reset statistics
        totalCalls.set(0);
        totalMessages.set(0);
        for (CallStatus status : CallStatus.values()) {
            callsByStatus.get(status).set(0);
        }
        activeCallsByUser.clear();

        // Calculate interval in milliseconds
        long intervalMs = 60_000L / config.getCallsPerMinute();

        scheduler = Executors.newScheduledThreadPool(2);
        scheduler.scheduleAtFixedRate(
                this::generateCallSafe,
                0,
                intervalMs,
                TimeUnit.MILLISECONDS
        );

        log.info("Simulator started with {} users, {} calls/min", userIds.size(), config.getCallsPerMinute());
    }

    public synchronized void stop() {
        if (!running) {
            return;
        }
        running = false;
        if (scheduler != null) {
            scheduler.shutdown();
            try {
                if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                    scheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                scheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
            scheduler = null;
        }
        // End all active simulated calls
        endAllActiveCalls();
        log.info("Simulator stopped. Total calls: {}, Total messages: {}", totalCalls.get(), totalMessages.get());
    }

    public SimulatorStatusResponse getStatus() {
        SimulatorStatusResponse response = new SimulatorStatusResponse();
        response.setRunning(running);
        response.setTotalCallsGenerated(totalCalls.get());
        response.setTotalMessagesGenerated(totalMessages.get());
        response.setCallsByStatus(
                callsByStatus.entrySet().stream()
                        .collect(Collectors.toMap(
                                e -> e.getKey().name(),
                                e -> e.getValue().get()
                        ))
        );
        response.setStartedAt(startedAt);
        response.setLastCallAt(lastCallAt);
        return response;
    }

    private void generateCallSafe() {
        try {
            generateCall();
        } catch (Exception e) {
            log.error("Error generating call", e);
        }
    }

    @Transactional
    public void generateCall() {
        if (!running || currentConfig == null || userIds.size() < 2) {
            return;
        }

        // Select random caller and callee
        Long callerId = userIds.get(random.nextInt(userIds.size()));
        Long calleeId;
        do {
            calleeId = userIds.get(random.nextInt(userIds.size()));
        } while (calleeId.equals(callerId));

        // Check if caller is already in a call (skip this iteration)
        if (activeCallsByUser.containsKey(callerId)) {
            return;
        }

        // Check if callee is already in a call -> BUSY
        boolean calleeBusy = activeCallsByUser.containsKey(calleeId);

        CallStatus outcome;
        if (calleeBusy) {
            outcome = CallStatus.BUSY;
        } else {
            outcome = determineOutcome();
        }

        // Create the call session with TRYING status
        String sessionId = UUID.randomUUID().toString();
        CallSession session = new CallSession(sessionId, callerId, calleeId, CallStatus.TRYING);
        callSessionRepository.save(session);

        // Process based on outcome
        processCallOutcome(session, outcome, callerId, calleeId);

        // Update statistics
        totalCalls.incrementAndGet();
        lastCallAt = LocalDateTime.now();

        log.debug("Call generated: {} -> {}, outcome: {}", callerId, calleeId, outcome);
    }

    private CallStatus determineOutcome() {
        int roll = random.nextInt(100);
        int connected = currentConfig.getConnectedPercent();
        int rejected = currentConfig.getRejectedPercent();
        int cancelled = currentConfig.getCancelledPercent();

        if (roll < connected) {
            return CallStatus.CONNECTED;
        } else if (roll < connected + rejected) {
            return CallStatus.REJECTED;
        } else if (roll < connected + rejected + cancelled) {
            return CallStatus.CANCELLED;
        } else {
            return CallStatus.BUSY;
        }
    }

    private void processCallOutcome(CallSession session, CallStatus outcome, Long callerId, Long calleeId) {
        switch (outcome) {
            case CONNECTED:
                // Transition to CONNECTED
                session.connect();
                callSessionRepository.save(session);
                callsByStatus.get(CallStatus.CONNECTED).incrementAndGet();

                // Mark both users as busy
                activeCallsByUser.put(callerId, session.getSessionId());
                activeCallsByUser.put(calleeId, session.getSessionId());

                // Schedule call end and chat generation
                scheduleConnectedCall(session, callerId, calleeId);
                break;

            case REJECTED:
            case CANCELLED:
            case BUSY:
                // Immediate termination
                session.end(outcome);
                callSessionRepository.save(session);
                callsByStatus.get(outcome).incrementAndGet();
                break;

            default:
                break;
        }
    }

    private void scheduleConnectedCall(CallSession session, Long callerId, Long calleeId) {
        int minDuration = currentConfig.getMinCallDurationSeconds();
        int maxDuration = currentConfig.getMaxCallDurationSeconds();
        int duration = minDuration + random.nextInt(Math.max(1, maxDuration - minDuration + 1));

        // Generate chat messages during the call
        int messageCount = currentConfig.getChatMessagesPerCall();
        if (messageCount > 0 && duration > 1) {
            scheduleChatMessages(session.getSessionId(), callerId, calleeId, duration, messageCount);
        }

        // Schedule call end
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.schedule(() -> endCallSafe(session.getSessionId(), callerId, calleeId),
                    duration, TimeUnit.SECONDS);
        }
    }

    private void scheduleChatMessages(String sessionId, Long callerId, Long calleeId, int durationSeconds, int messageCount) {
        if (scheduler == null || scheduler.isShutdown()) {
            return;
        }

        // Distribute messages evenly across call duration
        int intervalMs = (durationSeconds * 1000) / (messageCount + 1);

        for (int i = 1; i <= messageCount; i++) {
            int delay = intervalMs * i;
            final int messageIndex = i;
            final Long sender = (i % 2 == 0) ? callerId : calleeId;
            final Long receiver = sender.equals(callerId) ? calleeId : callerId;

            scheduler.schedule(() -> {
                if (running && activeCallsByUser.containsKey(sender)) {
                    try {
                        sendChatMessage(sender, receiver);
                    } catch (Exception e) {
                        log.error("Error sending chat message", e);
                    }
                }
            }, delay, TimeUnit.MILLISECONDS);
        }
    }

    @Transactional
    public void sendChatMessage(Long senderId, Long receiverId) {
        String message = CHAT_MESSAGES.get(random.nextInt(CHAT_MESSAGES.size()));
        ChatMessage chatMessage = new ChatMessage(senderId, receiverId, message);
        chatMessageRepository.save(chatMessage);
        totalMessages.incrementAndGet();
    }

    private void endCallSafe(String sessionId, Long callerId, Long calleeId) {
        try {
            endCall(sessionId, callerId, calleeId);
        } catch (Exception e) {
            log.error("Error ending call {}", sessionId, e);
        }
    }

    @Transactional
    public void endCall(String sessionId, Long callerId, Long calleeId) {
        // Reload session from DB
        CallSession current = callSessionRepository.findById(sessionId).orElse(null);
        if (current != null && current.getStatus() == CallStatus.CONNECTED) {
            current.end(CallStatus.ENDED);
            callSessionRepository.save(current);
            callsByStatus.get(CallStatus.ENDED).incrementAndGet();
        }

        // Remove from active calls
        activeCallsByUser.remove(callerId);
        activeCallsByUser.remove(calleeId);
    }

    private void endAllActiveCalls() {
        Set<String> processedSessions = new HashSet<>();
        activeCallsByUser.forEach((userId, sessionId) -> {
            if (processedSessions.add(sessionId)) {
                try {
                    CallSession session = callSessionRepository.findById(sessionId).orElse(null);
                    if (session != null && !session.getStatus().isTerminal()) {
                        session.end(CallStatus.ENDED);
                        callSessionRepository.save(session);
                        callsByStatus.get(CallStatus.ENDED).incrementAndGet();
                    }
                } catch (Exception e) {
                    log.error("Error ending session {}", sessionId, e);
                }
            }
        });
        activeCallsByUser.clear();
    }

    private void validateConfig(SimulatorConfigRequest config) {
        if (config.getUserCount() < 2 || config.getUserCount() > 1000) {
            throw new IllegalArgumentException("User count must be between 2 and 1000");
        }
        if (config.getCallsPerMinute() < 1 || config.getCallsPerMinute() > 60) {
            throw new IllegalArgumentException("Calls per minute must be between 1 and 60");
        }
        if (config.getChatMessagesPerCall() < 0 || config.getChatMessagesPerCall() > 20) {
            throw new IllegalArgumentException("Chat messages per call must be between 0 and 20");
        }
        if (config.getMinCallDurationSeconds() < 1 || config.getMinCallDurationSeconds() > 300) {
            throw new IllegalArgumentException("Min call duration must be between 1 and 300 seconds");
        }
        if (config.getMaxCallDurationSeconds() < config.getMinCallDurationSeconds() ||
            config.getMaxCallDurationSeconds() > 300) {
            throw new IllegalArgumentException("Max call duration must be >= min and <= 300 seconds");
        }
        int totalPercent = config.getConnectedPercent() + config.getRejectedPercent()
                + config.getCancelledPercent();
        if (totalPercent > 100) {
            throw new IllegalArgumentException("Outcome percentages cannot exceed 100");
        }
        if (config.getConnectedPercent() < 0 || config.getRejectedPercent() < 0 ||
            config.getCancelledPercent() < 0) {
            throw new IllegalArgumentException("Outcome percentages cannot be negative");
        }
    }
}
