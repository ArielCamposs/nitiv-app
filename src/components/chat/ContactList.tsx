"use client"
import { UnreadBadge } from "@/components/chat/UnreadBadge"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

interface Contact {
    id: string
    name: string
    last_name: string | null
    role: string
    conversationId?: string
    availability?: string | null
}

const ROLE_GROUPS: { role: string; label: string; emoji: string }[] = [
    { role: "director", label: "Dirección", emoji: "🏫" },
    { role: "dupla", label: "Dupla psicosocial", emoji: "🧠" },
    { role: "convivencia", label: "Convivencia", emoji: "🤝" },
    { role: "utp", label: "UTP", emoji: "📚" },
    { role: "inspector", label: "Inspectoría", emoji: "🔍" },
    { role: "docente", label: "Docentes", emoji: "👨🏫" },
    { role: "admin", label: "Administración", emoji: "⚙️" },
]

const AVAILABILITY_DOT: Record<string, string> = {
    disponible: "bg-green-500",
    en_clase: "bg-blue-500",
    en_reunion: "bg-yellow-500",
    ausente: "bg-slate-400",
}

const AVAILABILITY_LABEL: Record<string, string> = {
    disponible: "Disponible",
    en_clase: "En clase",
    en_reunion: "En reunión",
    ausente: "Ausente",
}

interface ContactListProps {
    contacts: Contact[]
    currentUserId: string
    onOpenChat: (contactId: string) => void
    unreadMap: Record<string, number>
    isOnline: (id: string) => boolean
}

function ContactItem({ contact, onOpenChat, unread, isOnline }: {
    contact: Contact
    onOpenChat: (id: string) => void
    unread: number
    isOnline: boolean
}) {
    const fullName = contact.last_name ? `${contact.name} ${contact.last_name}` : contact.name
    const initials = `${contact.name[0] ?? ""}${contact.last_name?.[0] ?? ""}`.toUpperCase()

    const dotColor = isOnline
        ? (contact.availability ? AVAILABILITY_DOT[contact.availability] : "bg-green-500")
        : "bg-slate-300"

    return (
        <button
            onClick={() => onOpenChat(contact.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
        >
            <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {initials}
                </div>
                <span className={cn(
                    "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white transition-colors",
                    dotColor
                )} />
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm truncate">{fullName}</p>
                <p className="text-xs text-slate-400">
                    {isOnline
                        ? (contact.availability
                            ? AVAILABILITY_LABEL[contact.availability]
                            : "En línea")
                        : "Desconectado"
                    }
                </p>
            </div>

            {unread > 0 && <UnreadBadge count={unread} />}
        </button>
    )
}

function RoleGroup({ group, contacts, onOpenChat, unreadMap, isOnline, defaultOpen = false }: {
    group: typeof ROLE_GROUPS[0]
    contacts: Contact[]
    onOpenChat: (id: string) => void
    unreadMap: Record<string, number>
    isOnline: (id: string) => boolean
    defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)

    const groupUnread = contacts.reduce(
        (acc, c) => acc + (unreadMap[c.conversationId ?? ""] ?? 0), 0
    )

    return (
        <div className="border-b border-slate-100 last:border-b-0">
            <button
                onClick={() => setOpen(p => !p)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors"
            >
                <span className="text-base leading-none">{group.emoji}</span>
                <span className="flex-1 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {group.label}
                </span>
                <span className="text-xs text-slate-400">{contacts.length}</span>
                {groupUnread > 0 && !open && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                        {groupUnread}
                    </span>
                )}
                <ChevronDown className={cn(
                    "w-3.5 h-3.5 text-slate-400 transition-transform shrink-0",
                    open ? "rotate-180" : ""
                )} />
            </button>

            {open && (
                <div className="pb-1 px-1">
                    {contacts.map(c => (
                        <ContactItem
                            key={c.id}
                            contact={c}
                            onOpenChat={onOpenChat}
                            unread={unreadMap[c.conversationId ?? ""] ?? 0}
                            isOnline={isOnline(c.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export function ContactList({ contacts, currentUserId, onOpenChat, unreadMap, isOnline }: ContactListProps) {
    if (contacts.length === 0) {
        return (
            <div className="py-12 text-center text-slate-400">
                <p className="text-2xl mb-2">👥</p>
                <p className="text-sm">No hay otros usuarios disponibles</p>
            </div>
        )
    }

    const grouped = ROLE_GROUPS.map(group => ({
        group,
        contacts: contacts.filter(c => c.role === group.role),
    })).filter(g => g.contacts.length > 0)

    const knownRoles = new Set(ROLE_GROUPS.map(g => g.role))
    const others = contacts.filter(c => !knownRoles.has(c.role))

    const firstWithUnread = grouped.find(g =>
        g.contacts.some(c => (unreadMap[c.conversationId ?? ""] ?? 0) > 0)
    )

    return (
        <div className="divide-y divide-slate-100">
            {grouped.map(({ group, contacts: groupContacts }) => (
                <RoleGroup
                    key={group.role}
                    group={group}
                    contacts={groupContacts}
                    onOpenChat={onOpenChat}
                    unreadMap={unreadMap}
                    isOnline={isOnline}
                    defaultOpen={
                        firstWithUnread?.group.role === group.role ||
                        grouped.length === 1
                    }
                />
            ))}

            {others.length > 0 && (
                <RoleGroup
                    group={{ role: "otros", label: "Otros", emoji: "👤" }}
                    contacts={others}
                    onOpenChat={onOpenChat}
                    unreadMap={unreadMap}
                    isOnline={isOnline}
                    defaultOpen={false}
                />
            )}
        </div>
    )
}
