package com.example.sse.repository;

import com.example.sse.domain.SimulatorHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SimulatorHistoryRepository extends JpaRepository<SimulatorHistory, Long> {

    // Find currently running simulation (should be 0 or 1)
    Optional<SimulatorHistory> findByRunningTrue();

    // Check if any simulation is running
    boolean existsByRunningTrue();

    // Get all history ordered by start time descending
    List<SimulatorHistory> findAllByOrderByStartedAtDesc();
}
