import { createClient } from "@/lib/supabase/client"

export type AdminAction =
    // Emotional logs
    | "delete_emotional_log"
    | "edit_emotional_log"
    // Incidents
    | "edit_incident"
    | "delete_incident"
    | "resolve_incident"
    // Students
    | "create_student"
    | "edit_student"
    | "toggle_student_active"
    | "reset_student_password"
    // Courses
    | "create_course"
    | "edit_course"
    | "toggle_course_active"
    | "assign_teacher_to_course"
    | "remove_teacher_from_course"
    | "assign_student_to_course"
    | "remove_student_from_course"
    // Staff users
    | "create_user"
    | "edit_user"
    | "toggle_user_active"
    | "reset_user_password"
    // Institution
    | "edit_institution"

export type EntityType =
    | "emotional_log"
    | "incident"
    | "student"
    | "course"
    | "user"
    | "institution"

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
