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

    // Drag/resize target tracking
    type DragTarget = 'chat' | 'pip' | null
    const dragTargetRef = useRef<DragTarget>(null)
    const resizeTargetRef = useRef<DragTarget>(null)

    // Floating chat state
    const [chatPosition, setChatPosition] = useState({ x: 16, y: 80 })
    const [chatSize, setChatSize] = useState({ width: 320, height: 384 })

    // Local video (PIP) state
    const [pipPosition, setPipPosition] = useState<{ x: number; y: number } | null>(null) // null = use default position
    const [pipSize, setPipSize] = useState({ width: 192, height: 108 }) // Initial: w-48 (192px), aspect-video (16:9)

    // Shared refs
    const dragOffsetRef = useRef({ x: 0, y: 0 })
    const resizeDirectionRef = useRef<string | null>(null)
    const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 })

    // Size constraints
    const CHAT_MIN_WIDTH = 280
    const CHAT_MIN_HEIGHT = 300
    const CHAT_MAX_WIDTH = 600
    const CHAT_MAX_HEIGHT = 700

    const PIP_MIN_WIDTH = 120
    const PIP_MIN_HEIGHT = 68
    const PIP_MAX_WIDTH = 480
    const PIP_MAX_HEIGHT = 270

    // Chat drag handler
    const handleChatMouseDown = (e: React.MouseEvent) => {
        if (chatMode !== 'FLOATING') return
        dragTargetRef.current = 'chat'
        dragOffsetRef.current = {
            x: e.clientX - chatPosition.x,
            y: e.clientY - chatPosition.y
        }
    }

    // PIP drag handler
    const handlePipMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        dragTargetRef.current = 'pip'
        const pipContainer = (e.target as HTMLElement).closest('[data-pip-container]')
        if (pipContainer) {
            const rect = pipContainer.getBoundingClientRect()
            dragOffsetRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            }
            // Initialize pipPosition if it's null (first drag)
            if (pipPosition === null) {
                setPipPosition({ x: rect.left, y: rect.top })
            }
        }
    }

    // Chat resize handler
    const handleChatResizeStart = (e: React.MouseEvent, direction: string) => {
        e.preventDefault()
        e.stopPropagation()
        resizeTargetRef.current = 'chat'
        resizeDirectionRef.current = direction
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: chatSize.width,
            height: chatSize.height,
            posX: chatPosition.x,
            posY: chatPosition.y
        }
    }

    // PIP resize handler
    const handlePipResizeStart = (e: React.MouseEvent, direction: string) => {
        e.preventDefault()
        e.stopPropagation()
        resizeTargetRef.current = 'pip'
        resizeDirectionRef.current = direction
        const pipContainer = (e.target as HTMLElement).closest('[data-pip-container]')
        if (pipContainer) {
            const rect = pipContainer.getBoundingClientRect()
            // Initialize pipPosition if it's null
            if (pipPosition === null) {
                setPipPosition({ x: rect.left, y: rect.top })
            }
            resizeStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                width: pipSize.width,
                height: pipSize.height,
                posX: pipPosition?.x ?? rect.left,
                posY: pipPosition?.y ?? rect.top
            }
        }
    }

    const handleMouseMove = useCallback((e: MouseEvent) => {
        // Handle dragging
        if (dragTargetRef.current === 'chat') {
            setChatPosition({
                x: e.clientX - dragOffsetRef.current.x,
                y: e.clientY - dragOffsetRef.current.y
            })
        } else if (dragTargetRef.current === 'pip') {
            setPipPosition({
                x: e.clientX - dragOffsetRef.current.x,
                y: e.clientY - dragOffsetRef.current.y
            })
        }

        // Handle resizing
        if (resizeTargetRef.current) {
            const deltaX = e.clientX - resizeStartRef.current.x
            const deltaY = e.clientY - resizeStartRef.current.y
            const direction = resizeDirectionRef.current

            const isChat = resizeTargetRef.current === 'chat'
            const minW = isChat ? CHAT_MIN_WIDTH : PIP_MIN_WIDTH
            const minH = isChat ? CHAT_MIN_HEIGHT : PIP_MIN_HEIGHT
            const maxW = isChat ? CHAT_MAX_WIDTH : PIP_MAX_WIDTH
            const maxH = isChat ? CHAT_MAX_HEIGHT : PIP_MAX_HEIGHT
            const setSize = isChat ? setChatSize : setPipSize
            const setPos = isChat ? setChatPosition : setPipPosition

            let newWidth = resizeStartRef.current.width
            let newHeight = resizeStartRef.current.height
            let newX = resizeStartRef.current.posX
            let newY = resizeStartRef.current.posY

            if (direction?.includes('e')) {
                newWidth = Math.min(maxW, Math.max(minW, resizeStartRef.current.width + deltaX))
            }
            if (direction?.includes('w')) {
                const proposedWidth = resizeStartRef.current.width - deltaX
                newWidth = Math.min(maxW, Math.max(minW, proposedWidth))
                const actualDelta = resizeStartRef.current.width - newWidth
                newX = resizeStartRef.current.posX + actualDelta
            }
            if (direction?.includes('s')) {
                newHeight = Math.min(maxH, Math.max(minH, resizeStartRef.current.height + deltaY))
            }
            if (direction?.includes('n')) {
                const proposedHeight = resizeStartRef.current.height - deltaY
                newHeight = Math.min(maxH, Math.max(minH, proposedHeight))
                const actualDelta = resizeStartRef.current.height - newHeight
                newY = resizeStartRef.current.posY + actualDelta
            }

            setSize({ width: newWidth, height: newHeight })
            if (direction?.includes('w') || direction?.includes('n')) {
                setPos({ x: newX, y: newY })
            }
        }
    }, [pipPosition])

    const handleMouseUp = useCallback(() => {
        dragTargetRef.current = null
        resizeTargetRef.current = null
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
                        <div
                            data-pip-container
                            className="absolute bg-black rounded-lg overflow-hidden border border-gray-700 shadow-xl z-20"
                            style={pipPosition
                                ? { left: pipPosition.x, top: pipPosition.y, width: pipSize.width, height: pipSize.height }
                                : { bottom: 16, right: 16, width: pipSize.width, height: pipSize.height }
                            }
                        >
                            {/* Drag handle */}
                            <div
                                className="absolute top-0 left-0 right-0 h-6 cursor-move z-30 bg-gradient-to-b from-black/50 to-transparent"
                                onMouseDown={handlePipMouseDown}
                            />
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
                            {/* Resize handles */}
                            <div
                                className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize hover:bg-blue-500/30"
                                onMouseDown={(e) => handlePipResizeStart(e, 's')}
                            />
                            <div
                                className="absolute left-0 top-6 bottom-2 w-1 cursor-w-resize hover:bg-blue-500/30"
                                onMouseDown={(e) => handlePipResizeStart(e, 'w')}
                            />
                            <div
                                className="absolute right-0 top-6 bottom-2 w-1 cursor-e-resize hover:bg-blue-500/30"
                                onMouseDown={(e) => handlePipResizeStart(e, 'e')}
                            />
                            <div
                                className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-blue-500/50"
                                onMouseDown={(e) => handlePipResizeStart(e, 'sw')}
                            />
                            <div
                                className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-blue-500/50"
                                onMouseDown={(e) => handlePipResizeStart(e, 'se')}
                            />
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
                        dragHandleProps={{ onMouseDown: handleChatMouseDown }}
                    />
                    {/* Resize handles */}
                    {/* Edges */}
                    <div
                        className="absolute top-0 left-2 right-2 h-1 cursor-n-resize hover:bg-blue-500/30"
                        onMouseDown={(e) => handleChatResizeStart(e, 'n')}
                    />
                    <div
                        className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize hover:bg-blue-500/30"
                        onMouseDown={(e) => handleChatResizeStart(e, 's')}
                    />
                    <div
                        className="absolute left-0 top-2 bottom-2 w-1 cursor-w-resize hover:bg-blue-500/30"
                        onMouseDown={(e) => handleChatResizeStart(e, 'w')}
                    />
                    <div
                        className="absolute right-0 top-2 bottom-2 w-1 cursor-e-resize hover:bg-blue-500/30"
                        onMouseDown={(e) => handleChatResizeStart(e, 'e')}
                    />
                    {/* Corners */}
                    <div
                        className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-blue-500/50"
                        onMouseDown={(e) => handleChatResizeStart(e, 'nw')}
                    />
                    <div
                        className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-blue-500/50"
                        onMouseDown={(e) => handleChatResizeStart(e, 'ne')}
                    />
                    <div
                        className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-blue-500/50"
                        onMouseDown={(e) => handleChatResizeStart(e, 'sw')}
                    />
                    <div
                        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-blue-500/50"
                        onMouseDown={(e) => handleChatResizeStart(e, 'se')}
                    />
                </div>
            )}
        </div>
    )
}
