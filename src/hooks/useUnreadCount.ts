"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

export function useUnreadCount(userId: string) {
    const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})
    const supabase = createClient()

    const fetchUnread = useCallback(async () => {
        if (!userId) return

        // Obtener mis registros de última lectura
        const { data: reads } = await supabase
            .from("message_reads")
            .select("conversation_id, last_read_at")
            .eq("user_id", userId)

        const readsMap = Object.fromEntries(
            (reads ?? []).map((r) => [r.conversation_id, r.last_read_at])
        )

        // Obtener mis conversaciones
        const { data: convs } = await supabase
            .from("conversations")
            .select("id")
            .or(`user_a.eq.${userId},user_b.eq.${userId}`)

        const counts: Record<string, number> = {}
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
    }, [userId])

    useEffect(() => {
        if (!userId) return

        fetchUnread()

        // Escuchar mensajes nuevos para actualizar badges en tiempo real
        const channel = supabase
            .channel(`unread-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                },
                () => fetchUnread()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, fetchUnread])

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

            setUnreadMap((prev) => ({ ...prev, [conversationId]: 0 }))
        },
        [userId, supabase]
    )

    const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0)

    return { unreadMap, totalUnread, markAsRead }
}
