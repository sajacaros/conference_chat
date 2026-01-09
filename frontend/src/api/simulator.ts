const API_URL = import.meta.env.VITE_API_URL;

export interface SimulatorConfig {
  userCount: number;
  callsPerMinute: number;
  chatMessagesPerCall: number;
  minCallDurationSeconds: number;
  maxCallDurationSeconds: number;
  connectedPercent: number;
  rejectedPercent: number;
  cancelledPercent: number;
}

export interface SimulatorStatus {
  running: boolean;
  totalCallsGenerated: number;
  totalMessagesGenerated: number;
  callsByStatus: Record<string, number>;
  startedAt: string | null;
  lastCallAt: string | null;
}

export async function startSimulation(token: string, config: SimulatorConfig): Promise<void> {
  const res = await fetch(`${API_URL}/simulator/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(config)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to start simulation' }));
    throw new Error(data.error || 'Failed to start simulation');
  }
}

export async function stopSimulation(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/simulator/stop`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to stop simulation');
}

export async function getSimulatorStatus(token: string): Promise<SimulatorStatus> {
  const res = await fetch(`${API_URL}/simulator/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to get status');
  return res.json();
}
