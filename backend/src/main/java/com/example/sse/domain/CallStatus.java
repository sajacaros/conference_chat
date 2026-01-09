package com.example.sse.domain;

import java.util.Arrays;
import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

public enum CallStatus {
    TRYING,
    CONNECTED,
    ENDED,
    CANCELLED,
    REJECTED,
    BUSY;

    private static final Set<CallStatus> TERMINAL_STATES = Collections.unmodifiableSet(
            EnumSet.of(ENDED, CANCELLED, REJECTED, BUSY));

    /**
     * Verifies if the transition from the current status to the next status is
     * valid.
     * 
     * @param nextStatus the status to transition to
     * @throws IllegalStateException if the transition is invalid
     */
    public void verifyTransition(CallStatus nextStatus) {
        if (this == nextStatus) {
            return; // No change, valid
        }

        if (TERMINAL_STATES.contains(this)) {
            throw new IllegalStateException("Cannot transition from terminal state " + this + " to " + nextStatus);
        }

        boolean valid = false;
        switch (this) {
            case TRYING:
                // From TRYING we can go to CONNECTED (answer), CANCELLED (caller hangup),
                // REJECTED (callee hangup)
                // We also allow ENDED as a fallback for generic termination if needed, though
                // specific is better.
                valid = (nextStatus == CONNECTED || nextStatus == CANCELLED || nextStatus == REJECTED
                        || nextStatus == ENDED || nextStatus == BUSY);
                break;
            case CONNECTED:
                // From CONNECTED we can only go to ENDED
                valid = (nextStatus == ENDED);
                break;
            default:
                break;
        }

        if (!valid) {
            throw new IllegalStateException("Invalid state transition from " + this + " to " + nextStatus);
        }
    }

    public boolean isTerminal() {
        return TERMINAL_STATES.contains(this);
    }
}
