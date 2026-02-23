"use server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function generateReport(
    institutionId: string,
    year: number,
    semester: number
) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    // Generar data con la función SQL
    const { data: reportData, error: fnError } = await supabase
        .rpc("generate_executive_report", {
            p_institution_id: institutionId,
            p_year: year,
            p_semester: semester
        })

    if (fnError) return { error: fnError.message }

    // Guardar el informe
    const { data, error } = await supabase
        .from("executive_reports")
        .insert({
            institution_id: institutionId,
            generated_by: user.id,
            period: `semestre_${semester}_${year}`,
            year,
            semester,
            data: reportData
        })
        .select("id")
        .single()

    if (error) return { error: error.message }
    return { success: true, reportId: data.id }
}
