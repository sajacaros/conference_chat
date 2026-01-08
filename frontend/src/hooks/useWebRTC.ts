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

    // Initialize PC
    const createPeerConnection = useCallback(async (targetId: string) => {
        if (peerConnectionRef.current) return peerConnectionRef.current
        if (initializingRef.current) return initializingRef.current

        initializingRef.current = (async () => {
            onDebug?.('WebRTC', 'Creating PeerConnection')
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            })

            pc.oniceconnectionstatechange = () => onDebug?.('ICE STATE', pc.iceConnectionState)
            pc.onsignalingstatechange = () => onDebug?.('SIGNAL STATE', pc.signalingState)

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    sendSignal(targetId, 'CANDIDATE', JSON.stringify(event.candidate))
                }
            }

            pc.ontrack = (event) => {
                onDebug?.('TRACK', `Kind: ${event.track.kind}`)
                remoteStreamRef.current = event.streams[0]
                onRemoteStream?.(event.streams[0])
            }

            // Add Local Stream
            if (!localStreamRef.current) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    localStreamRef.current = stream
                    cameraStreamRef.current = stream
                    onLocalStream?.(stream)
                    stream.getTracks().forEach(t => pc.addTrack(t, stream))
                } catch (e: any) {
                    console.error("Media Error", e)
                    onDebug?.('MEDIA ERROR', e.message)
                    // Rethrow so startCall knows it failed
                    throw e
                }
            } else {
                localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))
            }

            peerConnectionRef.current = pc
            initializingRef.current = null
            return pc
        })()

        return initializingRef.current
    }, [sendSignal, onDebug, onLocalStream, onRemoteStream])



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
        // Ensure fresh start for new calls
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }

        const pc = await createPeerConnection(target)

        // Add transceivers manually if needed to ensure order, but usually just ensuring fresh PC is enough.
        // pc.addTransceiver('audio', { direction: 'sendrecv' })
        // pc.addTransceiver('video', { direction: 'sendrecv' })

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendSignal(target, 'OFFER', JSON.stringify(offer))
    }, [createPeerConnection, sendSignal])

    const acceptCall = useCallback(async (sender: string, offerData: string) => {
        const pc = await createPeerConnection(sender)
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerData)))
        await processPendingCandidates()

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sendSignal(sender, 'ANSWER', JSON.stringify(answer))
    }, [createPeerConnection, processPendingCandidates, sendSignal])

    const hangup = useCallback((targetId?: string) => {
        if (targetId) sendSignal(targetId, 'HANGUP', '{}')

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }

        localStreamRef.current?.getTracks().forEach(t => t.stop())
        localStreamRef.current = null
        cameraStreamRef.current = null

        onHangup?.()
    }, [sendSignal, onHangup])

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
        if (type === 'REJECT' || type === 'HANGUP' || type === 'BUSY') {
            hangup()
            return
        }

        if (type === 'OFFER') {
            // handled mainly by caller to accept
            return
        }

        const pc = await createPeerConnection(sender)

        if (type === 'ANSWER') {
            const desc = new RTCSessionDescription(JSON.parse(data))
            await pc.setRemoteDescription(desc)
        } else if (type === 'CANDIDATE') {
            const candidate = JSON.parse(data)
            if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } else {
                pendingCandidates.current.push(candidate)
            }
        }
    }, [createPeerConnection, hangup])

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
