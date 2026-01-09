import { Button } from "./Button"

interface HeaderProps {
    title: string
    email: string
    onLogout: () => void
    className?: string
    logoutText?: string
    onBack?: () => void
}

export function Header({ title, email, onLogout, className, logoutText = 'Logout', onBack }: HeaderProps) {
    return (
        <header className={`flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 ${className}`}>
            <div className="flex items-center gap-2">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        &larr;
                    </button>
                )}
                <div className="font-bold text-lg text-white">{title}</div>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">{email}</span>
                <Button variant="outline" size="sm" onClick={onLogout} className="text-xs">
                    {logoutText}
                </Button>
            </div>
        </header>
    )
}
