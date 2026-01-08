import { Button } from "./Button"

interface HeaderProps {
    title: string
    email: string
    onLogout: () => void
    className?: string
}

export function Header({ title, email, onLogout, className }: HeaderProps) {
    return (
        <header className={`flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 ${className}`}>
            <div className="font-bold text-lg text-white">{title}</div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">{email}</span>
                <Button variant="outline" size="sm" onClick={onLogout} className="text-xs">
                    Logout
                </Button>
            </div>
        </header>
    )
}
