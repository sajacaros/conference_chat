import { useRef, useEffect, useCallback } from 'react'

type EventHandler = (data: any) => void

interface UseSSEProps {
    token: string | undefined
    email: string | undefined
    onConnect?: () => void
    onUserList?: (users: any[]) => void
    onSignal?: (signal: any) => void
    onDebug?: (type: string, msg: string) => void
}

export function useSSE({ token, email, onConnect, onUserList, onSignal, onDebug }: UseSSEProps) {
    const eventSourceRef = useRef<EventSource | null>(null)

    // Refs for callbacks to allow stable connect function
    const onConnectRef = useRef(onConnect)
    const onUserListRef = useRef(onUserList)
    const onSignalRef = useRef(onSignal)
    const onDebugRef = useRef(onDebug)
    // const eventSourceRef = useRef<EventSource | null>(null) // already defined

    // Update refs whenever props change
    useEffect(() => {
        onConnectRef.current = onConnect
        onUserListRef.current = onUserList
        onSignalRef.current = onSignal
        onDebugRef.current = onDebug
    }, [onConnect, onUserList, onSignal, onDebug])

    const connect = useCallback(() => {
        if (!token || !email) return
        if (eventSourceRef.current) eventSourceRef.current.close()

        try {
            const es = new EventSource(`${import.meta.env.VITE_API_URL}/sse/subscribe?token=${token}`)

            es.addEventListener('connect', (e: MessageEvent) => {
                onDebugRef.current?.('SSE IN (connect)', e.data)
                onConnectRef.current?.()
            })

            es.addEventListener('user_list', (e: MessageEvent) => {
                onDebugRef.current?.('SSE IN (user_list)', e.data)
                try {
                    const users = JSON.parse(e.data)
                    onUserListRef.current?.(users)
                } catch (err) {
                    console.error("Failed to parse user list", err)
                }
            })

            es.addEventListener('signal', (e: MessageEvent) => {
                onDebugRef.current?.('SSE IN', e.data)
                try {
                    const payload = JSON.parse(e.data)
                    onSignalRef.current?.(payload)
                } catch (err) {
                    console.error("Failed to parse signal", err)
                }
            })

            es.onerror = (err) => {
                console.error("SSE Error", err)
                // Do NOT close explicitly; let browser retry connection
                // es.close() 
            }

            eventSourceRef.current = es
        } catch (e) {
            console.error("SSE Connection Failed", e)
        }
        // Depend ONLY on token/email, NOT on callbacks
    }, [token, email])

    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
        }
    }, [])

    // Auto-connect if token changes? Maybe not, let caller control it.
    // actually in App.jsx it was controlled.

    // Cleanup
    useEffect(() => {
        return () => {
            eventSourceRef.current?.close()
        }
    }, [])

    const sendSignal = useCallback(async (target: string, type: string, data: string | object) => {
        if (!token || !email) return

        const payload = {
            sender: email,
            target,
            type,
            data: typeof data === 'string' ? data : JSON.stringify(data)
        }

        onDebug?.('SSE OUT', JSON.stringify(payload))

        try {
            await fetch(`${import.meta.env.VITE_API_URL}/sse/signal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })
        } catch (e) {
            console.error(e)
        }
    }, [token, email, onDebug])

    return { connect, disconnect, sendSignal }
}
