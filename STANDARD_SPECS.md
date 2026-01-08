# 화상 채팅 앱 표준 기술 설명서 (Standard Technology Specifications)

본 문서는 데모(WebRTC 화상 채팅 및 CDC/CQRS)에 적용된 핵심 웹 표준 기술(**SSE**, **WebRTC**)의 스펙과 특징을 요약합니다.

---

## 1. Server-Sent Events (SSE)

### 개요 (Overview)
*   **정의**: 서버가 클라이언트에게 데이터를 실시간으로 전송(Push)하는 웹 표준 기술
*   **통신 방식**: **단방향 (Server -> Client)**
*   **프로토콜**: HTTP/1.1 및 HTTP/2 호환 (별도 핸드셰이크 불필요)

### 본 데모 활용 (Usage)
*   **Call Signaling**: 전화 요청(Offer), 수락(Answer), 거절(Reject) 이벤트 전송
*   **Status Update**: 통화 상태(TRYING, CONNECTED, ENDED) 실시간 동기화

### 주요 특징 (Key Features)
*   **Automatic Reconnection**: 연결 단절 시 브라우저가 자동 재연결 시도
*   **Event ID**: `Last-Event-ID` 헤더를 통해 연결 복구 시 유실 데이터 처리 가능
*   **Standard Interface**: 표준 `EventSource` API 사용
*   **Firewall Friendly**: 일반 HTTP 포트(80/443) 사용으로 방화벽/프록시 친화적

### 참고 문헌 (References)
*   **Standard (WHATWG)**: [HTML Standard - Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
*   **Guide (MDN)**: [Using Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)

---

## 2. WebRTC (Web Real-Time Communication)

### 개요 (Overview)
*   **정의**: 플러그인 없이 웹 브라우저 간 실시간 미디어/데이터 교환 기술
*   **통신 방식**: **P2P (Peer-to-Peer)** 양방향 통신
*   **표준화**: **W3C** (API) + **IETF** (Protocol)

### 본 데모 활용 (Usage)
*   **Media Stream**: Video/Audio 스트림 직접 전송 (Low Latency)
*   **P2P Network**: 서버 부하 최소화 및 보안성 강화 (종단간 암호화)

### 표준 스펙 및 아키텍처 (Standard Architecture)
*   **W3C Standard (API)**
    *   `RTCPeerConnection`: P2P 연결 및 스트리밍 관리
    *   `MediaStream`: 카메라/마이크 데이터 제어
*   **IETF Standard (Protocol)**
    *   `ICE` (RFC 8445): 최적의 P2P 경로 탐색 (Host, Srflx, Relay)
    *   `STUN` (RFC 5389): NAT 환경에서 공인 IP 발견
    *   `TURN` (RFC 5766): P2P 불가 시 트래픽 릴레이 (NAT Traversal)
    *   `SDP` (RFC 4566): 미디어 해상도, 코덱, 형식 협상
    *   `DTLS/SRTP`: 미디어 스트림 보안 및 암호화

### 참고 문헌 (References)
*   **W3C Spec**: [WebRTC 1.0: Real-Time Communication Between Browsers](https://www.w3.org/TR/webrtc/)
*   **IETF RFC**: [WebRTC Data Channel (RFC 8831)](https://datatracker.ietf.org/doc/html/rfc8831)
*   **Guide (MDN)**: [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

---

## 3. 요약 (Summary)

| 특징 | Server-Sent Events (SSE) | WebRTC |
| :--- | :--- | :--- |
| **Role** | **Signaling** (상태/이벤트 알림) | **Media Transport** (영상 통화) |
| **Direction** | **Server -> Client** (단방향) | **Peer <-> Peer** (양방향) |
| **Protocol** | HTTP (TCP) | UDP (Media), TCP/UDP (Data) |
| **Data Type** | Text (JSON) | Audio, Video, Binary |
| **Standard** | WHATWG (HTML) | W3C, IETF |
