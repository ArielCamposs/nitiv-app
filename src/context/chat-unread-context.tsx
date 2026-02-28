"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

type UnreadMap = Record<string, number>

type ChatUnreadContextType = {
    unreadMap: UnreadMap
    totalUnread: number
    markAsRead: (conversationId: string) => Promise<void>
}

const ChatUnreadContext = createContext<ChatUnreadContextType>({
    unreadMap: {},
    totalUnread: 0,
    markAsRead: async () => { },
})

export function ChatUnreadProvider({
    userId,
    children,
}: {
    userId: string
    children: React.ReactNode
}) {
    // Stable supabase client — won't change between renders
    const supabase = useRef(createClient()).current
    const [unreadMap, setUnreadMap] = useState<UnreadMap>({})

    const fetchUnread = useCallback(async () => {
        if (!userId) return

        const { data: reads } = await supabase
            .from("message_reads")
            .select("conversation_id, last_read_at")
            .eq("user_id", userId)

        const readsMap = Object.fromEntries(
            (reads ?? []).map((r) => [r.conversation_id, r.last_read_at])
        )

        const { data: convs } = await supabase
            .from("conversations")
            .select("id")
            .or(`user_a.eq.${userId},user_b.eq.${userId}`)

        const counts: UnreadMap = {}

        await Promise.all(
            (convs ?? []).map(async (conv) => {
                const lastRead = readsMap[conv.id] ?? "1970-01-01"
                const { count } = await supabase
                    .from("messages")
                    .select("*", { count: "exact", head: true })
                    .eq("conversation_id", conv.id)
                    .neq("sender_id", userId)
                    .gt("created_at", lastRead)

                counts[conv.id] = count ?? 0
            })
        )

        setUnreadMap(counts)
    }, [userId, supabase])

    useEffect(() => {
        if (!userId) return

        fetchUnread()

        // Broadcast: el emisor envía evento en el canal del receptor
        const channel = supabase
            .channel(`new-message:${userId}`)
            .on(
                "broadcast",
                { event: "message" },
                (payload) => {
                    const { conversation_id } = payload.payload as { conversation_id: string }
                    if (conversation_id) {
                        setUnreadMap(prev => ({
                            ...prev,
                            [conversation_id]: (prev[conversation_id] ?? 0) + 1,
                        }))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    const markAsRead = useCallback(
        async (conversationId: string) => {
            if (!userId) return

            await supabase.from("message_reads").upsert(
                {
                    conversation_id: conversationId,
                    user_id: userId,
                    last_read_at: new Date().toISOString(),
                },
                { onConflict: "conversation_id,user_id" }
            )

            // Actualizar TODAS las UIs de inmediato
            setUnreadMap((prev) => ({ ...prev, [conversationId]: 0 }))
        },
        [userId, supabase]
    )

    const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0)

    return (
        <ChatUnreadContext.Provider value={{ unreadMap, totalUnread, markAsRead }}>
            {children}
        </ChatUnreadContext.Provider>
    )
}

export function useChatUnread() {
    return useContext(ChatUnreadContext)
}
