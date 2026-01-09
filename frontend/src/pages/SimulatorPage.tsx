import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
        getSimulatorStatus(token).then(setStatus).catch(console.error)
        getSimulatorHistoryList(token).then(setHistoryList).catch(console.error)
    }, [token])

    // Poll status while running
    useEffect(() => {
        if (!status?.running) return
        const interval = setInterval(() => {
            getSimulatorStatus(token).then(setStatus).catch(console.error)
        }, 2000)
        return () => clearInterval(interval)
    }, [status?.running, token])

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
            const newStatus = await getSimulatorStatus(token)
            setStatus(newStatus)
            setSelectedHistory(null) // Clear selection when starting new
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
            const newStatus = await getSimulatorStatus(token)
            setStatus(newStatus)
            // Reload history list
            const newHistory = await getSimulatorHistoryList(token)
            setHistoryList(newHistory)
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error'
            alert('Failed to stop: ' + message)
        }
        setLoading(false)
    }

    const handleSelectHistory = (history: SimulatorHistory) => {
        setSelectedHistory(history)
    }

    const handleBackToNew = () => {
        setSelectedHistory(null)
    }

    const busyPercent = Math.max(0, 100 - connectedPercent - rejectedPercent - cancelledPercent)

    // Determine what to display
    const isViewingHistory = selectedHistory !== null && !selectedHistory.running
    const displayData = isViewingHistory ? selectedHistory : status

    return (
        <div className="flex flex-col h-screen bg-gray-950">
            <Header title="Call Simulator" email={email} onLogout={onLogout} />

            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Back button */}
                    <Button variant="outline" onClick={onBack}>Back to Contacts</Button>

                    {/* History Selection Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-white">Simulation History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {historyList.length === 0 ? (
                                <div className="text-gray-500 text-sm">No simulation history yet</div>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {/* New Simulation option */}
                                    <div
                                        onClick={handleBackToNew}
                                        className={`p-3 rounded cursor-pointer transition-colors ${
                                            !isViewingHistory
                                                ? 'bg-blue-900 border border-blue-600'
                                                : 'bg-gray-800 hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-white font-medium">+ New Simulation</span>
                                            {status?.running && (
                                                <span className="text-xs bg-green-600 px-2 py-1 rounded">Running</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* History items */}
                                    {historyList.map(history => (
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
                                                    <span className="text-white text-sm">
                                                        #{history.id} - {history.userCount} users, {history.callsPerMinute}/min
                                                    </span>
                                                    <div className="text-xs text-gray-400">
                                                        {formatDateTime(history.startedAt)}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400">
                                                        {history.totalCallsGenerated} calls
                                                    </span>
                                                    {history.running ? (
                                                        <span className="text-xs bg-green-600 px-2 py-1 rounded">Running</span>
                                                    ) : (
                                                        <span className="text-xs bg-gray-600 px-2 py-1 rounded">Stopped</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Status Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                {isViewingHistory ? `History #${selectedHistory.id}` : 'Current Status'}
                                {displayData && 'running' in displayData && displayData.running && (
                                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-gray-300">
                            {displayData ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-500">Status</div>
                                        <div className={displayData.running ? 'text-green-400' : 'text-gray-400'}>
                                            {displayData.running ? 'Running' : 'Stopped'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">Total Calls</div>
                                        <div className="text-xl font-bold">{displayData.totalCallsGenerated}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">Total Messages</div>
                                        <div className="text-xl font-bold">{displayData.totalMessagesGenerated}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">By Status</div>
                                        <div className="text-xs space-y-1">
                                            {Object.entries(displayData.callsByStatus || {})
                                                .filter(([, v]) => v > 0)
                                                .map(([k, v]) => (
                                                    <div key={k} className="flex justify-between">
                                                        <span className={getStatusColor(k)}>{k}</span>
                                                        <span>{v}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>Loading...</div>
                            )}

                            {/* Show history config when viewing history */}
                            {isViewingHistory && (
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <div className="text-sm text-gray-500 mb-2">Configuration Used</div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                        <div><span className="text-gray-500">Users:</span> {selectedHistory.userCount}</div>
                                        <div><span className="text-gray-500">Calls/min:</span> {selectedHistory.callsPerMinute}</div>
                                        <div><span className="text-gray-500">Messages:</span> {selectedHistory.chatMessagesPerCall}</div>
                                        <div><span className="text-gray-500">Duration:</span> {selectedHistory.minCallDurationSeconds}-{selectedHistory.maxCallDurationSeconds}s</div>
                                        <div><span className="text-green-400">Connected:</span> {selectedHistory.connectedPercent}%</div>
                                        <div><span className="text-red-400">Rejected:</span> {selectedHistory.rejectedPercent}%</div>
                                        <div><span className="text-yellow-400">Cancelled:</span> {selectedHistory.cancelledPercent}%</div>
                                        <div><span className="text-orange-400">Busy:</span> {100 - selectedHistory.connectedPercent - selectedHistory.rejectedPercent - selectedHistory.cancelledPercent}%</div>
                                    </div>
                                    {selectedHistory.stoppedAt && (
                                        <div className="mt-2 text-xs text-gray-500">
                                            Stopped at: {formatDateTime(selectedHistory.stoppedAt)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Configuration - only show when not viewing history */}
                    {!isViewingHistory && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-white">Configuration</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Basic Settings */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Virtual Users (2-1000)</label>
                                        <Input
                                            type="number"
                                            min={2}
                                            max={1000}
                                            value={userCount}
                                            onChange={e => setUserCount(Number(e.target.value))}
                                            disabled={status?.running}
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
                                            disabled={status?.running}
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
                                            disabled={status?.running}
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
                                                disabled={status?.running}
                                                className="w-16"
                                            />
                                            <span className="text-gray-500">~</span>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={300}
                                                value={maxDuration}
                                                onChange={e => setMaxDuration(Number(e.target.value))}
                                                disabled={status?.running}
                                                className="w-16"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Outcome Probabilities */}
                                <div className="border-t border-gray-700 pt-4">
                                    <div className="text-sm text-gray-400 mb-2">Outcome Probabilities (must total ≤100%)</div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-sm text-green-400 mb-1">Connected %</label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={connectedPercent}
                                                onChange={e => setConnectedPercent(Number(e.target.value))}
                                                disabled={status?.running}
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
                                                disabled={status?.running}
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
                                                disabled={status?.running}
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
                            </CardContent>
                        </Card>
                    )}

                    {/* Control Buttons - only show when not viewing history */}
                    {!isViewingHistory && (
                        <div className="flex justify-center gap-4">
                            {status?.running ? (
                                <Button variant="danger" onClick={handleStop} disabled={loading}>
                                    {loading ? 'Stopping...' : 'Stop Simulation'}
                                </Button>
                            ) : (
                                <Button onClick={handleStart} disabled={loading || userCount < 2}>
                                    {loading ? 'Starting...' : 'Start Simulation'}
                                </Button>
                            )}
                        </div>
                    )}

                </div>
            </div>
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
