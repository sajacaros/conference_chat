package com.example.sse.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class SimulatorStatusResponse {
    private boolean running;
    private Long historyId;
    private int totalCallsGenerated;
    private int totalMessagesGenerated;
    private Map<String, Integer> callsByStatus;
    private LocalDateTime startedAt;
    private LocalDateTime lastCallAt;
}
