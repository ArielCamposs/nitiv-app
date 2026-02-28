"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

type DecBadgeContextType = {
    count: number
    markAsSeen: () => Promise<void>
}

const DecBadgeContext = createContext<DecBadgeContextType>({
    count: 0,
    markAsSeen: async () => { },
})

export function DecBadgeProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient()
    const [count, setCount] = useState(0)
    const [userId, setUserId] = useState<string | null>(null)

    const fetchCount = useCallback(async (uid: string) => {
        const { count: c } = await supabase
            .from("incident_recipients")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", uid)
            .eq("seen", false)
        setCount(c ?? 0)
    }, [supabase])

    const markAsSeen = useCallback(async () => {
        if (!userId) return

        await supabase
            .from("incident_recipients")
            .update({ seen: true, seen_at: new Date().toISOString() })
            .eq("recipient_id", userId)
            .eq("seen", false)

        // Forzar de inmediato sin esperar Realtime
        setCount(0)
    }, [userId, supabase])

    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setUserId(user.id)
            await fetchCount(user.id)

            // Realtime solo para nuevos INSERT (nuevos casos DEC)
            const channel = supabase
                .channel(`pending-dec-${user.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "incident_recipients",
                        filter: `recipient_id=eq.${user.id}`,
                    },
                    () => fetchCount(user.id)
                )
                .subscribe()

            return () => { supabase.removeChannel(channel) }
        }

        init()
    }, [])

    return (
        <DecBadgeContext.Provider value={{ count, markAsSeen }}>
            {children}
        </DecBadgeContext.Provider>
    )
}

export const useDecBadge = () => useContext(DecBadgeContext)
