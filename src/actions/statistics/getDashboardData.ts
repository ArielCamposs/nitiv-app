"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export type CountByLabel = { label: string; count: number }
export type IncidentByMonth = { month: string; count: number }
export type ActivitiesByMonth = { month: string; count: number }

export type CourseRisk = {
    course_id: string
    course_name: string
    avg_score: number
    low_students: {
        student_id: string
        name: string
        avg_score: number
    }[]
}

export type DashboardData = {
    summary: {
        total_emotion_logs: number
        total_incidents: number
        total_activities: number
        low_emotion_courses: number
    }
    emotionDistribution: { emotion: string; count: number }[]
    courseRisks: CourseRisk[]
    incidents: {
        byMonth: IncidentByMonth[]
        bySeverity: CountByLabel[]
        byType: CountByLabel[]
        recent: {
            id: string
            folio: string | null
            type: string
            severity: string
            student_name: string
            course_name: string | null
            incident_date: string
        }[]
    }
    activities: {
        byMonth: ActivitiesByMonth[]
        byType: CountByLabel[]
        recent: {
            id: string
            title: string
            start_datetime: string
        }[]
    }
}

const EMOTION_SCORE: Record<string, number> = {
    triste: 1,
    muy_mal: 1.5,
    mal: 2,
    neutral: 3,
    bien: 4,
    muy_bien: 5,
}

const LOW_RISK_THRESHOLD = 2.5

export async function getDashboardData(
    institutionId: string,
    days: number
): Promise<{ error?: string; data?: DashboardData }> {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => cookieStore.getAll(),
                },
            }
        )

        const to = new Date()
        const from = new Date()
        from.setDate(to.getDate() - days)

        const fromIso = from.toISOString()
        const toIso = to.toISOString()

        // 1) Emotional logs + students + courses
        const { data: logs, error: logsError } = await supabase
            .from("emotional_logs")
            .select(
                `
        id,
        emotion,
        created_at,
        student:student_id (
          id,
          name,
          last_name,
          course:course_id ( id, name, section )
        )
      `
            )
            .eq("institution_id", institutionId)
            .eq("type", "daily")
            .gte("created_at", fromIso)
            .lte("created_at", toIso)

        if (logsError) {
            console.error("logsError", logsError)
            return { error: "No se pudieron cargar los registros emocionales." }
        }

        // 2) Incidents
        const { data: incidents, error: incidentsError } = await supabase
            .from("incidents")
            .select(
                `
        id,
        folio,
        type,
        severity,
        incident_date,
        student:student_id (
          id,
          name,
          last_name,
          course:course_id ( id, name, section )
        )
      `
            )
            .eq("institution_id", institutionId)
            .gte("incident_date", fromIso)
            .lte("incident_date", toIso)

        if (incidentsError) {
            console.error("incidentsError", incidentsError)
            return { error: "No se pudieron cargar los incidentes DEC." }
        }

        // 3) Activities
        const { data: activities, error: activitiesError } = await supabase
            .from("activities")
            .select("id, activity_type, title, start_datetime")
            .eq("institution_id", institutionId)
            .eq("active", true)
            .gte("start_datetime", fromIso)
            .lte("start_datetime", toIso)

        if (activitiesError) {
            console.error("activitiesError", activitiesError)
            return { error: "No se pudieron cargar las actividades." }
        }

        // ─────────────────────────────────────────────────────
        // EMOCIONES: distribución + cursos en riesgo
        // ─────────────────────────────────────────────────────

        const emotionDistributionMap: Record<string, number> = {}
        const courseAgg: Record<
            string,
            {
                course_name: string
                totalScore: number
                count: number
                students: Record<
                    string,
                    { name: string; totalScore: number; count: number }
                >
            }
        > = {}

        for (const log of logs ?? []) {
            const emotion = log.emotion as string
            emotionDistributionMap[emotion] =
                (emotionDistributionMap[emotion] ?? 0) + 1

            const student = (log as any).student
            if (!student) continue
            const course = student.course
            if (!course) continue

            const courseId = course.id as string
            const courseName =
                (course.name as string) +
                (course.section ? ` ${course.section}` : "")

            const score = EMOTION_SCORE[emotion] ?? 3

            if (!courseAgg[courseId]) {
                courseAgg[courseId] = {
                    course_name: courseName,
                    totalScore: 0,
                    count: 0,
                    students: {},
                }
            }

            courseAgg[courseId].totalScore += score
            courseAgg[courseId].count += 1

            const studentId = student.id as string
            const studentName = `${student.name ?? ""} ${student.last_name ?? ""}`.trim()

            if (!courseAgg[courseId].students[studentId]) {
                courseAgg[courseId].students[studentId] = {
                    name: studentName || "Sin nombre",
                    totalScore: 0,
                    count: 0,
                }
            }
            courseAgg[courseId].students[studentId].totalScore += score
            courseAgg[courseId].students[studentId].count += 1
        }

        const emotionDistribution = Object.entries(emotionDistributionMap).map(
            ([emotion, count]) => ({ emotion, count })
        )

        const courseRisks: CourseRisk[] = Object.entries(courseAgg)
            .map(([course_id, info]) => {
                const avg_score = info.count > 0 ? info.totalScore / info.count : 0
                const low_students = Object.entries(info.students)
                    .map(([student_id, s]) => ({
                        student_id,
                        name: s.name,
                        avg_score: s.count > 0 ? s.totalScore / s.count : 0,
                    }))
                    .sort((a, b) => a.avg_score - b.avg_score)
                    .slice(0, 3)

                return {
                    course_id,
                    course_name: info.course_name,
                    avg_score,
                    low_students,
                }
            })
            .filter((c) => c.avg_score > 0 && c.avg_score < LOW_RISK_THRESHOLD)
            .sort((a, b) => a.avg_score - b.avg_score)

        // ─────────────────────────────────────────────────────
        // INCIDENTES: por mes, severidad, tipo, recientes
        // ─────────────────────────────────────────────────────

        const incidentsByMonthMap: Record<string, number> = {}
        const incidentsBySeverityMap: Record<string, number> = {}
        const incidentsByTypeMap: Record<string, number> = {}

        for (const inc of incidents ?? []) {
            const d = new Date(inc.incident_date as string)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
                2,
                "0"
            )}`

            incidentsByMonthMap[key] = (incidentsByMonthMap[key] ?? 0) + 1

            const severity = inc.severity as string
            incidentsBySeverityMap[severity] =
                (incidentsBySeverityMap[severity] ?? 0) + 1

            const type = inc.type as string
            incidentsByTypeMap[type] = (incidentsByTypeMap[type] ?? 0) + 1
        }

        const byMonth: IncidentByMonth[] = Object.entries(incidentsByMonthMap)
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([month, count]) => ({ month, count }))

        const bySeverity: CountByLabel[] = Object.entries(incidentsBySeverityMap).map(
            ([label, count]) => ({ label, count })
        )

        const byType: CountByLabel[] = Object.entries(incidentsByTypeMap).map(
            ([label, count]) => ({ label, count })
        )

        const recent = (incidents ?? [])
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.incident_date as string).getTime() -
                    new Date(a.incident_date as string).getTime()
            )
            .slice(0, 5)
            .map((inc) => {
                const s = (inc as any).student
                const student_name = s
                    ? `${s.name ?? ""} ${s.last_name ?? ""}`.trim() || "Sin nombre"
                    : "No asignado"

                const course = s?.course
                const course_name = course
                    ? `${course.name}${course.section ? ` ${course.section}` : ""}`
                    : null

                return {
                    id: inc.id as string,
                    folio: inc.folio as string | null,
                    type: inc.type as string,
                    severity: inc.severity as string,
                    student_name,
                    course_name,
                    incident_date: inc.incident_date as string,
                }
            })

        // ─────────────────────────────────────────────────────
        // ACTIVIDADES: por mes, tipo
        // ─────────────────────────────────────────────────────

        const activitiesByMonthMap: Record<string, number> = {}
        const activitiesByTypeMap: Record<string, number> = {}

        for (const act of activities ?? []) {
            const d = new Date(act.start_datetime as string)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
                2,
                "0"
            )}`

            activitiesByMonthMap[key] = (activitiesByMonthMap[key] ?? 0) + 1

            const type = (act.activity_type as string) || "otro"
            activitiesByTypeMap[type] = (activitiesByTypeMap[type] ?? 0) + 1
        }

        const activitiesByMonth: ActivitiesByMonth[] = Object.entries(
            activitiesByMonthMap
        )
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([month, count]) => ({ month, count }))

        const activitiesByType: CountByLabel[] = Object.entries(
            activitiesByTypeMap
        ).map(([label, count]) => ({ label, count }))

        const activitiesRecent = (activities ?? [])
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.start_datetime as string).getTime() -
                    new Date(a.start_datetime as string).getTime()
            )
            .slice(0, 5)
            .map((act) => ({
                id: act.id as string,
                title: (act as any).title || "Actividad sin título",
                start_datetime: act.start_datetime as string,
            }))

        // ─────────────────────────────────────────────────────
        // SUMMARY
        // ─────────────────────────────────────────────────────

        const summary = {
            total_emotion_logs: logs?.length ?? 0,
            total_incidents: incidents?.length ?? 0,
            total_activities: activities?.length ?? 0,
            low_emotion_courses: courseRisks.length,
        }

        const data: DashboardData = {
            summary,
            emotionDistribution,
            courseRisks,
            incidents: {
                byMonth,
                bySeverity,
                byType,
                recent,
            },
            activities: {
                byMonth: activitiesByMonth,
                byType: activitiesByType,
                recent: activitiesRecent,
            },
        }

        return { data }
    } catch (e) {
        console.error(e)
        return { error: "Error inesperado al cargar las estadísticas." }
    }
}
