"use client"

import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export async function sendNotificationToChat({
    senderId,
    recipientId,
    notification,
}: {
    senderId: string
    recipientId: string
    notification: {
        id: string
        type: string
        title: string
        message: string
        related_id: string | null
        related_url: string | null
    }
}) {
    // Buscar o crear conversación
    const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(user_a.eq.${senderId},user_b.eq.${recipientId}),and(user_a.eq.${recipientId},user_b.eq.${senderId})`)
        .maybeSingle()

    let conversationId = existing?.id
    if (!conversationId) {
        const { data: created } = await supabase
            .from("conversations")
            .insert({ user_a: senderId, user_b: recipientId })
            .select("id")
            .single()
        conversationId = created?.id
        if (!conversationId) return null
    }

    const content = `📢 ${notification.title}`

    const { data: msg } = await supabase
        .from("messages")
        .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content,
            meta: {
                type: "notification",
                notification_id: notification.id,
                notification_type: notification.type,
                title: notification.title,
                message: notification.message,
                related_id: notification.related_id,
                related_url: notification.related_url,
            },
        })
        .select("id")
        .single()

    return { conversationId, messageId: msg?.id }
}
