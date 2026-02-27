import jsPDF from "jspdf"
import autoTable, { RowInput } from "jspdf-autotable"
import { StatisticsSummary, CourseRisk, Incident, Activity } from "@/lib/types"

export interface PDFReportData {
    institutionName: string
    days: number
    summary: StatisticsSummary
    courseRisks: CourseRisk[]
    incidents: Incident[]
    activities: Activity[]
}

export async function generateStatisticsReport(data: PDFReportData) {
    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    let currentY = 10

    // ======== CABECERA ========
    pdf.setFontSize(16)
    pdf.setFont("helvetica", "bold")
    pdf.text("Informe de Estadísticas", 10, currentY)

    currentY += 8
    pdf.setFontSize(11)
    pdf.setFont("helvetica", "normal")
    pdf.text(`Institución: ${data.institutionName}`, 10, currentY)

    currentY += 6
    pdf.setFontSize(9)
    const rangeLabel =
        data.days === 30
            ? "Últimos 30 días"
            : data.days === 90
                ? "Últimos 90 días"
                : "Últimos 365 días"
    pdf.text(`Período: ${rangeLabel}`, 10, currentY)

    currentY += 6
    const now = new Date()
    pdf.text(`Generado: ${now.toLocaleString("es-CL")}`, 10, currentY)

    currentY += 10

    // ======== RESUMEN EJECUTIVO ========
    pdf.setFontSize(12)
    pdf.setFont("helvetica", "bold")
    pdf.text("Resumen Ejecutivo", 10, currentY)

    currentY += 8
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")

    const summaryHead: RowInput[] = [["Métrica", "Valor"]]
    const summaryBody: RowInput[] = [
        ["Estudiantes en riesgo", data.summary.studentsAtRisk?.toString() || "0"],
        [
            "Cursos con desempeño crítico",
            data.summary.coursesAtRisk?.toString() || "0",
        ],
        ["Incidentes registrados", data.summary.totalIncidents?.toString() || "0"],
        [
            "Promedio de asistencia",
            `${data.summary.averageAttendance?.toFixed(1) || "0"}%`,
        ],
        [
            "Promedio de notas",
            `${data.summary.averageGrade?.toFixed(1) || "0"}`,
        ],
    ]

    autoTable(pdf, {
        head: summaryHead,
        body: summaryBody,
        startY: currentY,
        margin: { left: 10, right: 10 },
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [33, 128, 141], textColor: 255, fontStyle: "bold" },
    })

    currentY = (pdf as any).lastAutoTable.finalY + 10

    // ======== CURSOS EN RIESGO ========
    if (data.courseRisks.length > 0) {
        if (currentY > pageHeight - 40) {
            pdf.addPage()
            currentY = 10
        }

        pdf.setFontSize(12)
        pdf.setFont("helvetica", "bold")
        pdf.text("Cursos en Riesgo", 10, currentY)

        currentY += 8

        const courseHead: RowInput[] = [
            ["Curso", "Estudiantes en riesgo", "Promedio", "Asistencia"],
        ]
        const courseBody: RowInput[] = data.courseRisks.map((c) => [
            c.courseName || "N/A",
            c.studentsAtRisk?.toString() || "0",
            c.averageGrade?.toFixed(1) || "0",
            `${c.averageAttendance?.toFixed(1) || "0"}%`,
        ])

        autoTable(pdf, {
            head: courseHead,
            body: courseBody,
            startY: currentY,
            margin: { left: 10, right: 10 },
            theme: "grid",
            styles: { fontSize: 9 },
            headStyles: {
                fillColor: [229, 97, 81],
                textColor: 255,
                fontStyle: "bold",
            },
        })

        currentY = (pdf as any).lastAutoTable.finalY + 10
    }

    // ======== INCIDENTES ========
    if (data.incidents.length > 0) {
        if (currentY > pageHeight - 40) {
            pdf.addPage()
            currentY = 10
        }

        pdf.setFontSize(12)
        pdf.setFont("helvetica", "bold")
        pdf.text("Incidentes Reportados", 10, currentY)

        currentY += 8

        const incidentHead: RowInput[] = [["Tipo", "Estudiante", "Fecha", "Estado"]]
        const incidentBody: RowInput[] = data.incidents
            .slice(0, 15) // máximo 15 para no llenar el PDF
            .map((i) => [
                i.type || "N/A",
                i.studentName || "N/A",
                new Date(i.createdAt).toLocaleDateString("es-CL"),
                i.status || "Abierto",
            ])

        autoTable(pdf, {
            head: incidentHead,
            body: incidentBody,
            startY: currentY,
            margin: { left: 10, right: 10 },
            theme: "grid",
            styles: { fontSize: 9 },
            headStyles: {
                fillColor: [244, 164, 96],
                textColor: 255,
                fontStyle: "bold",
            },
        })

        currentY = (pdf as any).lastAutoTable.finalY + 10

        if (data.incidents.length > 15) {
            if (currentY > pageHeight - 20) {
                pdf.addPage()
                currentY = 10
            }
            pdf.setFontSize(8)
            pdf.text(
                `... y ${data.incidents.length - 15} incidentes más`,
                10,
                currentY
            )
        }
    }

    // ======== ACTIVIDADES RECIENTES ========
    if (data.activities.length > 0) {
        if (currentY > pageHeight - 40) {
            pdf.addPage()
            currentY = 10
        }

        pdf.setFontSize(12)
        pdf.setFont("helvetica", "bold")
        pdf.text("Actividades Recientes", 10, currentY)

        currentY += 8

        const activityHead: RowInput[] = [["Actividad", "Usuario", "Fecha"]]
        const activityBody: RowInput[] = data.activities
            .slice(0, 10)
            .map((a) => [
                a.description || "N/A",
                a.userName || "N/A",
                new Date(a.timestamp).toLocaleDateString("es-CL"),
            ])

        autoTable(pdf, {
            head: activityHead,
            body: activityBody,
            startY: currentY,
            margin: { left: 10, right: 10 },
            theme: "grid",
            styles: { fontSize: 9 },
            headStyles: {
                fillColor: [76, 175, 80],
                textColor: 255,
                fontStyle: "bold",
            },
        })

        currentY = (pdf as any).lastAutoTable.finalY + 10
    }

    // ======== PIE DE PÁGINA ========
    const totalPages = (pdf as any).internal.getNumberOfPages()

    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(150)

        const footerY = pageHeight - 8
        pdf.text(
            "Uso interno y confidencial. Prohibida su difusión fuera de la comunidad educativa.",
            10,
            footerY
        )

        // Número de página
        pdf.text(
            `Página ${i} de ${totalPages}`,
            pageWidth - 30,
            footerY
        )
    }

    return pdf
}
