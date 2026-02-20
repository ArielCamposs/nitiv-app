"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

export interface Notification {
    id: string
    type: string
    title: string
    message: string
    related_url: string | null
    read: boolean
    created_at: string
}

export function useNotifications(userId: string | null) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const supabase = createClient()

    const fetchNotifications = useCallback(async () => {
        if (!userId) return

        const { data } = await supabase
            .from("notifications")
            .select("id, type, title, message, related_url, read, created_at")
            .eq("recipient_id", userId)
            .order("created_at", { ascending: false })
            .limit(20)

        if (data) {
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.read).length)
        }
    }, [userId, supabase])

    // Marcar una como leída
    const markAsRead = useCallback(async (id: string) => {
        await supabase
            .from("notifications")
            .update({ read: true, read_at: new Date().toISOString() })
            .eq("id", id)

        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
    }, [supabase])

    // Marcar todas como leídas
    const markAllAsRead = useCallback(async () => {
        if (!userId) return

        await supabase
            .from("notifications")
            .update({ read: true, read_at: new Date().toISOString() })
            .eq("recipient_id", userId)
            .eq("read", false)

        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
    }, [userId, supabase])

    useEffect(() => {
        fetchNotifications()

        if (!userId) return

        // Realtime — escucha nuevas notificaciones
        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `recipient_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotif = payload.new as Notification
                    setNotifications(prev => [newNotif, ...prev])
                    setUnreadCount(prev => prev + 1)
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [userId, fetchNotifications, supabase])

    return { notifications, unreadCount, markAsRead, markAllAsRead }
}
