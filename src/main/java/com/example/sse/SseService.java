package com.example.sse;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SseService {

    // Store active connections: userId -> SseEmitter
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

    public void logout(String userId) {
        SseEmitter emitter = emitters.remove(userId);
        if (emitter != null) {
            emitter.complete();
            broadcastUserList();
            System.out.println("User explicitly logged out: " + userId);
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
        // Simple list of user IDs
        String userListJson = "[" + String.join(",", emitters.keySet().stream().map(s -> "\"" + s + "\"").toList())
                + "]";

        emitters.forEach((id, emitter) -> {
            try {
                emitter.send(SseEmitter.event().name("user_list").data(userListJson));
            } catch (IOException e) {
                // Should be handled by onError/onTimeout, but safe to ignore here
            }
        });
    }

    // Send a message (signal) to a specific target user
    public void sendSignal(String senderId, String targetId, String type, String data) {
        SseEmitter emitter = emitters.get(targetId);
        if (emitter != null) {
            try {
                // Determine event name based on signal type (OFFER, ANSWER, CANDIDATE)
                // Or just use a generic "signal" event and include type in the data
                SsePayload payload = new SsePayload(senderId, type, data);
                System.out.println("Processing payload for " + targetId + " -> ready to send.");
                emitter.send(SseEmitter.event().name("signal").data(payload));

                System.out.println("Signal sent from " + senderId + " to " + targetId + " [" + type + "]");
            } catch (IOException e) {
                emitters.remove(targetId);
                System.out.println(
                        "Failed to send signal to " + targetId + " (User disconnected or blocked): " + e.getMessage());
            }
        } else {
            System.out.println("Target user not found: " + targetId);
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
