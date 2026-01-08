import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useSSE } from './hooks/useSSE'
import { useWebRTC } from './hooks/useWebRTC'
import { useChat } from './hooks/useChat'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UserListPage from './pages/UserListPage'
import CallPage from './pages/CallPage'

function RedirectToLogin() {
    console.log('[RedirectToLogin] Render')
    useEffect(() => {
        console.log('[RedirectToLogin] Executing redirect')
        // Using window.location.reload() or hard navigation to clear any router state glitches
        // However, standard SPA navigation should use navigate. 
        // Let's try to slightly delay it to let the render commit.
        const t = setTimeout(() => {
            // window.location.href = '/login' // This is a hard reload
            window.location.replace('/login') // Force browser nav
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

    console.log('[App] Render. User:', JSON.stringify(user?.email), 'Loading:', authLoading, 'Path:', location.pathname)
    const { messages, addMessage, clearMessages } = useChat()
    const [userList, setUserList] = useState<any[]>([])
    const [incomingCall, setIncomingCall] = useState<{ sender: string; data: any } | null>(null)
    const [callTarget, setCallTarget] = useState('')

    // Stream State
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

    const [signalHandler, setSignalHandler] = useState<((sender: string, type: string, data: any) => Promise<void>) | null>(null)

    const handleSSESignal = useCallback((payload: any) => {
        const { sender, type, data } = payload

        if (type === 'CHAT') {
            addMessage(sender, data)
            return
        }

        if (type === 'OFFER') {
            if (location.pathname === '/call') {
                // sendSignal(sender, 'BUSY', {}) // Need access to sendSignal here.
            } else {
                setIncomingCall({ sender, data })
            }
            return
        }

        if (signalHandler) {
            signalHandler(sender, type, data)
        } else {
            if (type === 'HANGUP' || type === 'REJECT') {
                if (incomingCall && incomingCall.sender === sender) {
                    setIncomingCall(null)
                    // alert('Call ended/rejected')
                }
            }
        }

        if (type === 'HANGUP') {
            if (incomingCall && incomingCall.sender === sender) {
                setIncomingCall(null)
            }
        }

    }, [addMessage, location.pathname, incomingCall, signalHandler])

    // -- SSE Handlers --
    const handleSSEConnect = useCallback(() => {
        console.log('Connected to SSE')
    }, [])

    // -- SSE --
    const { connect, disconnect, sendSignal } = useSSE({
        token: user?.token,
        email: user?.email,
        onUserList: setUserList,
        onSignal: handleSSESignal,
        onConnect: handleSSEConnect
    })

    const [isCallInitiator, setIsCallInitiator] = useState(false)
    const [isCallSetup, setIsCallSetup] = useState(false) // Preventing double firing

    // -- Handlers for WebRTC --
    const handleHangup = useCallback(() => {
        // Clear session storage
        sessionStorage.removeItem('call_target')
        sessionStorage.removeItem('call_initiator')
        sessionStorage.removeItem('call_offer')

        // navigate('/') // Navigation issue fix
        window.location.href = '/'

        clearMessages()
        setLocalStream(null)
        setRemoteStream(null)
        setIsCallSetup(false)
        setIncomingCall(null)
    }, [navigate, clearMessages])

    const handleLocalStream = useCallback((s: MediaStream) => setLocalStream(s), [])
    const handleRemoteStream = useCallback((s: MediaStream) => setRemoteStream(s), [])

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
        onRemoteStream: handleRemoteStream
    })

    // Link signal handler
    useEffect(() => {
        setSignalHandler(() => handleWebRTCSignal)
    }, [handleWebRTCSignal])

    // -- Effects --
    useEffect(() => {
        if (user) {
            connect()
        } else {
            disconnect()
        }
    }, [user, connect, disconnect])

    // -- Auto-Start Call Logic --
    useEffect(() => {
        if (location.pathname === '/call') {
            // Prevent multiple initializations
            if (isCallSetup) return

            // Restore from Session Storage if state is missing (e.g. after refresh/hard-nav)
            let target = callTarget
            let initiator = isCallInitiator
            let offerData = null

            if (!target) {
                const sessionTarget = sessionStorage.getItem('call_target')
                const sessionInitiator = sessionStorage.getItem('call_initiator')
                const sessionOffer = sessionStorage.getItem('call_offer')

                if (sessionTarget) {
                    target = sessionTarget
                    setCallTarget(target)
                }
                if (sessionInitiator) {
                    initiator = sessionInitiator === 'true'
                    setIsCallInitiator(initiator)
                }
                if (sessionOffer) {
                    offerData = JSON.parse(sessionOffer)
                }
            }

            console.log('[App] Call Effect Triggered. Role:', initiator ? 'INITIATOR' : 'RECEIVER')

            const initCall = async () => {
                setIsCallSetup(true)
                try {
                    if (initiator) {
                        if (!target) throw new Error('No target')
                        console.log('[App] Starting Call to', target)
                        await webrtcStartCall(target)
                    } else {
                        // Receiver
                        const data = incomingCall?.data || offerData
                        if (data) {
                            console.log('[App] Accepting Call from', target)
                            await webrtcAcceptCall(target, data)
                            setIncomingCall(null)
                        } else {
                            console.warn('[App] No offer data for receiver')
                            // navigate('/') // Optional: Go back if invalid
                        }
                    }
                } catch (e) {
                    console.error('[App] Call Init Failed:', e)
                    // navigate('/')
                    alert('Call failed to start: ' + (e as Error).message)
                }
            }

            // Only run if we don't have streams yet (or assume we need to start)
            if (!localStream) {
                initCall()
            }
        } else {
            // Reset setup flag when leaving
            if (isCallSetup) setIsCallSetup(false)
        }
    }, [location.pathname, isCallInitiator, callTarget, incomingCall, webrtcStartCall, webrtcAcceptCall, isCallSetup, navigate, localStream])


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
            console.log('[App] Login success, data:', data)
            login(email, data.token)
            console.log('[App] Hard Redirect to /')
            window.location.replace('/')
        } catch (e) {
            console.error('[App] Login error:', e)
            throw e as Error
        }
    }

    const handleLogout = () => {
        logout()
        window.location.replace('/login')
    }

    const handleStartCall = (target: string) => {
        console.log('[App] HandleStartCall: Saving to Session & Hard Nav...')
        sessionStorage.setItem('call_target', target)
        sessionStorage.setItem('call_initiator', 'true')
        window.location.href = '/call'
    }

    const handleAcceptCall = () => {
        if (!incomingCall) return
        console.log('[App] HandleAcceptCall: Saving to Session & Hard Nav...')
        sessionStorage.setItem('call_target', incomingCall.sender)
        sessionStorage.setItem('call_initiator', 'false')
        sessionStorage.setItem('call_offer', JSON.stringify(incomingCall.data))
        window.location.href = '/call'
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

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
                <div className="text-xl font-semibold animate-pulse">Loading Application...</div>
            </div>
        )
    }

    return (
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
                        onHangup={webrtcHangup}
                        isScreenSharing={isScreenSharing}
                        onToggleScreenShare={toggleScreenShare}
                        chatMessages={messages}
                        onSendChat={sendChatWrapped}
                    />
                ) : <Navigate to="/login" replace />
            } />
        </Routes>
    )
}

export default App
