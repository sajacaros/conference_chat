import { useRef, useState, useCallback } from 'react'

interface UseWebRTCProps {
    onLocalStream?: (stream: MediaStream) => void
    onRemoteStream?: (stream: MediaStream) => void
    sendSignal: (target: string, type: string, data: any) => Promise<void>
    onDebug?: (type: string, msg: string) => void
    onHangup?: () => void
}

export function useWebRTC({ onLocalStream, onRemoteStream, sendSignal, onDebug, onHangup }: UseWebRTCProps) {
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
    const localStreamRef = useRef<MediaStream | null>(null)
    const remoteStreamRef = useRef<MediaStream | null>(null)
    const cameraStreamRef = useRef<MediaStream | null>(null)

    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const pendingCandidates = useRef<RTCIceCandidateInit[]>([])
    const initializingRef = useRef<Promise<RTCPeerConnection> | null>(null)

    // Helper: Setup PC event handlers
    const setupPeerConnectionHandlers = useCallback((pc: RTCPeerConnection, targetId: string) => {
        pc.oniceconnectionstatechange = () => {
            onDebug?.('ICE STATE', pc.iceConnectionState)
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                console.warn('[WebRTC] ICE connection state:', pc.iceConnectionState)
            }
        }
        pc.onsignalingstatechange = () => {
            onDebug?.('SIGNAL STATE', pc.signalingState)
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal(targetId, 'CANDIDATE', JSON.stringify(event.candidate))
            }
        }

        pc.ontrack = (event) => {
            console.log('[WebRTC] ontrack fired:', {
                kind: event.track.kind,
                trackId: event.track.id,
                readyState: event.track.readyState,
                enabled: event.track.enabled,
                hasStreams: event.streams?.length > 0
            })
            onDebug?.('TRACK', `Kind: ${event.track.kind}`)

            let stream: MediaStream
            if (event.streams && event.streams[0]) {
                console.log('[WebRTC] Using stream from event:', event.streams[0].id)
                stream = event.streams[0]
            } else {
                console.log('[WebRTC] Creating/reusing MediaStream for track')
                // No stream provided, create or reuse one
                if (!remoteStreamRef.current) {
                    remoteStreamRef.current = new MediaStream()
                    console.log('[WebRTC] Created new MediaStream:', remoteStreamRef.current.id)
                }
                remoteStreamRef.current.addTrack(event.track)
                stream = remoteStreamRef.current
            }

            console.log('[WebRTC] Setting remote stream:', {
                streamId: stream.id,
                audioTracks: stream.getAudioTracks().length,
                videoTracks: stream.getVideoTracks().length
            })

            remoteStreamRef.current = stream
            onRemoteStream?.(stream)
        }
    }, [sendSignal, onDebug, onRemoteStream])

    // Helper: Get or create local media stream
    const getLocalStream = useCallback(async () => {
        if (localStreamRef.current) {
            return localStreamRef.current
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        localStreamRef.current = stream
        cameraStreamRef.current = stream
        onLocalStream?.(stream)
        return stream
    }, [onLocalStream])

    // Helper: Add tracks to PC in consistent order
    const addTracksToPC = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
        const audioTrack = stream.getAudioTracks()[0]
        const videoTrack = stream.getVideoTracks()[0]

        if (audioTrack) pc.addTrack(audioTrack, stream)
        if (videoTrack) pc.addTrack(videoTrack, stream)
    }, [])

    // Initialize PC (for use by handleWebRTCSignal)
    const createPeerConnection = useCallback(async (targetId: string) => {
        if (peerConnectionRef.current) {
            return peerConnectionRef.current
        }
        if (initializingRef.current) {
            return initializingRef.current
        }

        initializingRef.current = (async () => {
            onDebug?.('WebRTC', 'Creating PeerConnection')
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            })

            setupPeerConnectionHandlers(pc, targetId)

            try {
                const stream = await getLocalStream()
                addTracksToPC(pc, stream)
            } catch (e: any) {
                console.error("[WebRTC] Failed to get media:", e)
                onDebug?.('MEDIA ERROR', e.message)
                pc.close()
                throw e
            }

            peerConnectionRef.current = pc
            initializingRef.current = null
            return pc
        })()

        return initializingRef.current
    }, [sendSignal, onDebug, setupPeerConnectionHandlers, getLocalStream, addTracksToPC])



    // Process pending candidates once remote desc is set
    const processPendingCandidates = useCallback(async () => {
        const pc = peerConnectionRef.current
        if (!pc) return
        while (pendingCandidates.current.length > 0) {
            const c = pendingCandidates.current.shift()
            if (c) await pc.addIceCandidate(new RTCIceCandidate(c))
        }
    }, [])

    const startCall = useCallback(async (target: string) => {
        // Wait for any pending initialization to complete before cleaning up
        if (initializingRef.current) {
            try {
                const oldPc = await initializingRef.current
                if (oldPc) oldPc.close()
            } catch (e) {
                // Ignore
            }
        }

        // Clean up existing connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }
        initializingRef.current = null

        // Clean up streams
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop())
            localStreamRef.current = null
            cameraStreamRef.current = null
        }
        remoteStreamRef.current = null

        // Create new peer connection
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })

        setupPeerConnectionHandlers(pc, target)

        try {
            const stream = await getLocalStream()
            addTracksToPC(pc, stream)
            peerConnectionRef.current = pc

            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            console.log('[useWebRTC] Sending OFFER to:', target, offer)
            sendSignal(target, 'OFFER', JSON.stringify(offer))
        } catch (e) {
            console.error('[WebRTC] Failed to start call:', e)
            pc.close()
            peerConnectionRef.current = null
            throw e
        }
    }, [setupPeerConnectionHandlers, getLocalStream, addTracksToPC, sendSignal])

    const acceptCall = useCallback(async (sender: string, offerData: string) => {
        // Wait for any pending initialization to complete before cleaning up
        if (initializingRef.current) {
            try {
                const oldPc = await initializingRef.current
                if (oldPc) oldPc.close()
            } catch (e) {
                // Ignore
            }
        }

        // Clean up existing connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }
        initializingRef.current = null

        // Clean up streams
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop())
            localStreamRef.current = null
            cameraStreamRef.current = null
        }
        remoteStreamRef.current = null

        // Create new peer connection
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })

        setupPeerConnectionHandlers(pc, sender)

        try {
            const stream = await getLocalStream()
            addTracksToPC(pc, stream)
            peerConnectionRef.current = pc

            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerData)))
            await processPendingCandidates()

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            sendSignal(sender, 'ANSWER', JSON.stringify(answer))
        } catch (e) {
            console.error('[WebRTC] Failed to accept call:', e)
            pc.close()
            peerConnectionRef.current = null
            throw e
        }
    }, [setupPeerConnectionHandlers, getLocalStream, addTracksToPC, processPendingCandidates, sendSignal])

    const hangup = useCallback((targetId?: string) => {
        if (targetId) sendSignal(targetId, 'HANGUP', '{}')

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }
        initializingRef.current = null

        // Clean up screen share track's onended handler before stopping
        if (localStreamRef.current && isScreenSharing) {
            const screenTrack = localStreamRef.current.getVideoTracks()[0]
            if (screenTrack) {
                screenTrack.onended = null
            }
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop())
        }
        localStreamRef.current = null
        cameraStreamRef.current = null
        remoteStreamRef.current = null
        setIsScreenSharing(false)

        onHangup?.()
    }, [sendSignal, onHangup, isScreenSharing])

    const toggleScreenShare = useCallback(async () => {
        const pc = peerConnectionRef.current
        if (!pc) return

        if (isScreenSharing) {
            // Stop
            const camera = cameraStreamRef.current
            if (camera) {
                const videoTrack = camera.getVideoTracks()[0]
                const sender = pc.getSenders().find(s => s.track?.kind === 'video')
                if (sender) sender.replaceTrack(videoTrack)

                localStreamRef.current = camera
                onLocalStream?.(camera)
            }
            setIsScreenSharing(false)
        } else {
            // Start
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
                const screenTrack = stream.getVideoTracks()[0]

                screenTrack.onended = () => {
                    toggleScreenShare() // revert
                }

                const sender = pc.getSenders().find(s => s.track?.kind === 'video')
                if (sender) sender.replaceTrack(screenTrack)

                localStreamRef.current = stream
                onLocalStream?.(stream)
                setIsScreenSharing(true)
            } catch (e) {
                console.error("Screen share failed", e)
            }
        }
    }, [isScreenSharing, onLocalStream])

    const handleWebRTCSignal = useCallback(async (sender: string, type: string, data: string) => {
        console.log('[WebRTC] handleWebRTCSignal:', { sender, type })

        if (type === 'REJECT' || type === 'HANGUP' || type === 'BUSY') {
            hangup()
            return
        }

        if (type === 'OFFER') {
            // handled mainly by caller to accept
            return
        }

        const pc = peerConnectionRef.current
        if (!pc) {
            console.error('[WebRTC] No peer connection available for signal:', type)
            return
        }

        if (type === 'ANSWER') {
            console.log('[WebRTC] Processing ANSWER')
            const desc = new RTCSessionDescription(JSON.parse(data))
            await pc.setRemoteDescription(desc)
            console.log('[WebRTC] Remote description set, processing pending candidates')
            await processPendingCandidates()
        } else if (type === 'CANDIDATE') {
            const candidate = JSON.parse(data)
            console.log('[WebRTC] Processing CANDIDATE:', { hasRemoteDesc: !!pc.remoteDescription })
            if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate))
                console.log('[WebRTC] ICE candidate added')
            } else {
                pendingCandidates.current.push(candidate)
                console.log('[WebRTC] ICE candidate queued, pending count:', pendingCandidates.current.length)
            }
        }
    }, [hangup, processPendingCandidates])

    return {
        startCall,
        acceptCall,
        hangup,
        handleWebRTCSignal,
        toggleScreenShare,
        isScreenSharing,
        localStreamRef,
        remoteStreamRef
    }
}
