import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useSSE } from './hooks/useSSE'
import { useWebRTC } from './hooks/useWebRTC'
import { useChat } from './hooks/useChat'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UserListPage from './pages/UserListPage'
import CallPage from './pages/CallPage'
import ChatHistoryPage from './pages/ChatHistoryPage'
import { SseLogPanel, DebugLogEntry } from './components/debug/SseLogPanel'

function RedirectToLogin() {
    useEffect(() => {
        const t = setTimeout(() => {
            window.location.replace(import.meta.env.BASE_URL + 'login')
        }, 100)
        return () => clearTimeout(t)
    }, [])
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
            <div className="text-xl font-semibold animate-pulse">Redirecting to Login...</div>
        </div>
    )
}

function App() {
    const navigate = useNavigate()
    const location = useLocation()

    // -- Hooks --
    const { user, loading: authLoading, login, logout } = useAuth()
    const { messages, addMessage, clearMessages, loadHistory } = useChat()
    const [userList, setUserList] = useState<any[]>([])
    const [incomingCall, setIncomingCall] = useState<{ sender: string; data: any } | null>(null)
    const [callTarget, setCallTarget] = useState('')

    // Debug log state
    const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([])
    const [isLogPanelOpen, setIsLogPanelOpen] = useState(false)
    const logIdRef = useRef(0)

    const addDebugLog = useCallback((type: string, message: string) => {
        const now = new Date()
        const timestamp = now.toLocaleTimeString('ko-KR', { hour12: false }) + '.' + now.getMilliseconds().toString().padStart(3, '0')
        setDebugLogs(prev => [...prev.slice(-200), { // Keep last 200 logs
            id: logIdRef.current++,
            timestamp,
            type,
            message
        }])
    }, [])

    const clearDebugLogs = useCallback(() => {
        setDebugLogs([])
    }, [])

    // Stream State
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

    const [signalHandler, setSignalHandler] = useState<((sender: string, type: string, data: any) => Promise<void>) | null>(null)

    // Use refs for handlers to avoid recreation
    const signalHandlerRef = useRef(signalHandler)
    const incomingCallRef = useRef(incomingCall)

    useEffect(() => {
        signalHandlerRef.current = signalHandler
        incomingCallRef.current = incomingCall
    }, [signalHandler, incomingCall])

    const handleSSESignal = useCallback((payload: any) => {
        const { sender, type, data } = payload
        console.log('[App] SSE Signal received:', { sender, type, pathname: location.pathname })

        if (type === 'CHAT') {
            addMessage(sender, data)
            return
        }

        if (type === 'OFFER') {
            console.log('[App] OFFER received from:', sender, 'current path:', location.pathname)
            if (location.pathname === '/call') {
                console.log('[App] Already in call, should send BUSY')
                // sendSignal(sender, 'BUSY', {}) // Need access to sendSignal here.
            } else {
                console.log('[App] Setting incoming call:', { sender, data })
                // OFFER 받으면 기존 candidate 캐시 초기화
                sessionStorage.removeItem('call_candidates')
                setIncomingCall({ sender, data })
            }
            return
        }

        // /call 페이지가 아닐 때 CANDIDATE를 sessionStorage에 버퍼링
        // (hard navigation 후에도 유지되도록)
        if (type === 'CANDIDATE' && location.pathname !== '/call') {
            const currentCall = incomingCallRef.current
            if (currentCall && currentCall.sender === sender) {
                const cached = sessionStorage.getItem('call_candidates')
                const candidates = cached ? JSON.parse(cached) : []
                candidates.push(data)
                sessionStorage.setItem('call_candidates', JSON.stringify(candidates))
                console.log('[App] Buffered CANDIDATE to sessionStorage, count:', candidates.length)
            }
            return
        }

        if (signalHandlerRef.current) {
            signalHandlerRef.current(sender, type, data)
        } else {
            if (type === 'HANGUP' || type === 'REJECT') {
                const currentCall = incomingCallRef.current
                if (currentCall && currentCall.sender === sender) {
                    setIncomingCall(null)
                }
            }
        }

        if (type === 'HANGUP') {
            const currentCall = incomingCallRef.current
            if (currentCall && currentCall.sender === sender) {
                setIncomingCall(null)
            }
        }

    }, [addMessage, location.pathname])

    // -- SSE Handlers --
    const handleSSEConnect = useCallback(() => {
        console.log('[App] SSE Connected successfully')
    }, [])

    const handleUserList = useCallback((users: any[]) => {
        setUserList(users)
    }, [])

    // -- SSE --
    const { connect, disconnect, sendSignal } = useSSE({
        token: user?.token,
        email: user?.email,
        onUserList: handleUserList,
        onSignal: handleSSESignal,
        onConnect: handleSSEConnect,
        onDebug: addDebugLog
    })

    const [isCallInitiator, setIsCallInitiator] = useState(false)
    const [isCallSetup, setIsCallSetup] = useState(false) // Preventing double firing

    // -- Handlers for WebRTC --
    const handleHangup = useCallback(() => {
        // Clear session storage
        sessionStorage.removeItem('call_target')
        sessionStorage.removeItem('call_initiator')
        sessionStorage.removeItem('call_offer')
        sessionStorage.removeItem('call_candidates')

        // Clear call state BEFORE setting isCallSetup to false
        // to prevent useEffect from re-triggering a call
        setCallTarget('')
        setIsCallInitiator(false)

        clearMessages()
        setLocalStream(null)
        setRemoteStream(null)
        setIsCallSetup(false)
        setIncomingCall(null)

        // Navigate after state is cleared
        window.location.href = import.meta.env.BASE_URL
    }, [clearMessages])

    const handleLocalStream = useCallback((s: MediaStream) => setLocalStream(s), [])
    const handleRemoteStream = useCallback((s: MediaStream) => setRemoteStream(s), [])
    const handleWebRTCDebug = useCallback((type: string, msg: string) => {
        addDebugLog(`DEBUG:${type}`, msg)
    }, [addDebugLog])

    // -- WebRTC --
    const {
        startCall: webrtcStartCall,
        acceptCall: webrtcAcceptCall,
        hangup: webrtcHangup,
        handleWebRTCSignal,
        isScreenSharing,
        toggleScreenShare
    } = useWebRTC({
        sendSignal,
        onHangup: handleHangup,
        onLocalStream: handleLocalStream,
        onRemoteStream: handleRemoteStream,
        onDebug: handleWebRTCDebug
    })

    // Link signal handler - use ref to avoid infinite loop
    const handleWebRTCSignalRef = useRef(handleWebRTCSignal)
    useEffect(() => {
        handleWebRTCSignalRef.current = handleWebRTCSignal
    }, [handleWebRTCSignal])

    useEffect(() => {
        setSignalHandler(() => (sender: string, type: string, data: any) => {
            return handleWebRTCSignalRef.current(sender, type, data)
        })
    }, []) // Only set once

    // -- Effects --
    useEffect(() => {
        if (user) {
            connect()
        } else {
            disconnect()
        }
    }, [user, connect, disconnect])

    // -- Load Chat History when call target is set --
    useEffect(() => {
        if (callTarget && user?.token && user?.email) {
            loadHistory(user.token, callTarget, user.email)
        }
    }, [callTarget, user?.token, user?.email, loadHistory])

    // -- Auto-Start Call Logic --
    useEffect(() => {
        if (location.pathname !== '/call') {
            // Reset setup flag when leaving
            if (isCallSetup) setIsCallSetup(false)
            return
        }

        // Wait for user to be loaded
        if (!user) {
            console.log('[App] Call init: waiting for user to load')
            return
        }

        // Prevent multiple initializations
        if (isCallSetup || localStream) return

        // Restore from Session Storage if state is missing (e.g. after refresh/hard-nav)
        const sessionTarget = sessionStorage.getItem('call_target')
        const sessionInitiator = sessionStorage.getItem('call_initiator')
        const sessionOffer = sessionStorage.getItem('call_offer')

        const target = callTarget || sessionTarget
        const initiator = callTarget ? isCallInitiator : sessionInitiator === 'true'
        const offerData = sessionOffer ? JSON.parse(sessionOffer) : null

        if (!target) return

        // Update state only once
        if (!callTarget && sessionTarget) {
            setCallTarget(sessionTarget)
            setIsCallInitiator(sessionInitiator === 'true')
        }

        const initCall = async () => {
            setIsCallSetup(true)
            try {
                if (initiator) {
                    await webrtcStartCall(target)
                } else {
                    // Receiver
                    const data = incomingCall?.data || offerData
                    if (data) {
                        await webrtcAcceptCall(target, data)
                        if (incomingCall) setIncomingCall(null)
                    }
                }
            } catch (e) {
                console.error('[Call] Failed to start:', e)
                alert('Call failed to start: ' + (e as Error).message)
            }
        }

        initCall()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, localStream, isCallSetup, user])  // Added user to wait for auth


    // -- Actions --
    const handleLogin = async (email: string, pass: string) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            })
            if (!res.ok) throw new Error('Login failed')
            const data = await res.json()
            login(email, data.token)
            window.location.replace(import.meta.env.BASE_URL)
        } catch (e) {
            console.error('[Login] Failed:', e)
            throw e as Error
        }
    }

    const handleLogout = () => {
        logout()
        window.location.replace(import.meta.env.BASE_URL + 'login')
    }

    const handleStartCall = (target: string) => {
        sessionStorage.setItem('call_target', target)
        sessionStorage.setItem('call_initiator', 'true')
        window.location.href = import.meta.env.BASE_URL + 'call'
    }

    const handleAcceptCall = () => {
        if (!incomingCall) return
        sessionStorage.setItem('call_target', incomingCall.sender)
        sessionStorage.setItem('call_initiator', 'false')
        sessionStorage.setItem('call_offer', JSON.stringify(incomingCall.data))
        window.location.href = import.meta.env.BASE_URL + 'call'
    }

    const handleRejectCall = () => {
        if (!incomingCall) return
        sendSignal(incomingCall.sender, 'REJECT', '{}')
        setIncomingCall(null)
    }

    // Wrap start/accept to set target
    const startCallWrapped = (t: string) => {
        handleStartCall(t)
    }
    const acceptCallWrapped = () => {
        handleAcceptCall()
    }

    const sendChatWrapped = (text: string) => {
        if (!callTarget) return
        sendSignal(callTarget, 'CHAT', text)
        addMessage('ME', text)
    }

    const hangupWrapped = () => {
        if (callTarget) {
            webrtcHangup(callTarget)
        } else {
            webrtcHangup()
        }
    }

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
                <div className="text-xl font-semibold animate-pulse">Loading Application...</div>
            </div>
        )
    }

    return (
        <>
            <Routes>
                <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />} />
                <Route path="/register" element={<RegisterPage />} />

                <Route path="/" element={
                    user ? (
                        <UserListPage
                            email={user.email}
                            users={userList}
                            onLogout={handleLogout}
                            onCall={startCallWrapped}
                            incomingCall={incomingCall}
                            onAcceptCall={acceptCallWrapped}
                            onRejectCall={handleRejectCall}
                            onHistory={() => navigate('/history')}
                        />
                    ) : <RedirectToLogin />
                } />

                <Route path="/history" element={
                    user ? (
                        <ChatHistoryPage
                            email={user.email}
                            token={user.token}
                            onBack={() => navigate('/')}
                            onLogout={handleLogout}
                        />
                    ) : <RedirectToLogin />
                } />

                <Route path="/call" element={
                    user ? (
                        <CallPage
                            targetId={callTarget}
                            email={user.email}
                            localStream={localStream}
                            remoteStream={remoteStream}
                            onHangup={hangupWrapped}
                            isScreenSharing={isScreenSharing}
                            onToggleScreenShare={toggleScreenShare}
                            chatMessages={messages}
                            onSendChat={sendChatWrapped}
                        />
                    ) : <Navigate to="/login" replace />
                } />
            </Routes>

            {/* SSE/WebRTC Debug Log Panel - shown when logged in */}
            {user && (
                <SseLogPanel
                    logs={debugLogs}
                    isOpen={isLogPanelOpen}
                    onToggle={() => setIsLogPanelOpen(prev => !prev)}
                    onClear={clearDebugLogs}
                />
            )}
        </>
    )
}

export default App
