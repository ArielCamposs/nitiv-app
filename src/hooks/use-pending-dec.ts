"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function usePendingDec() {
    const supabase = createClient()
    const [count, setCount] = useState<number>(0)

    useEffect(() => {
        let userId: string | null = null

        async function fetchCount(uid: string) {
            const { count: c } = await supabase
                .from("incident_recipients")
                .select("id", { count: "exact", head: true })
                .eq("recipient_id", uid)
                .eq("seen", false)

            setCount(c ?? 0)
        }

        async function init() {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) return
            userId = user.id
            await fetchCount(userId)

            // Suscripción en tiempo real
            const channel = supabase
                .channel("pending-dec")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "incident_recipients",
                        filter: `recipient_id=eq.${userId}`,
                    },
                    () => {
                        if (userId) fetchCount(userId)
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }

        const cleanup = init()
        return () => {
            cleanup.then((fn) => fn?.())
        }
    }, [])

    return count
}
