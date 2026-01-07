import { useState, useEffect, useRef } from 'react'
import './App.css'

const DebugOverlay = ({ className, debugLogs, setDebugLogs, debugEndRef, setShowDebug }) => (
  <div className={`debug-panel ${className}`}>
    <div className="debug-header">
      <span>Raw Data Logs</span>
      <div style={{ display: 'flex', gap: '5px' }}>
        <button onClick={() => setDebugLogs([])}>Clear</button>
        <button onClick={() => setShowDebug(false)}>Close</button>
      </div>
    </div>
    <div className="debug-content">
      {debugLogs.map((log, i) => (
        <div key={i} className="debug-line">{log}</div>
      ))}
      <div ref={debugEndRef} />
    </div>
  </div>
)

const DebugToggle = ({ showDebug, setShowDebug, className = '' }) => (
  <button className={`debug-toggle-btn ${className}`} onClick={() => setShowDebug(!showDebug)}>
    {showDebug ? 'Hide Logs' : 'Show Raw Data'}
  </button>
)

const ToastOverlay = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map(t => (
      <div key={t.id} className="toast">
        <span>🔔</span> {t.msg}
      </div>
    ))}
  </div>
)

function App() {
  // --- View State ---
  const [view, setView] = useState('LOGIN') // 'LOGIN', 'LIST', 'CALL'

  // --- Data State ---
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [targetId, setTargetId] = useState('')
  const [userList, setUserList] = useState([])
  const [filterText, setFilterText] = useState('')
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  // --- Layout State (Chat) ---
  const [chatMode, setChatMode] = useState('FLOATING') // 'FLOATING' | 'DOCKED_RIGHT'
  const [chatRect, setChatRect] = useState({ x: 20, y: 100, width: 300, height: 400 }) // Floating
  const [dockedWidth, setDockedWidth] = useState(window.innerWidth * 0.3) // Docked width (30%)
  const draggingRef = useRef(null) // 'MOVE' | 'RESIZE_SE' | 'RESIZE_W' | null
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  // --- Chat State ---
  const [chatMessages, setChatMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')

  // --- Debug State ---
  const [showDebug, setShowDebug] = useState(false)
  const [debugLogs, setDebugLogs] = useState([])

  const addDebugLog = (type, content) => {
    const time = new Date().toLocaleTimeString()
    setDebugLogs(prev => [...prev, `[${time}] ${type}: ${content}`])
  }

  // --- Toast State ---
  const [toasts, setToasts] = useState([])

  const addToast = (msg) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  // --- Refs ---
  const eventSourceRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const chatEndRef = useRef(null)
  const debugEndRef = useRef(null)

  const tokenRef = useRef('')
  const handleSignalRef = useRef(null)

  // --- Connection State ---
  const initializingRef = useRef(null)
  const pendingCandidates = useRef([])

  const log = (msg) => {
    // System messages to chat
    // addChatMessage('SYSTEM', msg)
    console.log(msg)
  }

  const addChatMessage = (sender, text) => {
    setChatMessages(prev => [...prev, { sender, text, time: new Date().toLocaleTimeString() }])
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    debugEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [debugLogs])

  useEffect(() => {
    if (view === 'CALL') {
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }
      if (remoteVideoRef.current && remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current
      }
    }
  }, [view])

  // --- Drag & Resize Handlers ---
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingRef.current) return

      if (draggingRef.current === 'MOVE') {
        setChatRect(prev => ({
          ...prev,
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y
        }))
      } else if (draggingRef.current === 'RESIZE_SE') {
        // Floating resize (Bottom-Right)
        setChatRect(prev => ({
          ...prev,
          width: Math.max(200, e.clientX - prev.x),
          height: Math.max(150, e.clientY - prev.y)
        }))
      } else if (draggingRef.current === 'RESIZE_W') {
        const newWidth = document.body.clientWidth - e.clientX
        setDockedWidth(Math.max(150, Math.min(newWidth, 800)))
      }
    }

    const handleMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = null
        // Reset body cursor
        document.body.style.cursor = 'default'
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const startDrag = (e, type) => {
    e.preventDefault()
    draggingRef.current = type
    if (type === 'MOVE') {
      dragOffsetRef.current = {
        x: e.clientX - chatRect.x,
        y: e.clientY - chatRect.y
      }
      document.body.style.cursor = 'move'
    } else if (type === 'RESIZE_SE') {
      document.body.style.cursor = 'nwse-resize'
    } else if (type === 'RESIZE_W') {
      document.body.style.cursor = 'ew-resize'
    }
  }

  // --- Auto-Login (Restore Session) ---
  useEffect(() => {
    const storedUserId = sessionStorage.getItem('userId')
    const storedToken = sessionStorage.getItem('token')

    if (storedUserId && storedToken) {
      setUserId(storedUserId)
      setToken(storedToken)
      tokenRef.current = storedToken
      connectToSSE(storedToken, storedUserId)
    }
  }, [])


  // --- 1. SSE Connection & Login ---
  const connectToSSE = (authToken, myId) => {
    if (eventSourceRef.current) eventSourceRef.current.close()

    const es = new EventSource(`http://localhost:8080/sse/subscribe?token=${authToken}`)

    es.addEventListener('connect', (e) => {
      addDebugLog('SSE IN (connect)', e.data)
      setView('LIST')
    })

    es.addEventListener('user_list', (e) => {
      addDebugLog('SSE IN (user_list)', e.data)
      const users = JSON.parse(e.data)
      setUserList(users.filter(u => u !== myId))
    })

    es.addEventListener('signal', async (e) => {
      addDebugLog('SSE IN', e.data)
      const payload = JSON.parse(e.data)
      handleSignalRef.current?.(payload)
    })

    es.onerror = (err) => {
      console.error(err)
      // Optional: If error persists (e.g. 401), we might want to clear session
      // For now, let's just log it. If the token is invalid, the connection won't open.
    }

    eventSourceRef.current = es
  }

  const handleLogin = async () => {
    if (!userId || !password) return

    try {
      const res = await fetch('http://localhost:8080/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password })
      })

      if (!res.ok) {
        alert('Login failed')
        return
      }

      const data = await res.json()
      setToken(data.token)
      tokenRef.current = data.token

      // Save session
      sessionStorage.setItem('userId', userId)
      sessionStorage.setItem('token', data.token)

      connectToSSE(data.token, userId)

    } catch (e) {
      console.error(e)
      alert('Login Error')
    }
  }

  // --- 2. WebRTC Logic ---
  const createPeerConnection = async (senderId) => {
    if (peerConnectionRef.current) return peerConnectionRef.current
    if (initializingRef.current) return initializingRef.current

    const initPromise = (async () => {
      // Add STUN server for better connectivity
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      })

      pc.oniceconnectionstatechange = () => {
        addDebugLog('ICE STATE', pc.iceConnectionState)
      }

      pc.onsignalingstatechange = () => {
        addDebugLog('SIGNAL STATE', pc.signalingState)
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(targetId || senderId, 'CANDIDATE', JSON.stringify(event.candidate))
        }
      }

      pc.ontrack = (event) => {
        addDebugLog('TRACK', `Kind: ${event.track.kind}, Streams: ${event.streams.length}`)
        remoteStreamRef.current = event.streams[0]
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
          // Explicitly try to play
          remoteVideoRef.current.play().catch(e => {
            console.error('Remote video play error', e)
            addDebugLog('PLAY ERROR', e.message)
          })
        }
      }

      if (!localStreamRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          localStreamRef.current = stream
          if (localVideoRef.current) localVideoRef.current.srcObject = stream
          cameraStreamRef.current = stream
          stream.getTracks().forEach(track => pc.addTrack(track, stream))
        } catch (e) {
          console.error('Error accessing media: ' + e.message)
          addDebugLog('MEDIA ERROR', e.message)
        }
      } else {
        localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current))
      }

      peerConnectionRef.current = pc
      initializingRef.current = null
      return pc
    })()

    initializingRef.current = initPromise
    return initPromise
  }

  const [incomingCall, setIncomingCall] = useState(null)

  const handleSignal = async (payload) => {
    const { sender, type, data } = payload

    if (type === 'CHAT') {
      addChatMessage(sender, data)
      return
    }

    if (type === 'HANGUP') {
      if (incomingCall) addToast(`${sender} canceled the call.`)
      else if (view === 'CALL') addToast(`${sender} ended the call.`)
      handleHangup(false)
      return
    }

    if (type === 'BUSY') {
      addToast(`${sender} is busy.`)
      handleHangup(false)
      return
    }

    if (type === 'REJECT') {
      addToast(`${sender} rejected the call.`)
      handleHangup(false)
      return
    }

    if (type === 'OFFER') {
      if (view === 'CALL' || incomingCall) {
        sendSignal(sender, 'BUSY', '{}')
        return
      }
      setIncomingCall({ sender, data })
      return
    }

    const pc = await createPeerConnection(sender)

    if (type === 'ANSWER') {
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data)))
    } else if (type === 'CANDIDATE') {
      const candidate = JSON.parse(data)
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } else {
        pendingCandidates.current.push(candidate)
      }
    }
  }


  // Update ref on every render to ensure SSE listener uses fresh state
  handleSignalRef.current = handleSignal

  const acceptCall = async () => {
    if (!incomingCall) return
    const { sender, data } = incomingCall
    setTargetId(sender)
    setView('CALL')
    setChatMessages([])
    setIncomingCall(null)

    const pc = await createPeerConnection(sender)
    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data)))

    // Process any queued candidates
    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift()
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    }

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    sendSignal(sender, 'ANSWER', JSON.stringify(answer))
  }

  const rejectCall = () => {
    if (!incomingCall) return
    sendSignal(incomingCall.sender, 'REJECT', '{}')
    setIncomingCall(null)
  }

  const sendSignal = async (target, type, data) => {
    if (!target) return
    const payload = { sender: userId, target, type, data }
    addDebugLog('SSE OUT', JSON.stringify(payload))
    try {
      await fetch('http://localhost:8080/sse/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenRef.current}` // Use tokenRef
        },
        body: JSON.stringify(payload)
      })
    } catch (e) { console.error(e) }
  }

  const stopScreenShare = async () => {
    const cameraStream = cameraStreamRef.current
    if (!cameraStream) {
      console.error("No camera stream found to revert to")
      setIsScreenSharing(false)
      return
    }

    // Replace video track in PC if active
    if (peerConnectionRef.current) {
      const videoTrack = cameraStream.getVideoTracks()[0]
      const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video')
      if (sender) {
        try {
          await sender.replaceTrack(videoTrack)
        } catch (e) {
          console.error("Error replacing track:", e)
        }
      }
    }

    // Stop the screen share stream (which is effectively localStreamRef.current before we swap it back)
    if (localStreamRef.current && localStreamRef.current.id !== cameraStream.id) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
    }

    // Update local view
    localStreamRef.current = cameraStream
    if (localVideoRef.current) localVideoRef.current.srcObject = cameraStream
    setIsScreenSharing(false)
  }

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getVideoTracks()[0]

      // Handle "Stop sharing" from browser UI (e.g. Chrome floating bar)
      screenTrack.onended = () => {
        stopScreenShare()
      }

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video')
        if (sender) {
          await sender.replaceTrack(screenTrack)
        }
      }

      localStreamRef.current = screenStream
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
      setIsScreenSharing(true)
    } catch (e) {
      console.error("Screen share error:", e)
      // If cancelled or error, ensure state is correct
      setIsScreenSharing(false)
    }
  }

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare()
    } else {
      startScreenShare()
    }
  }

  // --- Actions ---
  const startCall = async (target) => {
    if (!target) return
    setTargetId(target)
    setView('CALL')
    setChatMessages([])

    const pc = await createPeerConnection(target)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    sendSignal(target, 'OFFER', JSON.stringify(offer))
  }

  const handleHangup = (shouldSendSignal = true) => {
    if (shouldSendSignal && targetId) sendSignal(targetId, 'HANGUP', '{}')

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop())
      cameraStreamRef.current = null
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null

    setTargetId('')
    setIncomingCall(null)
    setView('LIST')
  }

  const sendChatMessage = () => {
    if (!msgInput.trim() || !targetId) return
    sendSignal(targetId, 'CHAT', msgInput)
    addChatMessage('ME', msgInput)
    setMsgInput('')
  }

  const handleLogout = () => {
    // 0. Notify server (optional but good for cleanup)
    if (tokenRef.current) {
      fetch('http://localhost:8080/sse/logout', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokenRef.current}`
        }
      }).catch(console.error)
    }

    // Clear session
    sessionStorage.removeItem('userId')
    sessionStorage.removeItem('token')

    // 1. Close connections
    if (eventSourceRef.current) eventSourceRef.current.close()
    if (peerConnectionRef.current) peerConnectionRef.current.close()

    // 2. Clear refs
    eventSourceRef.current = null
    peerConnectionRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    remoteStreamRef.current = null

    // 3. Clear state
    setUserId('')
    setPassword('')
    setToken('')
    setTargetId('')
    setUserList([])
    setChatMessages([])
    setDebugLogs([])
    setView('LOGIN')
    setIsScreenSharing(false)
  }

  // --- Render Views ---
  const filteredUsers = userList.filter(u => u.toLowerCase().includes(filterText.toLowerCase()))

  // Reusable Header Component
  const Header = ({ title, thin }) => (
    <header className={`app-header ${thin ? 'header-thin' : ''}`}>
      <div style={{ fontWeight: 'bold' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="user-info">{userId}</span>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  )

  // 1. LOGIN
  if (view === 'LOGIN') {
    return (
      <div className="container center-view">
        <h1>Spring WebRTC</h1>
        <p className="login-date">{new Date().toLocaleDateString()}</p>
        <div className="login-box">
          <input
            type="text"
            placeholder="Enter User ID..."
            value={userId}
            onChange={e => setUserId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <input
            type="password"
            placeholder="Enter Password..."
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin}>Login</button>

        </div>
        <ToastOverlay toasts={toasts} />
      </div>
    )
  }

  // 2. LIST (Contacts)
  if (view === 'LIST') {
    return (
      <div className="container app-view">
        <Header title="Contacts" />
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search friends..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>
        <div className="user-list-scroll">
          {filteredUsers.length === 0 ? <p style={{ marginTop: 20, color: '#999' }}>No visible users</p> : (
            filteredUsers.map(u => (
              <div key={u} className="user-card">
                <div className="avatar">{u.substring(0, 2).toUpperCase()}</div>
                <div className="user-name">{u}</div>
                <button className="call-btn-text" onClick={() => startCall(u)}>
                  화상채팅
                </button>
              </div>
            ))
          )}
        </div>
        {incomingCall && (
          <div className="incoming-call-modal">
            <div className="modal-content">
              <h3>Incoming Call</h3>
              <p><strong>{incomingCall.sender}</strong> is calling you...</p>
              <div className="modal-actions">
                <button className="accept-btn" onClick={acceptCall}>Accept</button>
                <button className="reject-btn" onClick={rejectCall}>Reject</button>
              </div>
            </div>
          </div>
        )}
        {showDebug && <DebugOverlay className="list-mode" debugLogs={debugLogs} setDebugLogs={setDebugLogs} debugEndRef={debugEndRef} setShowDebug={setShowDebug} />}
        <DebugToggle showDebug={showDebug} setShowDebug={setShowDebug} />
        <ToastOverlay toasts={toasts} />
      </div>
    )
  }

  // 3. CALL
  if (view === 'CALL') {
    return (
      <div className="container call-view">
        <Header title="Spring WebRTC" thin />

        <div className="call-main-layout">
          <div className="video-area">
            <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
            <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
            <div className="call-overlay">
              <span className="call-status">On call with {targetId}</span>
              <button className={`screen-share-fab ${isScreenSharing ? 'active' : ''}`} onClick={toggleScreenShare}>
                {isScreenSharing ? 'Stop Share' : 'Screen Share'}
              </button>
              <button className="hangup-fab" onClick={() => handleHangup(true)}>End Call</button>
            </div>
          </div>

          {/* Chat Component - Shared logic for content, different shells based on mode */}
          <div
            className={`chat-area ${chatMode === 'FLOATING' ? 'chat-floating' : 'chat-docked-right'}`}
            style={chatMode === 'FLOATING' ? {
              left: chatRect.x,
              top: chatRect.y,
              width: chatRect.width,
              height: chatRect.height
            } : {
              width: dockedWidth
            }}
          >
            <div
              className="chat-header-drag"
              onMouseDown={chatMode === 'FLOATING' ? e => startDrag(e, 'MOVE') : undefined}
              style={{ cursor: chatMode === 'FLOATING' ? 'move' : 'default' }}
            >
              <span>💬 Chat</span>
              <button
                className="dock-toggle-btn"
                onClick={() => setChatMode(prev => prev === 'FLOATING' ? 'DOCKED_RIGHT' : 'FLOATING')}
                title="Toggle Mode"
              >
                {chatMode === 'FLOATING' ? 'Dock' : 'Float'}
              </button>
            </div>
            <div className="messages-list">
              {chatMessages.map((m, i) => (
                <div key={i} className={`message ${m.sender === 'ME' ? 'my-msg' : 'peer-msg'}`}>
                  <span className="msg-text">{m.text}</span>
                  <span className="msg-time">{m.time}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-bar">
              <input
                type="text"
                placeholder="Message..."
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
              />
              <button onClick={sendChatMessage}>Send</button>
            </div>
            {chatMode === 'FLOATING' && (
              <div className="resize-handle-corner" onMouseDown={e => startDrag(e, 'RESIZE_SE')} />
            )}
            {chatMode === 'DOCKED_RIGHT' && (
              <div className="resize-handle-left" onMouseDown={e => startDrag(e, 'RESIZE_W')} />
            )}
          </div>
        </div>

        {showDebug && (
          <DebugOverlay className="bottom-docked" debugLogs={debugLogs} setDebugLogs={setDebugLogs} debugEndRef={debugEndRef} setShowDebug={setShowDebug} />
        )}

        <DebugToggle showDebug={showDebug} setShowDebug={setShowDebug} className="call-toggle" />
        <ToastOverlay toasts={toasts} />
      </div>
    )
  }

  return <div>Loading...</div>
}

export default App
