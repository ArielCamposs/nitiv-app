"use client"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

export interface ChatMessage {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    meta?: null | Record<string, any>
    created_at: string
    sender?: {
        id: string
        name: string
        last_name: string | null
        role: string
    }
}

export function useChat(conversationId: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        if (!conversationId) return

        // 1. Cargar mensajes iniciales
        const loadMessages = async () => {
            const { data } = await supabase
                .from("messages")
                .select("*, sender:sender_id(id, name, last_name, role)")
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: true })

            setMessages((data as ChatMessage[]) ?? [])
            setLoading(false)
        }

        loadMessages()

        // 2. Escuchar nuevos mensajes en tiempo real
        const channel = supabase
            .channel(`chat-${conversationId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `conversation_id=eq.${conversationId}`,
                },
                async (payload) => {
                    // Obtener datos del sender para el mensaje nuevo
                    const { data: sender } = await supabase
                        .from("users")
                        .select("id, name, last_name, role")
                        .eq("id", payload.new.sender_id)
                        .single()

                    const newMsg = { ...payload.new, sender } as ChatMessage
                    setMessages((prev) => {
                        // Evitar duplicados
                        if (prev.find((m) => m.id === newMsg.id)) return prev
                        return [...prev, newMsg]
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [conversationId])

    const sendMessage = useCallback(
        async (content: string, senderId: string, recipientId: string) => {
            const trimmed = content.trim()
            if (!trimmed) return

            await supabase.from("messages").insert({
                conversation_id: conversationId,
                sender_id: senderId,
                content: trimmed,
            })

            // Notificar al receptor en tiempo real via Broadcast
            await supabase
                .channel(`new-message:${recipientId}`)
                .send({
                    type: "broadcast",
                    event: "message",
                    payload: { conversation_id: conversationId, sender_id: senderId },
                })
        },
        [conversationId, supabase]
    )

    return { messages, loading, sendMessage }
}
