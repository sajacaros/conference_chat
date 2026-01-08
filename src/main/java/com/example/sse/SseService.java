package com.example.sse;

import com.example.sse.domain.User;
import com.example.sse.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import com.example.sse.repository.CallSessionRepository;
import com.example.sse.domain.CallSession;
import com.example.sse.domain.CallStatus;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SseService {

    private final CallSessionRepository callSessionRepository;
    private final UserRepository userRepository;

    // Store active connections: userId (email) -> SseEmitter
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String userId) {
        // Set timeout to a long value (e.g., 30 minutes)
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);

        // In case of re-connection, we might replace an existing emitter.
        // The previous emitter's "completion" callback might run later.
        emitters.put(userId, emitter);

        // Define cleanup
        Runnable cleanup = () -> {
            // Only remove if the current map value is indeed THIS emitter.
            // This prevents removing a NEW session if the OLD session times out/completes.
            if (emitters.remove(userId, emitter)) {
                broadcastUserList(); // Update others when user leaves
            }
        };

        // Remove emitter on completion or timeout
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError((e) -> cleanup.run());

        // Send a dummy event to establish connection immediately (optional but good
        // practice)
        try {
            emitter.send(SseEmitter.event().name("connect").data("Connected as " + userId));
            broadcastUserList(); // Update everyone (including new user)
        } catch (IOException e) {
            cleanup.run();
        }

        System.out.println("User connected: " + userId);
        return emitter;
    }

    @Transactional
    public void logout(String userId) {
        SseEmitter emitter = emitters.remove(userId);
        if (emitter != null) {
            emitter.complete();
            broadcastUserList();
            System.out.println("User explicitly logged out: " + userId);

            // End any active sessions for this user
            endActiveSessions(userId);
        }
    }

    private void endActiveSessions(String userEmail) {
        User user = userRepository.findByEmail(userEmail).orElse(null);
        if (user == null)
            return;
        Long userId = user.getId();

        // Close sessions where user is caller
        List<CallSession> activeAsCaller = callSessionRepository.findByCallerIdAndStatus(userId, CallStatus.CONNECTED);
        activeAsCaller.addAll(callSessionRepository.findByCallerIdAndStatus(userId, CallStatus.TRYING));

        for (CallSession session : activeAsCaller) {
            session.end(CallStatus.ENDED);
            callSessionRepository.save(session);
        }

        // Close sessions where user is callee
        List<CallSession> activeAsCallee = callSessionRepository.findByCalleeIdAndStatus(userId, CallStatus.CONNECTED);
        activeAsCallee.addAll(callSessionRepository.findByCalleeIdAndStatus(userId, CallStatus.TRYING));

        for (CallSession session : activeAsCallee) {
            session.end(CallStatus.ENDED);
            callSessionRepository.save(session);
        }
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 10000) // 10 seconds
    public void sendHeartbeat() {
        System.out.println("Heartbeat task running. Active users: " + emitters.size() + " " + emitters.keySet());
        java.util.List<String> deadUsers = new java.util.ArrayList<>();
        emitters.forEach((id, emitter) -> {
            try {
                emitter.send(SseEmitter.event().name("ping").data("keep-alive"));
            } catch (IOException e) {
                deadUsers.add(id);
            }
        });

        if (!deadUsers.isEmpty()) {
            boolean removedAny = false;
            for (String id : deadUsers) {
                if (emitters.remove(id) != null) {
                    removedAny = true;
                }
            }
            if (removedAny) {
                broadcastUserList();
                System.out.println("Removed zombie users: " + deadUsers);
            }
        }
    }

    // Broadcast current user list to all connected clients
    private void broadcastUserList() {
        if (emitters.isEmpty())
            return;

        Set<String> activeEmails = emitters.keySet();
        List<User> users = userRepository.findByEmailIn(activeEmails);

        // Convert to list of simple DTOs or Maps to avoid leaking everything
        List<Map<String, String>> userList = users.stream()
                .map(u -> {
                    Map<String, String> map = new HashMap<>();
                    map.put("email", u.getEmail());
                    map.put("username", u.getUsername());
                    return map;
                })
                .collect(Collectors.toList());

        String userListJson;
        try {
            userListJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(userList);
        } catch (IOException e) {
            userListJson = "[]";
        }

        final String payload = userListJson; // effing effective final ref
        emitters.forEach((id, emitter) -> {
            try {
                emitter.send(SseEmitter.event().name("user_list").data(payload));
            } catch (IOException e) {
                // Should be handled by onError/onTimeout, but safe to ignore here
            }
        });
    }

    // Send a message (signal) to a specific target user
    @Transactional
    public void sendSignal(String senderEmail, String targetEmail, String type, String data) {
        SseEmitter emitter = emitters.get(targetEmail);

        // --- CDC Logic Start ---
        try {
            User sender = userRepository.findByEmail(senderEmail)
                    .orElseThrow(() -> new IllegalArgumentException("Sender not found"));
            User target = userRepository.findByEmail(targetEmail)
                    .orElseThrow(() -> new IllegalArgumentException("Target not found"));
            Long senderId = sender.getId();
            Long targetId = target.getId();

            if ("offer".equalsIgnoreCase(type)) {

                // BUSY Check
                if (callSessionRepository.existsActiveSession(targetId)) {
                    CallSession busySession = new CallSession(
                            UUID.randomUUID().toString(),
                            senderId,
                            targetId,
                            CallStatus.TRYING // Start as TRYING
                    );
                    busySession.end(CallStatus.BUSY); // Immediately end as BUSY
                    callSessionRepository.save(busySession);
                    System.out.println("CDC: Created Session (BUSY) " + busySession.getSessionId());

                    // Optional: Send BUSY signal back to sender?
                    // For now, we just record it as requested.

                    return; // Stop processing OFFER
                }

                CallSession session = new CallSession(
                        UUID.randomUUID().toString(),
                        senderId,
                        targetId,
                        CallStatus.TRYING);
                callSessionRepository.save(session);
                System.out.println("CDC: Created Session (TRYING) " + session.getSessionId());
            } else if ("answer".equalsIgnoreCase(type)) {
                // Find the session where 'targetId' (original caller) called 'senderId'
                // (original callee)
                // Note: targetEmail is the original caller (who OFFERed), senderEmail is the
                // ANSWERer (callee)
                // Wait, logic check:
                // Signal "answer" is sent FROM senderEmail TO targetEmail.
                // So senderEmail is the Callee answering, targetEmail is the Caller.
                // findTopByCallerIdAndCalleeId -> Caller=targetId, Callee=senderId
                callSessionRepository.findTopByCallerIdAndCalleeIdOrderByCreatedAtDesc(targetId, senderId)
                        .ifPresent(session -> {
                            if (CallStatus.TRYING.equals(session.getStatus())) {
                                session.connect();
                                callSessionRepository.save(session);
                                System.out.println("CDC: Updated Session (CONNECTED) " + session.getSessionId());
                            }
                        });
            } else if ("hangup".equalsIgnoreCase(type) || "bye".equalsIgnoreCase(type) ||
                    "reject".equalsIgnoreCase(type) || "busy".equalsIgnoreCase(type)) {
                // Handle explicit hangup/reject/busy
                // Case 1: Caller hangs up (senderId is Caller)
                callSessionRepository.findTopByCallerIdAndCalleeIdOrderByCreatedAtDesc(senderId, targetId)
                        .ifPresent(session -> {
                            if (!session.getStatus().isTerminal()) {
                                if (session.getStatus() == CallStatus.TRYING) {
                                    // Caller hung up while TRYING -> CANCELLED
                                    session.end(CallStatus.CANCELLED);
                                } else {
                                    // CONNECTED -> ENDED
                                    session.end(CallStatus.ENDED);
                                }
                                callSessionRepository.save(session);
                            }
                        });
                // Case 2: Callee hangs up (senderId is Callee, targetId is Caller)
                callSessionRepository.findTopByCallerIdAndCalleeIdOrderByCreatedAtDesc(targetId, senderId)
                        .ifPresent(session -> {
                            if (!session.getStatus().isTerminal()) {
                                if (session.getStatus() == CallStatus.TRYING) {
                                    // Callee responding to TRYING
                                    if ("busy".equalsIgnoreCase(type)) {
                                        session.end(CallStatus.BUSY);
                                    } else {
                                        // Default to REJECTED for hangup/reject during trying
                                        session.end(CallStatus.REJECTED);
                                    }
                                } else {
                                    // CONNECTED -> ENDED
                                    session.end(CallStatus.ENDED);
                                }
                                callSessionRepository.save(session);
                            }
                        });
            }
        } catch (Exception e) {
            System.err.println("CDC Error: " + e.getMessage());
            // Don't fail the signal sending
        }
        // --- CDC Logic End ---

        if (emitter != null) {
            try {
                // Determine event name based on signal type (OFFER, ANSWER, CANDIDATE)
                // Or just use a generic "signal" event and include type in the data
                SsePayload payload = new SsePayload(senderEmail, type, data);
                System.out.println("Processing payload for " + targetEmail + " -> ready to send.");
                emitter.send(SseEmitter.event().name("signal").data(payload));

                System.out.println("Signal sent from " + senderEmail + " to " + targetEmail + " [" + type + "]");
            } catch (IOException e) {
                emitters.remove(targetEmail);
                System.out.println(
                        "Failed to send signal to " + targetEmail + " (User disconnected or blocked): "
                                + e.getMessage());
            }
        } else {
            System.out.println("Target user not found: " + targetEmail);
        }
    }

    // Helper class for payload (inner class or separate)
    public static class SsePayload {
        public String sender;
        public String type;
        public String data; // Can be JSON string of SDP or ICE candidate

        public SsePayload(String sender, String type, String data) {
            this.sender = sender;
            this.type = type;
            this.data = data;
        }
    }
}
