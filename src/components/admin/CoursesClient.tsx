"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Plus, Pencil, BookOpen, Users, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { logAdminAction } from "@/lib/admin/log-action"
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"

interface Course { id: string; name: string; level: string; section: string | null; year: number; active: boolean }
interface Teacher { id: string; name: string; last_name: string | null; role: string }
interface Assignment { course_id: string; teacher_id: string }
interface Student { id: string; name: string; last_name: string; course_id: string | null }

const LEVELS = ["Pre-Kínder", "Kínder", "1°", "2°", "3°", "4°", "5°", "6°", "7°", "8°", "I°", "II°", "III°", "IV°"]
const CURRENT_YEAR = new Date().getFullYear()

const EMPTY_FORM = {
    id: "", name: "", level: "1°", section: "", year: String(CURRENT_YEAR),
}

export function CoursesClient({ courses: initial, teachers, assignments: initialAssignments, studentCountMap, students: initialStudents, institutionId }: {
    courses: Course[]
    teachers: Teacher[]
    assignments: Assignment[]
    studentCountMap: Record<string, number>
    students: Student[]
    institutionId: string
}) {
    const supabase = createClient()
    const [courses, setCourses] = useState<Course[]>(initial)
    const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
    const [students, setStudents] = useState<Student[]>(initialStudents)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [loading, setLoading] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Confirmaciones
    const [confirmToggle, setConfirmToggle] = useState<Course | null>(null)
    const [showEditConfirm, setShowEditConfirm] = useState(false)

    const isEdit = !!form.id

    const getTeachersForCourse = (courseId: string) =>
        assignments
            .filter(a => a.course_id === courseId)
            .map(a => teachers.find(t => t.id === a.teacher_id))
            .filter(Boolean) as Teacher[]

    const openCreate = () => { setForm(EMPTY_FORM); setShowForm(true) }
    const openEdit = (c: Course) => {
        setForm({ id: c.id, name: c.name, level: c.level, section: c.section ?? "", year: String(c.year) })
        setShowForm(true)
    }

    const handleSaveClick = () => {
        if (!form.name.trim() || !form.level) {
            toast.warning("Nombre y nivel son obligatorios.")
            return
        }
        if (isEdit) {
            setShowEditConfirm(true)
        } else {
            handleSubmit()
        }
    }

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.level) return
        setLoading(true)
        try {
            const payload = {
                name: form.name.trim(),
                level: form.level,
                section: form.section.trim() || null,
                year: parseInt(form.year),
            }

            if (isEdit) {
                const prevCourse = courses.find(c => c.id === form.id)
                const { data, error } = await supabase
                    .from("courses").update(payload).eq("id", form.id)
                    .select("id, name, level, section, year, active").single()
                if (error) throw error
                setCourses(prev => prev.map(c => c.id === form.id ? data : c))
                await logAdminAction({
                    action: "edit_course",
                    entityType: "course",
                    entityId: form.id,
                    entityDescription: `${form.name.trim()}${form.section.trim() ? ` ${form.section.trim()}` : ""}`,
                    beforeData: prevCourse ? { name: prevCourse.name, level: prevCourse.level, section: prevCourse.section, year: prevCourse.year } : undefined,
                    afterData: payload,
                })
                toast.success("Curso actualizado.")
            } else {
                const { data, error } = await supabase
                    .from("courses")
                    .insert({ ...payload, institution_id: institutionId, active: true })
                    .select("id, name, level, section, year, active").single()
                if (error) throw error
                setCourses(prev => [...prev, data])
                await logAdminAction({
                    action: "create_course",
                    entityType: "course",
                    entityId: data.id,
                    entityDescription: `${form.name.trim()}${form.section.trim() ? ` ${form.section.trim()}` : ""}`,
                    afterData: payload,
                })
                toast.success("Curso creado.")
            }
            setShowForm(false)
            setForm(EMPTY_FORM)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al guardar.")
        } finally {
            setLoading(false)
        }
    }

    const toggleActive = async (c: Course) => {
        const { error } = await supabase
            .from("courses").update({ active: !c.active }).eq("id", c.id)
        if (!error) {
            setCourses(prev => prev.map(x => x.id === c.id ? { ...x, active: !c.active } : x))
            await logAdminAction({
                action: "toggle_course_active",
                entityType: "course",
                entityId: c.id,
                entityDescription: `${c.name}${c.section ? ` ${c.section}` : ""}`,
                beforeData: { active: c.active },
                afterData: { active: !c.active },
            })
            toast.success(c.active ? "Curso desactivado." : "Curso activado.")
        }
        setConfirmToggle(null)
    }

    const assignTeacher = async (courseId: string, teacherId: string) => {
        const alreadyAssigned = assignments.some(a => a.course_id === courseId && a.teacher_id === teacherId)
        if (alreadyAssigned) return

        const { error } = await supabase
            .from("course_teachers").insert({ course_id: courseId, teacher_id: teacherId })
        if (!error) {
            setAssignments(prev => [...prev, { course_id: courseId, teacher_id: teacherId }])
            const teacher = teachers.find(t => t.id === teacherId)
            const course = courses.find(c => c.id === courseId)
            await logAdminAction({
                action: "assign_teacher_to_course",
                entityType: "course",
                entityId: courseId,
                entityDescription: `${course?.name ?? courseId} → ${teacher?.name ?? ""} ${teacher?.last_name ?? ""}`.trim(),
                afterData: { courseId, teacherId },
            })
            toast.success("Docente asignado.")
        } else {
            toast.error("No se pudo asignar.")
        }
    }

    const removeTeacher = async (courseId: string, teacherId: string) => {
        const { error } = await supabase
            .from("course_teachers")
            .delete()
            .eq("course_id", courseId)
            .eq("teacher_id", teacherId)
        if (!error) {
            setAssignments(prev => prev.filter(a => !(a.course_id === courseId && a.teacher_id === teacherId)))
            const teacher = teachers.find(t => t.id === teacherId)
            const course = courses.find(c => c.id === courseId)
            await logAdminAction({
                action: "remove_teacher_from_course",
                entityType: "course",
                entityId: courseId,
                entityDescription: `${course?.name ?? courseId} ‒ ${teacher?.name ?? ""} ${teacher?.last_name ?? ""}`.trim(),
                beforeData: { courseId, teacherId },
            })
            toast.success("Docente removido.")
        }
    }

    const getStudentsForCourse = (courseId: string) =>
        students.filter(s => s.course_id === courseId)

    const getUnassignedStudents = () =>
        students.filter(s => !s.course_id)

    const assignStudent = async (courseId: string, studentId: string) => {
        const { error } = await supabase
            .from("students")
            .update({ course_id: courseId })
            .eq("id", studentId)
        if (!error) {
            setStudents(prev => prev.map(s => s.id === studentId ? { ...s, course_id: courseId } : s))
            const student = students.find(s => s.id === studentId)
            const course = courses.find(c => c.id === courseId)
            await logAdminAction({
                action: "assign_student_to_course",
                entityType: "student",
                entityId: studentId,
                entityDescription: `${student?.last_name ?? ""}, ${student?.name ?? ""} → ${course?.name ?? ""}`.trim(),
                afterData: { studentId, courseId },
            })
            toast.success("Estudiante asignado al curso.")
        } else {
            toast.error("No se pudo asignar el estudiante.")
        }
    }

    const removeStudent = async (studentId: string) => {
        const student = students.find(s => s.id === studentId)
        const { error } = await supabase
            .from("students")
            .update({ course_id: null })
            .eq("id", studentId)
        if (!error) {
            setStudents(prev => prev.map(s => s.id === studentId ? { ...s, course_id: null } : s))
            await logAdminAction({
                action: "remove_student_from_course",
                entityType: "student",
                entityId: studentId,
                entityDescription: `${student?.last_name ?? ""}, ${student?.name ?? ""}`.trim(),
                beforeData: { studentId, courseId: student?.course_id },
            })
            toast.success("Estudiante removido del curso.")
        } else {
            toast.error("No se pudo remover el estudiante.")
        }
    }

    const activeCount = courses.filter(c => c.active).length

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Cursos</h1>
                        <p className="text-sm text-slate-500 mt-0.5">{activeCount} activos · {CURRENT_YEAR}</p>
                    </div>
                    <Button onClick={openCreate} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4" /> Nuevo curso
                    </Button>
                </div>

                {/* Lista */}
                <div className="space-y-3">
                    {courses.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
                            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm text-slate-500">No hay cursos creados aún</p>
                        </div>
                    ) : (
                        courses.map(c => {
                            const isExpanded = expandedId === c.id
                            const assignedTeachers = getTeachersForCourse(c.id)
                            const studentCount = studentCountMap[c.id] ?? 0
                            const unassigned = teachers.filter(t =>
                                !assignments.some(a => a.course_id === c.id && a.teacher_id === t.id)
                            )

                            return (
                                <div key={c.id} className={cn(
                                    "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden",
                                    !c.active && "opacity-50"
                                )}>
                                    {/* Header del curso */}
                                    <div className="flex items-center gap-4 px-5 py-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                            <BookOpen className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-900">
                                                {c.name}{c.section ? ` ${c.section}` : ""}
                                            </p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-xs text-slate-400">{c.level} · {c.year}</span>
                                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Users className="w-3 h-3" /> {studentCount} est.
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {assignedTeachers.length} docente{assignedTeachers.length !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                                                <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                                            </button>
                                            <button onClick={() => openEdit(c)}
                                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => setConfirmToggle(c)}
                                                className={cn(
                                                    "text-xs font-medium px-2 py-1 rounded-lg transition-colors",
                                                    c.active
                                                        ? "text-red-500 hover:bg-red-50"
                                                        : "text-green-600 hover:bg-green-50"
                                                )}>
                                                {c.active ? "Desactivar" : "Activar"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Detalle expandido */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50 space-y-5">

                                            {/* ── Docentes asignados ─────────────────────────────── */}
                                            <div>
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                                                    Docentes asignados
                                                </p>
                                                {assignedTeachers.length === 0 ? (
                                                    <p className="text-xs text-slate-400">Sin docentes asignados</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {assignedTeachers.map(t => (
                                                            <div key={t.id} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1">
                                                                <span className="text-xs font-medium text-slate-700">
                                                                    {t.name} {t.last_name ?? ""}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">({t.role})</span>
                                                                <button onClick={() => removeTeacher(c.id, t.id)}
                                                                    className="ml-1 p-0.5 rounded-full hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {unassigned.length > 0 && (
                                                    <select
                                                        defaultValue=""
                                                        onChange={e => { if (e.target.value) assignTeacher(c.id, e.target.value); e.target.value = "" }}
                                                        className="mt-2 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 max-w-xs"
                                                    >
                                                        <option value="" disabled>+ Asignar docente...</option>
                                                        {unassigned.map(t => (
                                                            <option key={t.id} value={t.id}>
                                                                {t.name} {t.last_name ?? ""} ({t.role})
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>

                                            {/* ── Estudiantes del curso ──────────────────────────── */}
                                            <div>
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                                                    Estudiantes ({getStudentsForCourse(c.id).length})
                                                </p>

                                                {getStudentsForCourse(c.id).length === 0 ? (
                                                    <p className="text-xs text-slate-400">Sin estudiantes en este curso</p>
                                                ) : (
                                                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                                        {getStudentsForCourse(c.id).map(s => (
                                                            <div key={s.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-3 py-1.5">
                                                                <span className="text-xs text-slate-700 font-medium">
                                                                    {s.last_name}, {s.name}
                                                                </span>
                                                                <button
                                                                    onClick={() => removeStudent(s.id)}
                                                                    className="p-0.5 rounded hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors"
                                                                    title="Quitar del curso"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Asignar estudiante sin curso */}
                                                {getUnassignedStudents().length > 0 && (
                                                    <select
                                                        defaultValue=""
                                                        onChange={e => { if (e.target.value) assignStudent(c.id, e.target.value); e.target.value = "" }}
                                                        className="mt-2 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 max-w-xs"
                                                    >
                                                        <option value="" disabled>+ Asignar estudiante sin curso...</option>
                                                        {getUnassignedStudents().map(s => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.last_name}, {s.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Modal formulario */}
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
                            <h2 className="text-base font-semibold text-slate-900">
                                {isEdit ? "Editar curso" : "Nuevo curso"}
                            </h2>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">Nombre del curso *</label>
                                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Ej: 3° A, Kínder B..."
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-700">Nivel *</label>
                                        <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200">
                                            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-700">Sección</label>
                                        <input value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))}
                                            placeholder="A, B, C..."
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">Año</label>
                                    <input value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                                        type="number" min="2020" max="2030"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
                                <Button size="sm" onClick={handleSaveClick} disabled={loading}
                                    className="bg-indigo-600 hover:bg-indigo-700">
                                    {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear curso"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmación edición */}
            <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar cambios</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas guardar los cambios de{" "}
                            <strong>{form.name} {form.section ?? ""}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => { setShowEditConfirm(false); handleSubmit() }}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Sí, guardar cambios
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirmación activar/desactivar */}
            <AlertDialog open={!!confirmToggle} onOpenChange={open => !open && setConfirmToggle(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmToggle?.active ? "Desactivar curso" : "Activar curso"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas{" "}
                            {confirmToggle?.active ? "desactivar" : "activar"} el curso{" "}
                            <strong>{confirmToggle?.name} {confirmToggle?.section ?? ""}</strong>?
                            {confirmToggle?.active && " El curso dejará de estar visible en listas."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmToggle && toggleActive(confirmToggle)}
                            className={confirmToggle?.active
                                ? "bg-rose-600 hover:bg-rose-700"
                                : "bg-emerald-600 hover:bg-emerald-700"}
                        >
                            {confirmToggle?.active ? "Sí, desactivar" : "Sí, activar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
