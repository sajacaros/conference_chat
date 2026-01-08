import * as React from "react"
import { cn } from "@/lib/utils"

interface ModalProps {
    isOpen: boolean
    title: string
    children: React.ReactNode
    footer?: React.ReactNode
    onClose?: () => void
}

export function Modal({ isOpen, title, children, footer, onClose }: ModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-lg shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    {onClose && (
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            ✕
                        </button>
                    )}
                </div>
                <div className="p-6">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-800 flex justify-end gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
