package com.example.sse;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/sse")
@CrossOrigin(origins = "*") // Allow CORS for frontend dev server
public class SseController {

    private final SseService sseService;

    public SseController(SseService sseService) {
        this.sseService = sseService;
    }

    // 1. Connection (GET)
    @GetMapping(value = "/subscribe", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        String userId = userDetails.getUsername();
        return sseService.subscribe(userId);
    }

    // 2. Signaling (POST)
    // Body: { "sender": "userA", "target": "userB", "type": "OFFER", "data": "..."
    // }
    @PostMapping("/signal")
    public void sendSignal(@RequestBody SignalRequest request) {
        System.out.println("SSE IN (Signal): " + request.getType() + " from " + request.getSender() + " to "
                + request.getTarget());
        sseService.sendSignal(request.getSender(), request.getTarget(), request.getType(), request.getData());
    }

    // 3. Logout (DELETE)
    @DeleteMapping("/logout")
    public void logout(
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        if (userDetails != null) {
            sseService.logout(userDetails.getUsername());
        }
    }

    // DTO
    public static class SignalRequest {
        private String sender;
        private String target;
        private String type; // OFFER, ANSWER, CANDIDATE
        private String data; // SDP or ICE candidate JSON

        public String getSender() {
            return sender;
        }

        public void setSender(String sender) {
            this.sender = sender;
        }

        public String getTarget() {
            return target;
        }

        public void setTarget(String target) {
            this.target = target;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getData() {
            return data;
        }

        public void setData(String data) {
            this.data = data;
        }
    }
}
