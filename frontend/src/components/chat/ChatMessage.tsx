import { cn } from "@/lib/utils"

interface ChatMessageProps {
    sender: string
    text: string
    time: string
    isMe: boolean
}

export function ChatMessage({ sender, text, time, isMe }: ChatMessageProps) {
    return (
        <div className={cn("flex flex-col mb-4", isMe ? "items-end" : "items-start")}>
            <div className={cn(
                "max-w-[80%] rounded-lg p-3 text-sm",
                isMe ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"
            )}>
                {text}
            </div>
            <div className="text-xs text-gray-500 mt-1">
                {!isMe && <span className="mr-2 font-bold">{sender}</span>}
                <span>{time}</span>
            </div>
        </div>
    )
}
