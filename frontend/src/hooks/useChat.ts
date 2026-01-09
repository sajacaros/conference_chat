import { useState, useRef, useEffect, useCallback } from 'react'

export interface ChatMessage {
    sender: string
    text: string
    time: string
}

interface ChatMessageResponse {
    sender: string
    text: string
    time: string
}

export function useChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

    const loadHistory = useCallback(async (token: string, partnerEmail: string, currentUserEmail: string) => {
        if (!token || !partnerEmail) return

        setIsLoading(true)
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/chat/history/${encodeURIComponent(partnerEmail)}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            )
            if (response.ok) {
                const data: ChatMessageResponse[] = await response.json()
                const formatted = data.map((m) => ({
                    sender: m.sender === currentUserEmail ? 'ME' : m.sender,
                    text: m.text,
                    time: new Date(m.time).toLocaleTimeString()
                }))
                setMessages(formatted)
            }
        } catch (e) {
            console.error('Failed to load chat history:', e)
        } finally {
            setIsLoading(false)
        }
    }, [])

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

    return { messages, addMessage, clearMessages, chatEndRef, loadHistory, isLoading }
}
