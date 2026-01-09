import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
    SimulatorConfig,
    SimulatorStatus,
    startSimulation,
    stopSimulation,
    getSimulatorStatus
} from '@/api/simulator'

interface SimulatorPageProps {
    email: string
    token: string
    onLogout: () => void
    onBack: () => void
}

export default function SimulatorPage({ email, token, onLogout, onBack }: SimulatorPageProps) {
    const [status, setStatus] = useState<SimulatorStatus | null>(null)
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

    // Load status on mount
    useEffect(() => {
        getSimulatorStatus(token).then(setStatus).catch(console.error)
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
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error'
            alert('Failed to stop: ' + message)
        }
        setLoading(false)
    }

    const busyPercent = Math.max(0, 100 - connectedPercent - rejectedPercent - cancelledPercent)

    return (
        <div className="flex flex-col h-screen bg-gray-950">
            <Header title="Call Simulator" email={email} onLogout={onLogout} />

            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Back button */}
                    <Button variant="outline" onClick={onBack}>Back to Contacts</Button>

                    {/* Status Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                Status
                                {status?.running && (
                                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-gray-300">
                            {status ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-500">Status</div>
                                        <div className={status.running ? 'text-green-400' : 'text-gray-400'}>
                                            {status.running ? 'Running' : 'Stopped'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">Total Calls</div>
                                        <div className="text-xl font-bold">{status.totalCallsGenerated}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">Total Messages</div>
                                        <div className="text-xl font-bold">{status.totalMessagesGenerated}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">By Status</div>
                                        <div className="text-xs space-y-1">
                                            {Object.entries(status.callsByStatus || {})
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
                        </CardContent>
                    </Card>

                    {/* Configuration */}
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

                    {/* Control Buttons */}
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
