"use server"

import { createNotification } from "@/lib/utils/create-notification"

interface NotificationPayload {
    institutionId: string
    recipientId: string
    type: string
    title: string
    message: string
    relatedId?: string
    relatedUrl?: string
}

export async function createNotificationAction(payload: NotificationPayload) {
    await createNotification(payload)
}
