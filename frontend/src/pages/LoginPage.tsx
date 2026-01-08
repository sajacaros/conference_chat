import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

// Actually, App.tsx top level useAuth dictates state. 
// Routes might need access to it.
// For now, I'll assume props are passed or I use useOutletContext?
// Or I can just standard use hook here if it used context. 
// But I wrote useAuth as a standalone hook, not context.
// So App.tsx passes `login` function to LoginPage?
// Yes, let's assume props for now: { onLogin }

interface LoginPageProps {
    onLogin: (email: string, pass: string) => Promise<void>
}

export default function LoginPage({ onLogin }: LoginPageProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    console.log("[LoginPage] Render")
    useEffect(() => {
        console.log("[LoginPage] Mounted")
    }, [])

    const handleLogin = async () => {
        if (!email || !password) return
        setIsLoading(true)
        try {
            await onLogin(email, password)
        } catch (e) {
            alert("Login failed")
        }
        setIsLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
            <Card className="w-full max-w-md bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-2xl text-center text-white">Welcome Back</CardTitle>
                    <p className="text-center text-gray-400 text-sm">
                        {new Date().toLocaleDateString()}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Email</label>
                        <Input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Password</label>
                        <Input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Button>
                    <div className="text-sm text-gray-500 text-center">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-blue-500 hover:underline">
                            Register
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
