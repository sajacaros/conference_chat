import { useEffect } from "react"
import { cn } from "@/lib/utils"

export interface ToastProps {
    id: string | number
    message: string
    onDismiss?: (id: string | number) => void
}

export function Toast({ id, message, onDismiss }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss?.(id)
        }, 3000)
        return () => clearTimeout(timer)
    }, [id, onDismiss])

    return (
        <div className="animate-in slide-in-from-top-2 fade-in duration-300 mb-2 rounded-md bg-gray-800 border border-gray-700 p-3 shadow-lg flex items-center gap-2">
            <span>🔔</span>
            <span className="text-sm text-white">{message}</span>
        </div>
    )
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastProps[], onDismiss: (id: string | number) => void }) {
    if (toasts.length === 0) return null
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none">
            <div className="pointer-events-auto">
                {toasts.map(t => (
                    <Toast key={t.id} {...t} onDismiss={onDismiss} />
                ))}
            </div>
        </div>
    )
}
