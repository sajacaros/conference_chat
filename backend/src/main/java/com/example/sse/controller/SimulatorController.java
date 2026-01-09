package com.example.sse.controller;

import com.example.sse.dto.SimulatorConfigRequest;
import com.example.sse.dto.SimulatorHistoryDto;
import com.example.sse.dto.SimulatorStatusResponse;
import com.example.sse.service.SimulatorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/simulator")
public class SimulatorController {

    private final SimulatorService simulatorService;

    public SimulatorController(SimulatorService simulatorService) {
        this.simulatorService = simulatorService;
    }

    @PostMapping("/start")
    public ResponseEntity<?> start(@RequestBody SimulatorConfigRequest config) {
        try {
            simulatorService.start(config);
            return ResponseEntity.ok(Map.of("message", "Simulation started"));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/stop")
    public ResponseEntity<?> stop() {
        simulatorService.stop();
        return ResponseEntity.ok(Map.of("message", "Simulation stopped"));
    }

    @GetMapping("/status")
    public ResponseEntity<SimulatorStatusResponse> getStatus() {
        return ResponseEntity.ok(simulatorService.getStatus());
    }

    @GetMapping("/history")
    public ResponseEntity<List<SimulatorHistoryDto>> getHistoryList() {
        List<SimulatorHistoryDto> history = simulatorService.getHistoryList().stream()
                .map(SimulatorHistoryDto::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(history);
    }

    @GetMapping("/history/{id}")
    public ResponseEntity<SimulatorHistoryDto> getHistoryById(@PathVariable Long id) {
        return simulatorService.getHistoryById(id)
                .map(SimulatorHistoryDto::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
