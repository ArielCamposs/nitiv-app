export interface StatisticsSummary {
    studentsAtRisk: number
    coursesAtRisk: number
    totalIncidents: number
    averageAttendance: number
    averageGrade: number
}

export interface CourseRisk {
    courseName: string
    studentsAtRisk: number
    averageGrade: number
    averageAttendance: number
}

export interface Incident {
    type: string
    studentName: string
    createdAt: string
    status: string
}

export interface Activity {
    description: string
    userName: string
    timestamp: string
}
