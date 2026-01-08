import { useState, useRef, useEffect } from 'react'

export interface ChatMessage {
    sender: string
    text: string
    time: string
}

export function useChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const chatEndRef = useRef<HTMLDivElement>(null)

    const addMessage = (sender: string, text: string) => {
        setMessages(prev => [...prev, {
            sender,
            text,
            time: new Date().toLocaleTimeString()
        }])
    }

    const clearMessages = () => setMessages([])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    return { messages, addMessage, clearMessages, chatEndRef }
}
