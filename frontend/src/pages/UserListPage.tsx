import { useState } from 'react'
import { Header } from '@/components/ui/Header'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'

interface User {
    email: string
    username: string
}

interface UserListPageProps {
    email: string
    users: User[]
    onLogout: () => void
    onCall: (targetEmail: string) => void
    incomingCall: { sender: string; data: any } | null
    onAcceptCall: () => void
    onRejectCall: () => void
    onHistory?: () => void
}

export default function UserListPage({
    email,
    users,
    onLogout,
    onCall,
    incomingCall,
    onAcceptCall,
    onRejectCall,
    onHistory
}: UserListPageProps) {
    const [filter, setFilter] = useState('')

    console.log('[UserListPage] incomingCall:', incomingCall)

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase() !== email.toLowerCase() &&
        (u.email.toLowerCase().includes(filter.toLowerCase()) ||
            u.username.toLowerCase().includes(filter.toLowerCase()))
    )

    if (!email) return <div className="text-red-500">Error: No Email</div>

    return (
        <div className="flex flex-col h-screen bg-gray-950">
            <Header title="Contacts" email={email} onLogout={onLogout} />

            <div className="p-4 flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
                <div className="mb-4 flex gap-2">
                    <Input
                        placeholder="Search friends..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="flex-1"
                    />
                    {onHistory && (
                        <Button variant="outline" onClick={onHistory}>
                            History
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-4">
                    {filteredUsers.length === 0 ? (
                        <div className="col-span-full text-center text-gray-500 mt-10">No users found</div>
                    ) : filteredUsers.map(u => (
                        <Card key={u.email} className="flex items-center p-4 gap-4 hover:bg-gray-800/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                {u.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-white truncate">{u.username}</div>
                                <div className="text-xs text-gray-400 truncate">{u.email}</div>
                            </div>
                            <Button size="sm" onClick={() => onCall(u.email)}>Call</Button>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Incoming Call Modal */}
            <Modal isOpen={!!incomingCall} title="Incoming Call">
                <div className="text-center py-4">
                    <p className="text-white text-lg mb-4">
                        <strong>{incomingCall?.sender}</strong> is calling you...
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button onClick={onAcceptCall} className="bg-green-600 hover:bg-green-700">Accept</Button>
                        <Button onClick={onRejectCall} variant="danger">Reject</Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
