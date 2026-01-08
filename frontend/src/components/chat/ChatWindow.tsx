import { useRef, useEffect } from 'react'
import { ChatMessage } from './ChatMessage'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { cn } from '@/lib/utils'

interface ChatWindowProps {
    messages: Array<{ sender: string; text: string; time: string }>
    onSend: (msg: string) => void
    className?: string
    isFloating?: boolean
    onToggleMode?: () => void
    dragHandleProps?: any
}

export function ChatWindow({ messages, onSend, className, isFloating, onToggleMode, dragHandleProps }: ChatWindowProps) {
    const [input, setInput] = React.useState('')
    const endRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = () => {
        if (!input.trim()) return
        onSend(input)
        setInput('')
    }

    return (
        <Card className={cn("flex flex-col overflow-hidden bg-gray-800/90 backdrop-blur border-gray-700 h-full", className)}>
            {/* Header */}
            <div
                className={cn("p-2 bg-gray-900 border-b border-gray-700 flex justify-between items-center select-none", isFloating ? "cursor-move" : "")}
                {...dragHandleProps}
            >
                <span className="font-bold text-sm text-white">💬 Chat</span>
                {onToggleMode && (
                    <Button variant="ghost" size="sm" onClick={onToggleMode} className="h-6 text-xs">
                        {isFloating ? "Dock" : "Float"}
                    </Button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-600">
                {messages.map((m, i) => (
                    <ChatMessage key={i} sender={m.sender} text={m.text} time={m.time} isMe={m.sender === 'ME'} />
                ))}
                <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="p-2 border-t border-gray-700 bg-gray-900 flex gap-2">
                <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1"
                />
                <Button onClick={handleSend} size="sm">Send</Button>
            </div>
        </Card>
    )
}

import * as React from 'react'
