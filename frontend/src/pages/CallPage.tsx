import { useRef, useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/ui/Header'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface CallPageProps {
    targetId: string
    email: string
    localStream: MediaStream | null
    remoteStream: MediaStream | null
    onHangup: () => void
    isScreenSharing: boolean
    onToggleScreenShare: () => void
    // Chat props
    chatMessages: Array<{ sender: string; text: string; time: string }>
    onSendChat: (msg: string) => void
}

export default function CallPage({
    targetId,
    email,
    localStream,
    remoteStream,
    onHangup,
    isScreenSharing,
    onToggleScreenShare,
    chatMessages,
    onSendChat
}: CallPageProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)
    const [chatMode, setChatMode] = useState<'FLOATING' | 'DOCKED'>('FLOATING')

    // Drag logic for floating chat
    const [chatPosition, setChatPosition] = useState({ x: 16, y: 80 }) // Initial: left-4 (16px), top-20 (80px)
    const isDraggingRef = useRef(false)
    const dragOffsetRef = useRef({ x: 0, y: 0 })

    const handleMouseDown = (e: React.MouseEvent) => {
        if (chatMode !== 'FLOATING') return
        isDraggingRef.current = true
        dragOffsetRef.current = {
            x: e.clientX - chatPosition.x,
            y: e.clientY - chatPosition.y
        }
    }

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingRef.current) {
            setChatPosition({
                x: e.clientX - dragOffsetRef.current.x,
                y: e.clientY - dragOffsetRef.current.y
            })
        }
    }, [])

    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false
    }, [])

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [handleMouseMove, handleMouseUp])

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [remoteStream])

    return (
        <div className="flex flex-col h-screen bg-black overflow-hidden relative">
            <Header title="Call" email={email} onLogout={onHangup} className="absolute top-0 left-0 right-0 z-10 bg-transparent border-0 bg-gradient-to-b from-black/80 to-transparent pointer-events-none [&>*]:pointer-events-auto" />

            <div className="flex-1 flex relative">
                {/* Video Area */}
                <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
                    {/* Remote Video (Full) */}
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain"
                    />

                    {/* Local Video (PIP) */}
                    <div className="absolute bottom-4 right-4 w-48 aspect-video bg-black rounded-lg overflow-hidden border border-gray-700 shadow-xl z-20">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-30">
                        <Button
                            variant={isScreenSharing ? "default" : "outline"}
                            onClick={onToggleScreenShare}
                            className="rounded-full h-12 px-6"
                        >
                            {isScreenSharing ? "Stop Share" : "Screen Share"}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={onHangup}
                            className="rounded-full h-12 px-6"
                        >
                            End Call
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setChatMode(prev => prev === 'FLOATING' ? 'DOCKED' : 'FLOATING')}
                            className="rounded-full h-12 px-6"
                        >
                            Chat {chatMode === 'DOCKED' ? 'Start Float' : 'Dock'}
                        </Button>
                    </div>
                </div>

                {/* Chat Area - Docked */}
                {chatMode === 'DOCKED' && (
                    <div className="w-80 border-l border-gray-800 bg-gray-900 h-full z-20">
                        <ChatWindow
                            messages={chatMessages}
                            onSend={onSendChat}
                            isFloating={false}
                            onToggleMode={() => setChatMode('FLOATING')}
                            className="h-full rounded-none border-0"
                        />
                    </div>
                )}
            </div>

            {/* Floating Chat */}
            {chatMode === 'FLOATING' && (
                <div
                    className="absolute w-80 h-96 z-40 drop-shadow-2xl"
                    style={{ left: chatPosition.x, top: chatPosition.y }}
                >
                    <ChatWindow
                        messages={chatMessages}
                        onSend={onSendChat}
                        isFloating={true}
                        onToggleMode={() => setChatMode('DOCKED')}
                        dragHandleProps={{ onMouseDown: handleMouseDown }}
                    />
                </div>
            )}
        </div>
    )
}
