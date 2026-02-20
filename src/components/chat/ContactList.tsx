"use client"

import { useUnreadCount } from "@/hooks/useUnreadCount"
import { UnreadBadge } from "@/components/chat/UnreadBadge"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface Contact {
    id: string
    name: string
    last_name: string | null
    role: string
    conversationId?: string
}

const ROLE_LABEL: Record<string, string> = {
    admin: "Administrador",
    director: "Director",
    inspector: "Inspector",
    utp: "UTP",
    convivencia: "Convivencia",
    dupla: "Dupla",
    docente: "Docente",
}

interface ContactListProps {
    contacts: Contact[]
    currentUserId: string
    onOpenChat: (contactId: string) => void
    unreadMap: Record<string, number>
}

export function ContactList({ contacts, currentUserId, onOpenChat, unreadMap }: ContactListProps) {
    if (contacts.length === 0) {
        return (
            <div className="py-12 text-center text-slate-400">
                <p className="text-2xl mb-2">👥</p>
                <p className="text-sm">No hay otros usuarios disponibles</p>
            </div>
        )
    }

    return (
        <ul className="space-y-1">
            {contacts.map((c) => {
                const fullName = c.last_name ? `${c.name} ${c.last_name}` : c.name
                const unread = unreadMap[c.conversationId ?? ""] ?? 0
                const initials = `${c.name[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase()

                return (
                    <li key={c.id}>
                        <button
                            onClick={() => onOpenChat(c.id)}
                            className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                            )}
                        >
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                                {initials}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 text-sm truncate">{fullName}</p>
                                <p className="text-xs text-slate-400">
                                    {ROLE_LABEL[c.role] ?? c.role}
                                </p>
                            </div>

                            {unread > 0 && <UnreadBadge count={unread} />}
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}
