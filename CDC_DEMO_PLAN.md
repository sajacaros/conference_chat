# CDC/CQRS 데모 구현 가이드 (CDC_DEMO_PLAN.md)

이 문서는 WebRTC 화상 채팅 앱을 활용하여 **ETL 솔루션의 CDC 및 CQRS 성능을 시연**하기 위한 아키텍처와 구현 계획을 정리한 것입니다.

## 1. 아키텍처 개요 (Architecture)

```mermaid
graph LR
    App[WebRTC App] -->|Write (Insert/Update)| PG[(PostgreSQL)]
    PG -->|CDC (Log Capture)| ETL[ETL Solution]
    ETL -->|Replicate| QDB[(QuestDB)]
    Grafana[Grafana Dashboard] -->|Read (Query)| QDB
    App -.->|Phase 2: Read (Select)| QDB
```

*   **Write Side (Command)**: Spring Boot 앱이 `CallSession` 데이터를 PostgreSQL에 트랜잭셔널하게 기록합니다. (상태 변화: TRYING -> CONNECTED -> ENDED)
*   **Read Side (Query)**: Grafana가 QuestDB를 조회하여 실시간 통화 통계와 로그를 시각화합니다.
*   **Demo Point**: 앱에서 통화를 걸면 -> Postgres에 기록되고 -> ETL을 타고 -> QuestDB/Grafana 그래프가 실시간으로 움직이는 것을 보여줍니다.

---

## 2. 내일 구현할 작업 (Phase 1: Backend Implementation)

내일은 Spring Boot 애플리케이션이 **PostgreSQL에 데이터를 쌓도록** 수정하는 작업을 진행합니다.

### A. 의존성 및 설정 (`build.gradle`, `application.yml`)
*   **Dependencies**: `jpa`, `postgresql`, `flyway` 추가.
*   **Configuration**:
    *   JPA `ddl-auto`를 `validate`로 설정하여 안정성 확보.
    *   Flyway 활성화 (DB 스키마 자동 마이그레이션).

### B. DB 스키마 (Flyway)
*   `src/main/resources/db/migration/V1__init_call_session.sql` 작성.
*   `call_session` 테이블 생성 (세션ID, 발신자, 수신자, 시작/종료시간, 상태).

### C. 비즈니스 로직 (`SseService.java`)
*   `CallSession` 엔티티 및 Repository 구현.
*   WebRTC 시그널링(`sendSignal`) 시점에 맞춰 DB 기록:
    1.  **OFFER**: `INSERT` (Status: `TRYING`)
    2.  **ANSWER**: `UPDATE` (Status: `CONNECTED`)
    3.  **End/Logout**: `UPDATE` (Status: `ENDED`, `end_created`)

---

## 3. 인프라 설정 가이드 (Infrastructure Setup)

구현 후 시연을 위해 설정해야 할 내용입니다.

### A. Grafana - QuestDB 연동 (1분 컷)
QuestDB는 PostgreSQL Wire Protocol을 지원하므로 **PostgreSQL 드라이버**로 연결합니다.

1.  **Grafana** 접속 -> **Connections** -> **Data Sources** -> **Add new**.
2.  **"PostgreSQL"** 검색 및 선택 (QuestDB 아님!).
3.  **연결 정보 입력**:
    *   **Host**: `localhost:8812` (주의: 8812 포트)
    *   **Database**: `qdb`
    *   **User/Password**: `admin` / `quest`
    *   **TLS/SSL**: `Disable`
4.  **Save & Test** -> "Database Connection OK" 확인.

### B. 시연용 Grafana 쿼리 예시
```sql
-- 실시간 상태별 통화 수 (Bar Chart / Time Series)
SELECT status, count()
FROM call_sessions
SAMPLE BY 5s; -- QuestDB 전용 5초 샘플링 문법
```

---

## 4. 시연 시나리오 (Demo Script)

1.  **화면 분할**: 왼쪽(웹 앱), 오른쪽(Grafana 대시보드).
2.  **통화 시작**: User A가 User B에게 전화를 검.
    *   *Effect*: Grafana에서 "TRYING" 카운트 증가.
    *   *Msg*: "Write DB(Postgres)에 트랜잭션이 발생했습니다."
3.  **통화 연결**: User B가 수락.
    *   *Effect*: "TRYING" -> "CONNECTED"로 상태 이동.
    *   *Msg*: "Update 이벤트가 CDC를 통해 즉시 분석 DB(QuestDB)로 반영됩니다."
4.  **통화 종료**: 종료 버튼 클릭.
    *   *Effect*: "CONNECTED" -> "ENDED"로 이동 및 통화 시간 기록됨.

---

## 5. 향후 발전 방향 (Phase 2: Full CQRS)

현재의 Phase 1이 "인프라 레벨의 데이터 파이프라인 검증"이라면, Phase 2는 **"애플리케이션 레벨의 진정한 CQRS 완성"**입니다.

*   **시나리오**: 앱 내에 "내 통화 통계" 또는 "실시간 서비스 현황" 메뉴 추가.
*   **구현**: Spring Boot가 **직접 QuestDB를 조회**(`Secondary DataSource`)하여 화면에 뿌려줌.
*   **검증 포인트**:
    *   사용자가 통화를 마치고 "통화 목록"을 조회했을 때, 방금 끝난 통화가 바로 보이는가?
    *   만약 바로 보인다면? -> **"여러분의 ETL 솔루션은 Latency가 거의 '0'에 가깝습니다."** (강력한 세일즈 포인트)
