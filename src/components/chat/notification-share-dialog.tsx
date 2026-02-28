"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { sendNotificationToChat } from "@/lib/chat/send-notification-to-chat"
import { useChatUnread } from "@/context/chat-unread-context"
import { useRouter } from "next/navigation"

const ROLE_LABEL: Record<string, string> = {
    dupla: "Dupla Psicosocial",
    convivencia: "Convivencia",
    director: "Director",
    utp: "UTP",
    inspector: "Inspector",
    admin: "Administrador",
}

interface Props {
    open: boolean
    onOpenChange: (v: boolean) => void
    currentUserId: string
    institutionId: string
    notification: {
        id: string
        type: string
        title: string
        message: string
        related_id: string | null
        related_url: string | null
    }
    onShared?: () => void
}

export function NotificationShareDialog({
    open,
    onOpenChange,
    currentUserId,
    institutionId,
    notification,
    onShared,
}: Props) {
    const supabase = createClient()
    const router = useRouter()
    const { markAsRead } = useChatUnread()

    const [contacts, setContacts] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const loadContacts = async () => {
        if (contacts.length > 0 || loading) return
        setLoading(true)

        const BLOCKED_ROLES = ["estudiante", "centro_alumnos"]

        const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, name, last_name, role")
            .not("role", "in", `(${BLOCKED_ROLES.join(",")})`)
            .eq("institution_id", institutionId)
            .neq("id", currentUserId)
            .order("name")

        if (usersError) {
            console.error("Error cargando contactos", usersError)
            setLoading(false)
            return
        }

        setContacts(users ?? [])
        setLoading(false)
    }

    // Cargar contactos cuando el dialog se abre
    useEffect(() => {
        if (open) loadContacts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const [sending, setSending] = useState(false)

    const handleSend = async (recipientId: string) => {
        setSending(true)
        const res = await sendNotificationToChat({
            senderId: currentUserId,
            recipientId,
            notification,
        })
        setSending(false)

        if (!res) {
            console.error("No se pudo enviar la notificación al chat")
            return
        }

        await markAsRead(res.conversationId)
        router.push(`/chat/${res.conversationId}`)
        onOpenChange(false)
        onShared?.()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-sm">
                        Enviar notificación al chat
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-700">
                            {notification.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-3">
                            {notification.message}
                        </p>
                    </div>

                    <p className="text-xs text-slate-500">
                        Elige con quién quieres comentar esta notificación:
                    </p>

                    {loading ? (
                        <div className="space-y-1">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                            ))}
                        </div>
                    ) : contacts.length === 0 ? (
                        <p className="text-xs text-slate-400">
                            No se encontraron usuarios activos en tu institución para compartir.
                        </p>
                    ) : (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                            {contacts.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => handleSend(c.id)}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-left"
                                >
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {c.name[0]}
                                        {c.last_name?.[0] ?? ""}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">
                                            {c.name} {c.last_name ?? ""}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {ROLE_LABEL[c.role] ?? c.role}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
