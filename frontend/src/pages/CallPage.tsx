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
    const [chatSize, setChatSize] = useState({ width: 320, height: 384 }) // Initial: w-80 (320px), h-96 (384px)
    const isDraggingRef = useRef(false)
    const isResizingRef = useRef(false)
    const resizeDirectionRef = useRef<string | null>(null)
    const dragOffsetRef = useRef({ x: 0, y: 0 })
    const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

    // Min/max size constraints
    const MIN_WIDTH = 280
    const MIN_HEIGHT = 300
    const MAX_WIDTH = 600
    const MAX_HEIGHT = 700

    const handleMouseDown = (e: React.MouseEvent) => {
        if (chatMode !== 'FLOATING') return
        isDraggingRef.current = true
        dragOffsetRef.current = {
            x: e.clientX - chatPosition.x,
            y: e.clientY - chatPosition.y
        }
    }

    const handleResizeStart = (e: React.MouseEvent, direction: string) => {
        e.preventDefault()
        e.stopPropagation()
        isResizingRef.current = true
        resizeDirectionRef.current = direction
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: chatSize.width,
            height: chatSize.height
        }
    }

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDraggingRef.current) {
            setChatPosition({
                x: e.clientX - dragOffsetRef.current.x,
                y: e.clientY - dragOffsetRef.current.y
            })
        } else if (isResizingRef.current) {
            const deltaX = e.clientX - resizeStartRef.current.x
            const deltaY = e.clientY - resizeStartRef.current.y
            const direction = resizeDirectionRef.current

            let newWidth = resizeStartRef.current.width
            let newHeight = resizeStartRef.current.height

            if (direction?.includes('e')) {
                newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartRef.current.width + deltaX))
            }
            if (direction?.includes('w')) {
                newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartRef.current.width - deltaX))
                if (newWidth !== chatSize.width) {
                    setChatPosition(prev => ({
                        ...prev,
                        x: resizeStartRef.current.x - (newWidth - resizeStartRef.current.width) + (e.clientX - resizeStartRef.current.x)
                    }))
                }
            }
            if (direction?.includes('s')) {
                newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStartRef.current.height + deltaY))
            }
            if (direction?.includes('n')) {
                newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStartRef.current.height - deltaY))
                if (newHeight !== chatSize.height) {
                    setChatPosition(prev => ({
                        ...prev,
                        y: resizeStartRef.current.y - (newHeight - resizeStartRef.current.height) + (e.clientY - resizeStartRef.current.y)
                    }))
                }
            }

            setChatSize({ width: newWidth, height: newHeight })
        }
    }, [chatSize.width, chatSize.height])

    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false
        isResizingRef.current = false
        resizeDirectionRef.current = null
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
        console.log('[CallPage] remoteStream changed:', {
            hasStream: !!remoteStream,
            hasVideoRef: !!remoteVideoRef.current,
            audioTracks: remoteStream?.getAudioTracks().length || 0,
            videoTracks: remoteStream?.getVideoTracks().length || 0
        })

        if (remoteVideoRef.current && remoteStream) {
            console.log('[CallPage] Setting srcObject on remote video')
            remoteVideoRef.current.srcObject = remoteStream

            // Force play
            remoteVideoRef.current.play().catch(e => {
                console.error('[CallPage] Remote video play error:', e)
            })
        }
    }, [remoteStream])

    return (
        <div className="flex flex-col h-screen bg-black overflow-hidden relative">
            <Header title="Call" email={email} onLogout={onHangup} className="absolute top-0 left-0 right-0 z-10 bg-transparent border-0 bg-gradient-to-b from-black/80 to-transparent pointer-events-none [&>*]:pointer-events-auto" />

            <div className="flex-1 flex relative">
                {/* Video + Controls Column */}
                <div className="flex-1 flex flex-col">
                    {/* Video Area */}
                    <div className="h-[calc(100vh-5rem)] relative bg-gray-900 overflow-hidden flex items-center justify-center">
                        {/* Remote Video - fills available height, width auto-adjusts */}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="h-full w-auto object-contain"
                        />
                        {!remoteStream && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <div className="text-6xl mb-4">📹</div>
                                    <div className="text-lg">Waiting for remote video...</div>
                                </div>
                            </div>
                        )}

                        {/* Local Video (PIP) */}
                        <div className="absolute bottom-4 right-4 w-48 aspect-video bg-black rounded-lg overflow-hidden border border-gray-700 shadow-xl z-20">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                            {!localStream && (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                                    <div className="text-center">
                                        <div className="text-2xl mb-1">📷</div>
                                        <div>No camera</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls Bar */}
                    <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-center gap-4 flex-shrink-0 z-30">
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
                    <div className="w-80 border-l border-gray-800 bg-gray-900 flex-shrink-0 z-20">
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
                    className="absolute z-40 drop-shadow-2xl"
                    style={{
                        left: chatPosition.x,
                        top: chatPosition.y,
                        width: chatSize.width,
                        height: chatSize.height
                    }}
                >
                    <ChatWindow
                        messages={chatMessages}
                        onSend={onSendChat}
                        isFloating={true}
                        onToggleMode={() => setChatMode('DOCKED')}
                        dragHandleProps={{ onMouseDown: handleMouseDown }}
                    />
                    {/* Resize handles */}
                    {/* Edges */}
                    <div
                        className="absolute top-0 left-2 right-2 h-1 cursor-n-resize hover:bg-blue-500/30"
                        onMouseDown={(e) => handleResizeStart(e, 'n')}
                    />
                    <div
                        className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize hover:bg-blue-500/30"
                        onMouseDown={(e) => handleResizeStart(e, 's')}
                    />
                    <div
                        className="absolute left-0 top-2 bottom-2 w-1 cursor-w-resize hover:bg-blue-500/30"
                        onMouseDown={(e) => handleResizeStart(e, 'w')}
                    />
                    <div
                        className="absolute right-0 top-2 bottom-2 w-1 cursor-e-resize hover:bg-blue-500/30"
                        onMouseDown={(e) => handleResizeStart(e, 'e')}
                    />
                    {/* Corners */}
                    <div
                        className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-blue-500/50"
                        onMouseDown={(e) => handleResizeStart(e, 'nw')}
                    />
                    <div
                        className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-blue-500/50"
                        onMouseDown={(e) => handleResizeStart(e, 'ne')}
                    />
                    <div
                        className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-blue-500/50"
                        onMouseDown={(e) => handleResizeStart(e, 'sw')}
                    />
                    <div
                        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-blue-500/50"
                        onMouseDown={(e) => handleResizeStart(e, 'se')}
                    />
                </div>
            )}
        </div>
    )
}
