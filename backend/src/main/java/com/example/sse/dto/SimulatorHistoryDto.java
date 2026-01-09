package com.example.sse.dto;

import com.example.sse.domain.SimulatorHistory;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class SimulatorHistoryDto {
    private Long id;
    private int userCount;
    private int callsPerMinute;
    private int chatMessagesPerCall;
    private int minCallDurationSeconds;
    private int maxCallDurationSeconds;
    private int connectedPercent;
    private int rejectedPercent;
    private int cancelledPercent;
    private int totalCallsGenerated;
    private int totalMessagesGenerated;
    private Map<String, Integer> callsByStatus;
    private boolean running;
    private LocalDateTime startedAt;
    private LocalDateTime stoppedAt;

    public static SimulatorHistoryDto from(SimulatorHistory history) {
        SimulatorHistoryDto dto = new SimulatorHistoryDto();
        dto.setId(history.getId());
        dto.setUserCount(history.getUserCount());
        dto.setCallsPerMinute(history.getCallsPerMinute());
        dto.setChatMessagesPerCall(history.getChatMessagesPerCall());
        dto.setMinCallDurationSeconds(history.getMinCallDurationSeconds());
        dto.setMaxCallDurationSeconds(history.getMaxCallDurationSeconds());
        dto.setConnectedPercent(history.getConnectedPercent());
        dto.setRejectedPercent(history.getRejectedPercent());
        dto.setCancelledPercent(history.getCancelledPercent());
        dto.setTotalCallsGenerated(history.getTotalCallsGenerated());
        dto.setTotalMessagesGenerated(history.getTotalMessagesGenerated());
        dto.setCallsByStatus(Map.of(
                "CONNECTED", history.getCallsConnected(),
                "ENDED", history.getCallsEnded(),
                "REJECTED", history.getCallsRejected(),
                "CANCELLED", history.getCallsCancelled(),
                "BUSY", history.getCallsBusy()
        ));
        dto.setRunning(history.isRunning());
        dto.setStartedAt(history.getStartedAt());
        dto.setStoppedAt(history.getStoppedAt());
        return dto;
    }
}
