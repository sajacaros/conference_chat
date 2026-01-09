import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface ConversationPartner {
    email: string
    username: string
    lastMessage: string
    lastMessageTime: string
}

interface ChatMessage {
    sender: string
    text: string
    time: string
}

interface ChatHistoryPageProps {
    email: string
    token: string
    onBack: () => void
    onLogout: () => void
}

export default function ChatHistoryPage({
    email,
    token,
    onBack,
    onLogout
}: ChatHistoryPageProps) {
    const [partners, setPartners] = useState<ConversationPartner[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedPartner, setSelectedPartner] = useState<string | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)

    useEffect(() => {
        const loadPartners = async () => {
            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/chat/partners`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                )
                if (response.ok) {
                    setPartners(await response.json())
                }
            } catch (e) {
                console.error('Failed to load partners:', e)
            } finally {
                setIsLoading(false)
            }
        }
        loadPartners()
    }, [token])

    const loadMessages = async (partnerEmail: string) => {
        setIsLoadingMessages(true)
        setSelectedPartner(partnerEmail)
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/chat/history/${encodeURIComponent(partnerEmail)}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            if (response.ok) {
                const data = await response.json()
                setMessages(data.map((m: any) => ({
                    sender: m.sender === email ? 'ME' : m.sender,
                    text: m.text,
                    time: new Date(m.time).toLocaleString()
                })))
            }
        } catch (e) {
            console.error('Failed to load messages:', e)
        } finally {
            setIsLoadingMessages(false)
        }
    }

    const formatTime = (timeString: string) => {
        if (!timeString) return ''
        const date = new Date(timeString)
        return date.toLocaleString()
    }

    return (
        <div className="flex flex-col h-screen bg-gray-950">
            <Header
                title="Chat History"
                email={email}
                onLogout={onLogout}
                onBack={onBack}
            />

            <div className="p-4 flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
                {selectedPartner ? (
                    // Message view
                    <div className="flex flex-col h-full">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPartner(null)}
                            className="self-start mb-4"
                        >
                            &larr; Back to list
                        </Button>

                        <div className="flex-1 overflow-y-auto space-y-2">
                            {isLoadingMessages ? (
                                <div className="text-center text-gray-400 mt-10">Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-gray-400 mt-10">No messages</div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.sender === 'ME' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] p-3 rounded-lg ${
                                                msg.sender === 'ME'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-800 text-gray-100'
                                            }`}
                                        >
                                            <div className="text-sm">{msg.text}</div>
                                            <div className="text-xs opacity-70 mt-1">{msg.time}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    // Partner list view
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="text-center text-gray-400 mt-10">Loading...</div>
                        ) : partners.length === 0 ? (
                            <div className="text-center text-gray-400 mt-10">No conversations yet</div>
                        ) : (
                            <div className="space-y-2">
                                {partners.map(partner => (
                                    <Card
                                        key={partner.email}
                                        className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                        onClick={() => loadMessages(partner.email)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                                {partner.username.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-white">{partner.username}</div>
                                                <div className="text-sm text-gray-400 truncate">{partner.lastMessage}</div>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {formatTime(partner.lastMessageTime)}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
