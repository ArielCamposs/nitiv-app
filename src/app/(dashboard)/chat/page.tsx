"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import { ContactList } from "@/components/chat/ContactList"
import { MessageSquare } from "lucide-react"

const BLOCKED_ROLES = ["estudiante", "centro_alumnos"]

interface UserProfile {
    id: string
    name: string
    last_name: string | null
    role: string
    conversationId?: string
}

export default function ChatPage() {
    const [contacts, setContacts] = useState<UserProfile[]>([])
    const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const router = useRouter()
    const { unreadMap, totalUnread, markAsRead } = useUnreadCount(currentUser?.id ?? "")

    useEffect(() => {
        const load = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) return router.push("/login")

            const { data: profile } = await supabase
                .from("users")
                .select("id, name, last_name, role")
                .eq("id", user.id)
                .single()

            if (!profile || BLOCKED_ROLES.includes(profile.role)) {
                return router.push("/")
            }

            setCurrentUser({ id: user.id, role: profile.role })

            // Cargar usuarios staff (no estudiantes)
            const { data: users } = await supabase
                .from("users")
                .select("id, name, last_name, role")
                .not("role", "in", `(${BLOCKED_ROLES.join(",")})`)
                .neq("id", user.id)
                .eq("active", true)
                .order("name")

            // Obtener conversaciones existentes para indexar unread por contacto
            const { data: convs } = await supabase
                .from("conversations")
                .select("id, user_a, user_b")
                .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

            const contactsWithConv = (users ?? []).map((u) => {
                const conv = convs?.find(
                    (c) =>
                        (c.user_a === user.id && c.user_b === u.id) ||
                        (c.user_b === user.id && c.user_a === u.id)
                )
                return { ...u, conversationId: conv?.id }
            })

            setContacts(contactsWithConv)
            setLoading(false)
        }
        load()
    }, [])

    const openChat = async (contactId: string) => {
        if (!currentUser) return

        // Buscar conversación existente
        const { data: existing } = await supabase
            .from("conversations")
            .select("id")
            .or(
                `and(user_a.eq.${currentUser.id},user_b.eq.${contactId}),` +
                `and(user_a.eq.${contactId},user_b.eq.${currentUser.id})`
            )
            .maybeSingle()

        if (existing) {
            markAsRead(existing.id)
            return router.push(`/chat/${existing.id}`)
        }

        const { data: newConv } = await supabase
            .from("conversations")
            .insert({ user_a: currentUser.id, user_b: contactId })
            .select("id")
            .single()

        if (newConv) router.push(`/chat/${newConv.id}`)
    }

    return (
        <div className="max-w-lg mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        Chat interno
                        {totalUnread > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
                                {totalUnread > 9 ? "9+" : totalUnread}
                            </span>
                        )}
                    </h1>
                    <p className="text-xs text-slate-400">Mensajes con el equipo</p>
                </div>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-16 bg-slate-100 rounded-xl animate-pulse"
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <ContactList
                        contacts={contacts}
                        currentUserId={currentUser?.id ?? ""}
                        onOpenChat={openChat}
                        unreadMap={unreadMap}
                    />
                </div>
            )}
        </div>
    )
}
