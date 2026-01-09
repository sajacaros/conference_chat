package com.example.sse.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class SimulatorConfigRequest {
    private int userCount = 10;                    // 가상유저 수 (2-1000, vuser1~vuserN 사용)
    private int callsPerMinute = 10;               // 분당 통화 생성 수 (1-60)
    private int chatMessagesPerCall = 3;           // 통화당 채팅 메시지 수 (0-20)
    private int minCallDurationSeconds = 5;        // 최소 통화 시간
    private int maxCallDurationSeconds = 30;       // 최대 통화 시간
    private int connectedPercent = 60;             // 연결 성공 비율
    private int rejectedPercent = 20;              // 거절 비율
    private int cancelledPercent = 15;             // 취소 비율
    // BUSY = 100 - connected - rejected - cancelled (기본 5)
}
