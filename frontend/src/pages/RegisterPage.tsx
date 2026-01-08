import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function RegisterPage() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        email: '', username: '', password: '', code: ''
    })
    const [loading, setLoading] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleRegister = async () => {
        if (!formData.email || !formData.username || !formData.password || !formData.code) {
            alert("Please fill all fields")
            return
        }
        setLoading(true)
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (!res.ok) throw new Error(await res.text())
            alert("Registration successful!")
            navigate('/login')
        } catch (e: any) {
            alert("Registration failed: " + e.message)
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
            <Card className="w-full max-w-md bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-2xl text-center text-white">Create Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Input name="email" placeholder="Email" value={formData.email} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Input name="username" placeholder="Username" value={formData.username} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Input name="code" placeholder="Invite Code" value={formData.code} onChange={handleChange} />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handleRegister} disabled={loading}>
                        {loading ? 'Signing Up...' : 'Sign Up'}
                    </Button>
                    <div className="text-sm text-gray-500 text-center">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-500 hover:underline">
                            Login
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
