import { useRef, useEffect, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

export interface DebugLogEntry {
    id: number
    timestamp: string
    type: string
    message: string
}

type FilterCategory = 'CONNECT' | 'USER_LIST' | 'SIGNAL' | 'DEBUG'

const FILTER_CONFIG: { key: FilterCategory; label: string; match: (type: string) => boolean; color: string; bgColor: string }[] = [
    { key: 'CONNECT', label: 'connect', match: (t) => t.includes('connect'), color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/50' },
    { key: 'USER_LIST', label: 'user_list', match: (t) => t.includes('user_list'), color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/50' },
    { key: 'SIGNAL', label: 'signal', match: (t) => t === 'SSE IN', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/50' },
    { key: 'DEBUG', label: 'debug', match: (t) => t.startsWith('DEBUG'), color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/50' },
]

interface SseLogPanelProps {
    logs: DebugLogEntry[]
    isOpen: boolean
    onToggle: () => void
    onClear: () => void
    className?: string
}

export function SseLogPanel({ logs, isOpen, onToggle, onClear, className }: SseLogPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [autoScroll, setAutoScroll] = useState(true)
    const [activeFilters, setActiveFilters] = useState<Set<FilterCategory>>(new Set(FILTER_CONFIG.map(f => f.key)))

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs, autoScroll])

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
            setAutoScroll(isAtBottom)
        }
    }

    const toggleFilter = (key: FilterCategory) => {
        setActiveFilters(prev => {
            const next = new Set(prev)
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }

    const toggleAllFilters = () => {
        if (activeFilters.size === FILTER_CONFIG.length) {
            setActiveFilters(new Set())
        } else {
            setActiveFilters(new Set(FILTER_CONFIG.map(f => f.key)))
        }
    }

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            for (const filter of FILTER_CONFIG) {
                if (filter.match(log.type) && activeFilters.has(filter.key)) {
                    return true
                }
            }
            return false
        })
    }, [logs, activeFilters])

    const getTypeColor = (type: string) => {
        if (type.includes('connect')) return 'text-green-400'
        if (type.includes('user_list')) return 'text-blue-400'
        if (type === 'SSE IN') return 'text-yellow-400'
        if (type.startsWith('DEBUG')) return 'text-purple-400'
        return 'text-gray-400'
    }

    const formatMessage = (message: string) => {
        try {
            const parsed = JSON.parse(message)
            return JSON.stringify(parsed, null, 2)
        } catch {
            return message
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={onToggle}
                className={cn(
                    "fixed bottom-4 left-4 z-50 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg",
                    "text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors",
                    "flex items-center gap-2 shadow-lg",
                    className
                )}
            >
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                SSE Log ({logs.length})
            </button>
        )
    }

    return (
        <div
            className={cn(
                "fixed bottom-4 left-4 z-50 w-[500px] max-w-[calc(100vw-2rem)]",
                "bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl backdrop-blur-sm",
                "flex flex-col",
                className
            )}
            style={{ maxHeight: '60vh' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-white">SSE IN Log</span>
                    <span className="text-xs text-gray-500">({filteredLogs.length}/{logs.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onClear}
                        className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        onClick={onToggle}
                        className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-800 flex-wrap">
                <button
                    onClick={toggleAllFilters}
                    className={cn(
                        "px-2 py-0.5 text-[10px] rounded border transition-colors",
                        activeFilters.size === FILTER_CONFIG.length
                            ? "bg-gray-600/30 border-gray-500/50 text-gray-300"
                            : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
                    )}
                >
                    ALL
                </button>
                {FILTER_CONFIG.map(filter => (
                    <button
                        key={filter.key}
                        onClick={() => toggleFilter(filter.key)}
                        className={cn(
                            "px-2 py-0.5 text-[10px] rounded border transition-colors",
                            activeFilters.has(filter.key)
                                ? cn(filter.bgColor, filter.color)
                                : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
                        )}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Log entries */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1"
            >
                {filteredLogs.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">
                        {logs.length === 0 ? 'No logs yet...' : 'No logs match the current filter'}
                    </div>
                ) : (
                    filteredLogs.map((log) => (
                        <div key={log.id} className="group">
                            <div className="flex items-start gap-2">
                                <span className="text-gray-600 flex-shrink-0">{log.timestamp}</span>
                                <span className={cn("font-semibold flex-shrink-0", getTypeColor(log.type))}>
                                    [{log.type}]
                                </span>
                            </div>
                            <pre className="text-gray-300 whitespace-pre-wrap break-all pl-4 mt-0.5 text-[10px] leading-relaxed">
                                {formatMessage(log.message)}
                            </pre>
                        </div>
                    ))
                )}
            </div>

            {/* Auto-scroll indicator */}
            {!autoScroll && (
                <button
                    onClick={() => {
                        setAutoScroll(true)
                        if (scrollRef.current) {
                            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                        }
                    }}
                    className="absolute bottom-12 right-4 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                    Scroll to bottom
                </button>
            )}
        </div>
    )
}
