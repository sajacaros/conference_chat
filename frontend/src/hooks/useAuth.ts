import { useState, useEffect, useCallback, useRef } from 'react'

export interface User {
    email: string
    token: string
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        try {
            const email = sessionStorage.getItem('email')
            const token = sessionStorage.getItem('token')
            if (email && token) {
                setUser({ email, token })
            }
        } catch (e) {
            console.error("Auth initialization error:", e)
        } finally {
            setLoading(false)
        }
    }, [])

    const login = useCallback((email: string, token: string) => {
        sessionStorage.setItem('email', email)
        sessionStorage.setItem('token', token)
        setUser({ email, token })
    }, [])

    const logout = useCallback(() => {
        // Optional: Call logout API
        const token = sessionStorage.getItem('token')
        if (token) {
            fetch(`${import.meta.env.VITE_API_URL}/sse/logout`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(console.error)
        }

        sessionStorage.removeItem('email')
        sessionStorage.removeItem('token')
        setUser(null)
    }, [])

    return { user, loading, login, logout }
}
