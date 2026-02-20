import * as XLSX from "xlsx"

// ── Excel registros emocionales ──
export function generateEmotionsExcel(data: {
    courseName: string
    rows: {
        studentName: string
        date: string
        emotion: string
        intensity: number
        reflection: string | null
    }[]
}) {
    const EMOTION_LABEL: Record<string, string> = {
        muy_bien: "Muy bien", bien: "Bien", neutral: "Neutral",
        mal: "Mal", muy_mal: "Muy mal",
    }

    const ws = XLSX.utils.json_to_sheet(
        data.rows.map(r => ({
            "Estudiante": r.studentName,
            "Fecha": new Date(r.date).toLocaleDateString("es-CL"),
            "Emoción": EMOTION_LABEL[r.emotion] ?? r.emotion,
            "Intensidad": `${r.intensity}/5`,
            "Reflexión": r.reflection ?? "—",
        }))
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Registros emocionales")
    XLSX.writeFile(wb, `emociones_${data.courseName.replace(/\s/g, "_")}.xlsx`)
}

// ── Excel DEC pendientes y resueltos ──
export function generateIncidentsExcel(data: {
    rows: {
        folio: string | null
        studentName: string
        courseName: string
        type: string
        severity: string
        date: string
        resolved: boolean
        reporterName: string
    }[]
}) {
    const SEVERITY_LABEL: Record<string, string> = {
        leve: "Leve", grave: "Grave", muy_grave: "Muy grave",
    }

    const ws = XLSX.utils.json_to_sheet(
        data.rows.map(r => ({
            "Folio": r.folio ?? "—",
            "Estudiante": r.studentName,
            "Curso": r.courseName,
            "Tipo": r.type,
            "Severidad": SEVERITY_LABEL[r.severity] ?? r.severity,
            "Fecha": new Date(r.date).toLocaleDateString("es-CL"),
            "Estado": r.resolved ? "Resuelto" : "Pendiente",
            "Reportado por": r.reporterName,
        }))
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Casos DEC")
    XLSX.writeFile(wb, `dec_${new Date().toLocaleDateString("es-CL").replace(/\//g, "-")}.xlsx`)
}

// ── Excel estudiantes en alerta ──
export function generateAlertsExcel(data: {
    rows: {
        studentName: string
        courseName: string
        alertType: string
        description: string | null
        date: string
        resolved: boolean
    }[]
}) {
    const ws = XLSX.utils.json_to_sheet(
        data.rows.map(r => ({
            "Estudiante": r.studentName,
            "Curso": r.courseName,
            "Tipo alerta": r.alertType,
            "Descripción": r.description ?? "—",
            "Fecha": new Date(r.date).toLocaleDateString("es-CL"),
            "Estado": r.resolved ? "Resuelta" : "Pendiente",
        }))
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Alertas")
    XLSX.writeFile(wb, `alertas_${new Date().toLocaleDateString("es-CL").replace(/\//g, "-")}.xlsx`)
}
