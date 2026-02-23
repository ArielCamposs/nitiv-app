"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

export type AvailabilityStatus = "disponible" | "en_clase" | "en_reunion" | "ausente"

export const AVAILABILITY_CONFIG: Record<AvailabilityStatus, { label: string; dot: string; color: string }> = {
    disponible: { label: "Disponible", dot: "bg-green-500", color: "text-green-600" },
    en_clase: { label: "En clase", dot: "bg-blue-500", color: "text-blue-600" },
    en_reunion: { label: "En reunión", dot: "bg-yellow-500", color: "text-yellow-600" },
    ausente: { label: "Ausente", dot: "bg-slate-400", color: "text-slate-400" },
}

export function useAvailability(userId: string) {
    const supabase = createClient()
    const [status, setStatus] = useState<AvailabilityStatus>("disponible")
    const [availabilityMap, setAvailabilityMap] = useState<Record<string, AvailabilityStatus>>({})

    useEffect(() => {
        if (!userId) return

        const load = async () => {
            const { data } = await supabase
                .from("user_availability")
                .select("status")
                .eq("user_id", userId)
                .maybeSingle()
            if (data) setStatus(data.status as AvailabilityStatus)
        }
        load()

        const channel = supabase
            .channel("availability-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "user_availability" }, payload => {
                const d = payload.new as any
                if (!d?.user_id) return
                if (d.user_id === userId) setStatus(d.status)
                setAvailabilityMap(prev => ({ ...prev, [d.user_id]: d.status }))
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [userId])

    const updateStatus = useCallback(async (newStatus: AvailabilityStatus) => {
        if (!userId) return
        setStatus(newStatus)
        await supabase
            .from("user_availability")
            .upsert({ user_id: userId, status: newStatus, updated_at: new Date().toISOString() })
    }, [userId, supabase])

    return { status, availabilityMap, updateStatus }
}
