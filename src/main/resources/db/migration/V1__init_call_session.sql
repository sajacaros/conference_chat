CREATE TABLE call_session (
    session_id VARCHAR(255) PRIMARY KEY,
    caller_id VARCHAR(255) NOT NULL,
    callee_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    connected_at TIMESTAMP WITHOUT TIME ZONE,
    ended_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX idx_call_session_caller ON call_session(caller_id);
CREATE INDEX idx_call_session_callee ON call_session(callee_id);
