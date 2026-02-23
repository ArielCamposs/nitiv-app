"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function usePresence(userId: string, institutionId: string) {
    const supabase = createClient()
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!userId || !institutionId) return

        const channel = supabase.channel(`presence-${institutionId}`, {
            config: { presence: { key: userId } },
        })

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState<{ userId: string }>()
                const ids = new Set(
                    Object.values(state)
                        .flat()
                        .map((p: any) => p.userId)
                )
                setOnlineUsers(ids)
            })
            .subscribe(async status => {
                if (status === "SUBSCRIBED") {
                    await channel.track({ userId, online_at: new Date().toISOString() })
                }
            })

        return () => {
            channel.untrack()
            supabase.removeChannel(channel)
        }
    }, [userId, institutionId])

    const isOnline = (id: string) => onlineUsers.has(id)

    return { onlineUsers, isOnline }
}
