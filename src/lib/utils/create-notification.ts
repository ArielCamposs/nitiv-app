import { createClient } from "@/lib/supabase/server"

interface NotificationPayload {
    institutionId: string
    recipientId: string
    type: string
    title: string
    message: string
    relatedId?: string
    relatedUrl?: string
}

export async function createNotification(payload: NotificationPayload) {
    const supabase = await createClient()

    const { error } = await supabase.from("notifications").insert({
        institution_id: payload.institutionId,
        recipient_id: payload.recipientId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        related_id: payload.relatedId ?? null,
        related_url: payload.relatedUrl ?? null,
    })

    if (error) console.error("Error creando notificación:", error.message)
}
