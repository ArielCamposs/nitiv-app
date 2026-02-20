"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
    paec: any
    students: any[]
    professionals: any[]
    courses: any[]
}

export function PaecEditForm({ paec, students, professionals, courses }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    // Estados del formulario
    const [formData, setFormData] = useState({
        student_id: paec.student_id,
        strengths: paec.strengths || "",
        weaknesses: paec.weaknesses || "",
        medical_diagnosis: paec.medical_diagnosis || "",
        family_context: paec.family_context || "",
        objectives: paec.objectives || "",
        strategies_preventive: paec.strategies_preventive || "",
        strategies_reactive: paec.strategies_reactive || "",
        evaluation_indicators: paec.evaluation_indicators || "",
        guardian_name: paec.guardian_name || "",
        guardian_contact: paec.guardian_contact || "",
        professional_1_id: paec.professional_1_id || "",
        professional_2_id: paec.professional_2_id || "",
        professional_3_id: paec.professional_3_id || "",
    })

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        if (!formData.student_id) {
            toast.error("Debes seleccionar un estudiante")
            return
        }

        setLoading(true)
        const { error } = await supabase
            .from("paec")
            .update({
                ...formData,
                updated_at: new Date().toISOString(),
                // Resetear firmas al editar (opcional, depende de la lógica de negocio)
                representative_signed: false,
                guardian_signed: false,
                representative_signed_at: null,
                guardian_signed_at: null,
            })
            .eq("id", paec.id)

        if (error) {
            toast.error("Error al actualizar PAEC")
            console.error(error)
        } else {
            toast.success("PAEC actualizado correctamente")
            router.push(`/paec/${paec.id}`)
            router.refresh()
        }
        setLoading(false)
    }

    // Helpers
    const getCurseName = (studentId: string) => {
        const student = students.find((s) => s.id === studentId)
        if (!student) return "Sin curso"
        const course = courses.find((c) => c.id === student.course_id)
        return course ? course.name : "Sin curso"
    }

    const calcularEdad = (fechaNacimiento: string) => {
        if (!fechaNacimiento) return "N/A"
        const hoy = new Date()
        const nacimiento = new Date(fechaNacimiento)
        let edad = hoy.getFullYear() - nacimiento.getFullYear()
        const mes = hoy.getMonth() - nacimiento.getMonth()
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--
        }
        return edad
    }

    const selectedStudent = students.find((s) => s.id === formData.student_id)

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Editar PAEC</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* 1. Identificación del Estudiante (Solo lectura o cambio limitado) */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Estudiante</label>
                            <Select
                                value={formData.student_id}
                                onValueChange={(val) => handleChange("student_id", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar estudiante" />
                                </SelectTrigger>
                                <SelectContent position="popper" className="z-50">
                                    {students.map((student) => (
                                        <SelectItem key={student.id} value={student.id}>
                                            {student.last_name}, {student.name} ({student.rut})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedStudent && (
                            <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Curso</p>
                                    <p className="font-medium">{getCurseName(selectedStudent.id)}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Edad</p>
                                    <p className="font-medium">{calcularEdad(selectedStudent.birthdate)} años</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Antecedentes del Apoderado */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre Apoderado/a</label>
                            <Input
                                value={formData.guardian_name}
                                onChange={(e) => handleChange("guardian_name", e.target.value)}
                                placeholder="Nombre completo"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Teléfono / Contacto</label>
                            <Input
                                value={formData.guardian_contact}
                                onChange={(e) => handleChange("guardian_contact", e.target.value)}
                                placeholder="+569..."
                            />
                        </div>
                    </div>

                    {/* 3. Profesionales Responsables */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-slate-900">Profesionales Responsables</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            {[1, 2, 3].map((num) => (
                                <div key={num} className="space-y-2">
                                    <label className="text-sm font-medium">Profesional {num}</label>
                                    <Select
                                        value={formData[`professional_${num}_id` as keyof typeof formData]}
                                        onValueChange={(val) => handleChange(`professional_${num}_id`, val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent position="popper" className="z-50">
                                            {professionals.map((pro) => (
                                                <SelectItem key={pro.id} value={pro.id}>
                                                    {pro.name} {pro.last_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. Diagnóstico y Contexto */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Habilidades / Fortalezas</label>
                            <Textarea
                                value={formData.strengths}
                                onChange={(e) => handleChange("strengths", e.target.value)}
                                placeholder="Describe las fortalezas del estudiante..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Dificultades / Desafíos</label>
                            <Textarea
                                value={formData.weaknesses}
                                onChange={(e) => handleChange("weaknesses", e.target.value)}
                                placeholder="Describe las dificultades observadas..."
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Diagnóstico Médico (si existe)</label>
                            <Input
                                value={formData.medical_diagnosis}
                                onChange={(e) => handleChange("medical_diagnosis", e.target.value)}
                                placeholder="Ej: TDAH, TEA, etc."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Contexto Familiar Relevante</label>
                            <Textarea
                                value={formData.family_context}
                                onChange={(e) => handleChange("family_context", e.target.value)}
                                placeholder="Antecedentes familiares importantes..."
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* 5. Planificación */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Objetivos Transversales</label>
                            <Textarea
                                value={formData.objectives}
                                onChange={(e) => handleChange("objectives", e.target.value)}
                                placeholder="Objetivos a trabajar..."
                                rows={4}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Estrategias Preventivas</label>
                                <Textarea
                                    value={formData.strategies_preventive}
                                    onChange={(e) => handleChange("strategies_preventive", e.target.value)}
                                    placeholder="Acciones para evitar la desregulación..."
                                    rows={6}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Estrategias Reactivas</label>
                                <Textarea
                                    value={formData.strategies_reactive}
                                    onChange={(e) => handleChange("strategies_reactive", e.target.value)}
                                    placeholder="Acciones durante la desregulación..."
                                    rows={6}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Indicadores de Evaluación</label>
                            <Textarea
                                value={formData.evaluation_indicators}
                                onChange={(e) => handleChange("evaluation_indicators", e.target.value)}
                                placeholder="Cómo se evaluará el progreso..."
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    )
}
