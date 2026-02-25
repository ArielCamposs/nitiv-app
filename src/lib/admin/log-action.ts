import { createClient } from "@/lib/supabase/client"

export type AdminAction =
    | "delete_incident"
    | "edit_incident"
    | "resolve_incident"
    | "delete_emotional_log"
    | "edit_emotional_log"

export type EntityType = "incident" | "emotional_log"

type LogPayload = {
    action: AdminAction
    entityType: EntityType
    entityId: string
    entityDescription?: string
    beforeData?: Record<string, any>
    afterData?: Record<string, any>
}

export async function logAdminAction(payload: LogPayload) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        entity_description: payload.entityDescription ?? null,
        before_data: payload.beforeData ?? null,
        after_data: payload.afterData ?? null,
    })

    if (error) console.error("[AuditLog] Error al registrar acción:", error)
}
