import { createClient } from "@/lib/supabase/client"

type AlertType =
    | "registros_negativos"
    | "discrepancia_docente"
    | "sin_registro"
    | "dec_repetido"

type CreateAlertParams = {
    institutionId: string
    studentId: string
    type: AlertType
    description: string
    triggeredBy?: string
}

export async function createAlert({
    institutionId,
    studentId,
    type,
    description,
    triggeredBy = "system",
}: CreateAlertParams) {
    const supabase = createClient()

    // Verificar si ya existe una alerta activa del mismo tipo para ese estudiante
    const { data: existing } = await supabase
        .from("alerts")
        .select("id")
        .eq("student_id", studentId)
        .eq("type", type)
        .eq("resolved", false)
        .maybeSingle()

    // Si ya existe una activa, no crear duplicado
    if (existing) return

    const { error } = await supabase.from("alerts").insert({
        institution_id: institutionId,
        student_id: studentId,
        type,
        description,
        triggered_by: triggeredBy,
        resolved: false,
    })

    if (error) {
        console.error("Error creando alerta:", error)
    }
}
