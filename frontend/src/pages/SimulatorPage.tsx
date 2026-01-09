import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
    SimulatorConfig,
    SimulatorStatus,
    SimulatorHistory,
    startSimulation,
    stopSimulation,
    getSimulatorStatus,
    getSimulatorHistoryList
} from '@/api/simulator'

interface SimulatorPageProps {
    email: string
    token: string
    onLogout: () => void
    onBack: () => void
}

export default function SimulatorPage({ email, token, onLogout, onBack }: SimulatorPageProps) {
    const [status, setStatus] = useState<SimulatorStatus | null>(null)
    const [historyList, setHistoryList] = useState<SimulatorHistory[]>([])
    const [selectedHistory, setSelectedHistory] = useState<SimulatorHistory | null>(null)
    const [loading, setLoading] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)

    // Config state with defaults
    const [userCount, setUserCount] = useState(10)
    const [callsPerMinute, setCallsPerMinute] = useState(10)
    const [chatMessagesPerCall, setChatMessagesPerCall] = useState(3)
    const [minDuration, setMinDuration] = useState(5)
    const [maxDuration, setMaxDuration] = useState(30)
    const [connectedPercent, setConnectedPercent] = useState(60)
    const [rejectedPercent, setRejectedPercent] = useState(20)
    const [cancelledPercent, setCancelledPercent] = useState(15)

    // Load status and history on mount
    useEffect(() => {
        loadData()
    }, [token])

    const loadData = async () => {
        try {
            const [statusData, historyData] = await Promise.all([
                getSimulatorStatus(token),
                getSimulatorHistoryList(token)
            ])
            setStatus(statusData)
            setHistoryList(historyData)
        } catch (e) {
            console.error('Failed to load data:', e)
        }
    }

    // Poll status while running
    useEffect(() => {
        if (!status?.running) return
        const interval = setInterval(async () => {
            try {
                const newStatus = await getSimulatorStatus(token)
                setStatus(newStatus)
                // Also refresh history to update running item stats
                if (selectedHistory?.running) {
                    const newHistory = await getSimulatorHistoryList(token)
                    setHistoryList(newHistory)
                    const updated = newHistory.find(h => h.id === selectedHistory.id)
                    if (updated) setSelectedHistory(updated)
                }
            } catch (e) {
                console.error('Failed to poll status:', e)
            }
        }, 2000)
        return () => clearInterval(interval)
    }, [status?.running, selectedHistory?.id, selectedHistory?.running, token])

    const handleStart = async () => {
        if (userCount < 2) {
            alert('At least 2 users required')
            return
        }

        const config: SimulatorConfig = {
            userCount,
            callsPerMinute,
            chatMessagesPerCall,
            minCallDurationSeconds: minDuration,
            maxCallDurationSeconds: maxDuration,
            connectedPercent,
            rejectedPercent,
            cancelledPercent
        }

        setLoading(true)
        try {
            await startSimulation(token, config)
            setShowCreateModal(false)
            await loadData()
            // Select the newly created (running) simulation
            const newHistory = await getSimulatorHistoryList(token)
            const running = newHistory.find(h => h.running)
            if (running) setSelectedHistory(running)
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error'
            alert('Failed to start: ' + message)
        }
        setLoading(false)
    }

    const handleStop = async () => {
        setLoading(true)
        try {
            await stopSimulation(token)
            await loadData()
            // Refresh selected history
            if (selectedHistory) {
                const newHistory = await getSimulatorHistoryList(token)
                const updated = newHistory.find(h => h.id === selectedHistory.id)
                if (updated) setSelectedHistory(updated)
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error'
            alert('Failed to stop: ' + message)
        }
        setLoading(false)
    }

    const handleSelectHistory = (history: SimulatorHistory) => {
        setSelectedHistory(history)
    }

    const resetForm = () => {
        setUserCount(10)
        setCallsPerMinute(10)
        setChatMessagesPerCall(3)
        setMinDuration(5)
        setMaxDuration(30)
        setConnectedPercent(60)
        setRejectedPercent(20)
        setCancelledPercent(15)
    }

    const openCreateModal = () => {
        resetForm()
        setShowCreateModal(true)
    }

    const busyPercent = Math.max(0, 100 - connectedPercent - rejectedPercent - cancelledPercent)

    return (
        <div className="flex flex-col h-screen bg-gray-950">
            <Header title="Call Simulator" email={email} onLogout={onLogout} />

            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Back button */}
                    <Button variant="outline" onClick={onBack}>Back to Contacts</Button>

                    {/* History List Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-white">Simulation History</CardTitle>
                                <Button
                                    size="sm"
                                    onClick={openCreateModal}
                                    disabled={status?.running}
                                    title={status?.running ? 'Stop current simulation first' : 'Create new simulation'}
                                >
                                    + New
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {historyList.length === 0 ? (
                                <div className="text-gray-500 text-sm text-center py-8">
                                    No simulation history yet.<br />
                                    Click "+ New" to create your first simulation.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {historyList.map(history => {
                                        // For running simulation, use real-time status data
                                        const isRunning = history.running && status?.running
                                        const totalCalls = isRunning ? status.totalCallsGenerated : history.totalCallsGenerated
                                        const totalMessages = isRunning ? status.totalMessagesGenerated : history.totalMessagesGenerated

                                        return (
                                            <div
                                                key={history.id}
                                                onClick={() => handleSelectHistory(history)}
                                                className={`p-3 rounded cursor-pointer transition-colors ${
                                                    selectedHistory?.id === history.id
                                                        ? 'bg-blue-900 border border-blue-600'
                                                        : 'bg-gray-800 hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="text-white text-sm font-medium">
                                                            #{history.id}
                                                        </span>
                                                        <span className="text-gray-400 text-sm ml-2">
                                                            {history.userCount} users, {history.callsPerMinute}/min
                                                        </span>
                                                        <div className="text-xs text-gray-500">
                                                            {formatDateTime(history.startedAt)}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <div className="text-sm text-white">{totalCalls} calls</div>
                                                            <div className="text-xs text-gray-400">{totalMessages} msgs</div>
                                                        </div>
                                                        {history.running ? (
                                                            <span className="text-xs bg-green-600 px-2 py-1 rounded flex items-center gap-1">
                                                                <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
                                                                Running
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs bg-gray-600 px-2 py-1 rounded">Stopped</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Selected History Detail */}
                    {selectedHistory && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    Simulation #{selectedHistory.id}
                                    {selectedHistory.running && (
                                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Stats - use real-time status data when running */}
                                {(() => {
                                    // For running simulation, use real-time status data
                                    const isRunning = selectedHistory.running && status?.running
                                    const totalCalls = isRunning ? status.totalCallsGenerated : selectedHistory.totalCallsGenerated
                                    const totalMessages = isRunning ? status.totalMessagesGenerated : selectedHistory.totalMessagesGenerated
                                    const callsByStatus = isRunning ? status.callsByStatus : selectedHistory.callsByStatus

                                    return (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <div className="text-sm text-gray-500">Status</div>
                                                <div className={selectedHistory.running ? 'text-green-400 font-medium' : 'text-gray-400'}>
                                                    {selectedHistory.running ? 'Running' : 'Stopped'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Total Calls</div>
                                                <div className="text-xl font-bold text-white">{totalCalls}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Total Messages</div>
                                                <div className="text-xl font-bold text-white">{totalMessages}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">By Status</div>
                                                <div className="text-xs space-y-1">
                                                    {Object.entries(callsByStatus || {})
                                                        .filter(([, v]) => v > 0)
                                                        .map(([k, v]) => (
                                                            <div key={k} className="flex justify-between">
                                                                <span className={getStatusColor(k)}>{k}</span>
                                                                <span className="text-white">{v}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Configuration */}
                                <div className="pt-4 border-t border-gray-700">
                                    <div className="text-sm text-gray-500 mb-2">Configuration</div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                        <div><span className="text-gray-500">Users:</span> <span className="text-white">{selectedHistory.userCount}</span></div>
                                        <div><span className="text-gray-500">Calls/min:</span> <span className="text-white">{selectedHistory.callsPerMinute}</span></div>
                                        <div><span className="text-gray-500">Messages:</span> <span className="text-white">{selectedHistory.chatMessagesPerCall}</span></div>
                                        <div><span className="text-gray-500">Duration:</span> <span className="text-white">{selectedHistory.minCallDurationSeconds}-{selectedHistory.maxCallDurationSeconds}s</span></div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-2">
                                        <div><span className="text-green-400">Connected:</span> <span className="text-white">{selectedHistory.connectedPercent}%</span></div>
                                        <div><span className="text-red-400">Rejected:</span> <span className="text-white">{selectedHistory.rejectedPercent}%</span></div>
                                        <div><span className="text-yellow-400">Cancelled:</span> <span className="text-white">{selectedHistory.cancelledPercent}%</span></div>
                                        <div><span className="text-orange-400">Busy:</span> <span className="text-white">{100 - selectedHistory.connectedPercent - selectedHistory.rejectedPercent - selectedHistory.cancelledPercent}%</span></div>
                                    </div>
                                </div>

                                {/* Time info */}
                                <div className="pt-4 border-t border-gray-700 text-xs text-gray-500">
                                    <div>Started: {formatDateTime(selectedHistory.startedAt)}</div>
                                    {selectedHistory.stoppedAt && (
                                        <div>Stopped: {formatDateTime(selectedHistory.stoppedAt)}</div>
                                    )}
                                </div>

                                {/* Stop button for running simulation */}
                                {selectedHistory.running && (
                                    <div className="pt-4 border-t border-gray-700 flex justify-center">
                                        <Button variant="danger" onClick={handleStop} disabled={loading}>
                                            {loading ? 'Stopping...' : 'Stop Simulation'}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>

            {/* Create Simulation Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="New Simulation"
            >
                <div className="space-y-4">
                    {/* Basic Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Virtual Users (2-1000)</label>
                            <Input
                                type="number"
                                min={2}
                                max={1000}
                                value={userCount}
                                onChange={e => setUserCount(Number(e.target.value))}
                            />
                            <div className="text-xs text-gray-500 mt-1">vuser1 ~ vuser{userCount}</div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Calls/Minute</label>
                            <Input
                                type="number"
                                min={1}
                                max={60}
                                value={callsPerMinute}
                                onChange={e => setCallsPerMinute(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Messages/Call</label>
                            <Input
                                type="number"
                                min={0}
                                max={20}
                                value={chatMessagesPerCall}
                                onChange={e => setChatMessagesPerCall(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Duration (s)</label>
                            <div className="flex gap-1 items-center">
                                <Input
                                    type="number"
                                    min={1}
                                    max={300}
                                    value={minDuration}
                                    onChange={e => setMinDuration(Number(e.target.value))}
                                    className="w-20"
                                />
                                <span className="text-gray-500">~</span>
                                <Input
                                    type="number"
                                    min={1}
                                    max={300}
                                    value={maxDuration}
                                    onChange={e => setMaxDuration(Number(e.target.value))}
                                    className="w-20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Outcome Probabilities */}
                    <div className="border-t border-gray-700 pt-4">
                        <div className="text-sm text-gray-400 mb-2">Outcome Probabilities (≤100%)</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-green-400 mb-1">Connected %</label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={connectedPercent}
                                    onChange={e => setConnectedPercent(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-red-400 mb-1">Rejected %</label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={rejectedPercent}
                                    onChange={e => setRejectedPercent(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-yellow-400 mb-1">Cancelled %</label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={cancelledPercent}
                                    onChange={e => setCancelledPercent(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-orange-400 mb-1">Busy % (auto)</label>
                                <Input
                                    type="number"
                                    value={busyPercent}
                                    disabled
                                    className="bg-gray-700"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleStart} disabled={loading || userCount < 2}>
                            {loading ? 'Starting...' : 'Start Simulation'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

function getStatusColor(status: string): string {
    switch (status) {
        case 'CONNECTED': return 'text-green-400'
        case 'ENDED': return 'text-blue-400'
        case 'REJECTED': return 'text-red-400'
        case 'CANCELLED': return 'text-yellow-400'
        case 'BUSY': return 'text-orange-400'
        case 'TRYING': return 'text-gray-400'
        default: return 'text-gray-400'
    }
}

function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}
