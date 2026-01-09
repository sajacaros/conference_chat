-- Simulator history table for tracking simulation runs
CREATE TABLE simulator_history (
    id BIGSERIAL PRIMARY KEY,
    user_count INT NOT NULL,
    calls_per_minute INT NOT NULL,
    chat_messages_per_call INT NOT NULL,
    min_call_duration_seconds INT NOT NULL,
    max_call_duration_seconds INT NOT NULL,
    connected_percent INT NOT NULL,
    rejected_percent INT NOT NULL,
    cancelled_percent INT NOT NULL,
    total_calls_generated INT NOT NULL DEFAULT 0,
    total_messages_generated INT NOT NULL DEFAULT 0,
    calls_connected INT NOT NULL DEFAULT 0,
    calls_ended INT NOT NULL DEFAULT 0,
    calls_rejected INT NOT NULL DEFAULT 0,
    calls_cancelled INT NOT NULL DEFAULT 0,
    calls_busy INT NOT NULL DEFAULT 0,
    running BOOLEAN NOT NULL DEFAULT true,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stopped_at TIMESTAMP
);

-- Index for querying running simulations
CREATE INDEX idx_simulator_history_running ON simulator_history(running);

-- Index for ordering by start time
CREATE INDEX idx_simulator_history_started_at ON simulator_history(started_at DESC);
