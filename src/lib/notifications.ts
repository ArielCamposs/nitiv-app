"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

export type NotificationType =
    | "dec_nuevo"
    | "dec_resuelto"
    | "actividad_nueva"
    | "pulso_activo"
    | "estudiante_nuevo"
    | "usuario_nuevo"

interface CreateNotificationsParams {
    institutionId: string
    recipientIds: string[]
    type: NotificationType
    title: string
    message: string
    relatedId?: string
    relatedUrl?: string
}

// ── Crear notificaciones en bulk ──────────────────────────────────────────────
export async function createNotifications({
    institutionId, recipientIds, type,
    title, message, relatedId, relatedUrl,
}: CreateNotificationsParams) {
    if (recipientIds.length === 0) return

    const rows = recipientIds.map(recipient_id => ({
        institution_id: institutionId,
        recipient_id,
        type,
        title,
        message,
        related_id: relatedId ?? null,
        related_url: relatedUrl ?? null,
    }))

    const { error } = await supabaseAdmin.from("notifications").insert(rows)
    if (error) console.error("[notifications]", error.message)
}

// ── Obtener IDs de usuarios por rol ───────────────────────────────────────────
export async function getUserIdsByRoles(
    institutionId: string,
    roles: string[],
    excludeId?: string
): Promise<string[]> {
    let q = supabaseAdmin
        .from("users")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("active", true)
        .in("role", roles)

    if (excludeId) q = q.neq("id", excludeId)

    const { data } = await q
    return (data ?? []).map(u => u.id)
}

// ── Obtener estudiantes por curso ─────────────────────────────────────────────
export async function getStudentIdsByCourses(
    institutionId: string,
    courseIds: string[]
): Promise<string[]> {
    if (!courseIds.length) return []

    const { data } = await supabaseAdmin
        .from("students")
        .select("user_id")
        .eq("institution_id", institutionId)
        .eq("active", true)
        .in("course_id", courseIds)
        .not("user_id", "is", null)

    return (data ?? []).map(s => s.user_id as string)
}

// ── Obtener todos los IDs de una institución ──────────────────────────────────
export async function getAllUserIds(
    institutionId: string,
    excludeId?: string
): Promise<string[]> {
    let q = supabaseAdmin
        .from("users")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("active", true)

    if (excludeId) q = q.neq("id", excludeId)

    const { data } = await q
    return (data ?? []).map(u => u.id)
}
