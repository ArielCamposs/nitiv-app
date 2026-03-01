"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Pencil, UserX, UserCheck, Search, Users, Eye, EyeOff, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatPhone } from "@/lib/formatters"
import { logAdminAction } from "@/lib/admin/log-action"
import {
    AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
    AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"

const ROLES = [
    { value: "director", label: "Director" },
    { value: "inspector", label: "Inspector" },
    { value: "utp", label: "UTP" },
    { value: "convivencia", label: "Convivencia" },
    { value: "dupla", label: "Dupla" },
    { value: "docente", label: "Docente" },
]

const ROLE_BADGE: Record<string, string> = {
    director: "bg-purple-50 text-purple-700 border-purple-200",
    inspector: "bg-blue-50 text-blue-700 border-blue-200",
    utp: "bg-indigo-50 text-indigo-700 border-indigo-200",
    convivencia: "bg-green-50 text-green-700 border-green-200",
    dupla: "bg-teal-50 text-teal-700 border-teal-200",
    docente: "bg-slate-50 text-slate-700 border-slate-200",
}

interface User {
    id: string; name: string; last_name: string | null
    email: string; role: string; phone: string | null
    active: boolean; created_at: string
}

interface UserFormState {
    id?: string
    name: string; last_name: string; email: string
    password: string; role: string; phone: string
}

const EMPTY_FORM: UserFormState = {
    name: "", last_name: "", email: "",
    password: "", role: "docente", phone: "+56 9 ",
}

export function UsersClient({ users: initial, institutionId }: {
    users: User[]; institutionId: string
}) {
    const [users, setUsers] = useState<User[]>(initial)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState<UserFormState>(EMPTY_FORM)
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [roleFilter, setRoleFilter] = useState("todos")

    const [resetUserId, setResetUserId] = useState<string | null>(null)
    const [resetUserName, setResetUserName] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [showPass, setShowPass] = useState(false)
    const [resetting, setResetting] = useState(false)
    // Confirmaciones
    const [confirmToggle, setConfirmToggle] = useState<User | null>(null)
    const [showEditConfirm, setShowEditConfirm] = useState(false)

    const isEdit = !!form.id

    const filtered = users.filter(u => {
        const matchName = `${u.name} ${u.last_name ?? ""}`.toLowerCase().includes(search.toLowerCase())
            || u.email.toLowerCase().includes(search.toLowerCase())
        const matchRole = roleFilter === "todos" || u.role === roleFilter
        return matchName && matchRole
    })

    const openCreate = () => { setForm(EMPTY_FORM); setShowForm(true) }
    const openEdit = (u: User) => {
        setForm({
            id: u.id, name: u.name, last_name: u.last_name ?? "",
            email: u.email, password: "", role: u.role, phone: u.phone ? formatPhone(u.phone) : "+56 9 ",
        })
        setShowForm(true)
    }

    const handleSaveClick = () => {
        if (!form.name.trim() || !form.email.trim() || !form.role) {
            toast.warning("Completa los campos obligatorios.")
            return
        }
        if (!isEdit && form.password.length < 8) {
            toast.warning("La contraseña debe tener al menos 8 caracteres.")
            return
        }
        if (isEdit) {
            setShowEditConfirm(true)
        } else {
            handleSubmit()
        }
    }

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.role) return
        if (!isEdit && form.password.length < 8) return

        setLoading(true)
        try {
            if (isEdit) {
                const prevUser = users.find(u => u.id === form.id)
                const res = await fetch("/api/admin/create-user", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: form.id,
                        name: form.name.trim(),
                        last_name: form.last_name.trim() || null,
                        role: form.role,
                        phone: form.phone.trim() === "+56 9" ? null : (form.phone.trim() || null),
                        active: true,
                    }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
                setUsers(prev => prev.map(u => u.id === form.id ? { ...u, ...data.user } : u))
                await logAdminAction({
                    action: "edit_user",
                    entityType: "user",
                    entityId: form.id!,
                    entityDescription: `${form.name.trim()} ${form.last_name.trim()}`.trim(),
                    beforeData: prevUser ? { name: prevUser.name, last_name: prevUser.last_name, role: prevUser.role, phone: prevUser.phone } : undefined,
                    afterData: { name: form.name.trim(), last_name: form.last_name.trim() || null, role: form.role, phone: form.phone.trim() === "+56 9" ? null : (form.phone.trim() || null) },
                })
                toast.success("Usuario actualizado.")
            } else {
                const res = await fetch("/api/admin/create-user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: form.email.trim(),
                        password: form.password,
                        name: form.name.trim(),
                        last_name: form.last_name.trim() || null,
                        role: form.role,
                        phone: form.phone.trim() === "+56 9" ? null : (form.phone.trim() || null),
                    }),
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error)
                setUsers(prev => [data.user, ...prev])
                await logAdminAction({
                    action: "create_user",
                    entityType: "user",
                    entityId: data.user.id,
                    entityDescription: `${form.name.trim()} ${form.last_name.trim()}`.trim(),
                    afterData: { name: form.name.trim(), last_name: form.last_name.trim() || null, email: form.email.trim(), role: form.role },
                })
                toast.success("Usuario creado correctamente.")
            }
            setShowForm(false)
            setForm(EMPTY_FORM)
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al guardar usuario.")
        } finally {
            setLoading(false)
        }
    }

    const doToggleActive = async (u: User) => {
        const res = await fetch("/api/admin/create-user", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: u.id, name: u.name, last_name: u.last_name, role: u.role, active: !u.active }),
        })
        if (res.ok) {
            setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: !u.active } : x))
            await logAdminAction({
                action: "toggle_user_active",
                entityType: "user",
                entityId: u.id,
                entityDescription: `${u.name} ${u.last_name ?? ""}`.trim(),
                beforeData: { active: u.active },
                afterData: { active: !u.active },
            })
            toast.success(u.active ? "Usuario desactivado." : "Usuario activado.")
        }
        setConfirmToggle(null)
    }

    const handleReset = async () => {
        if (newPassword.length < 8) {
            toast.warning("La contraseña debe tener al menos 8 caracteres.")
            return
        }
        setResetting(true)
        try {
            const res = await fetch("/api/admin/reset-password-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: resetUserId, newPassword }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            await logAdminAction({
                action: "reset_user_password",
                entityType: "user",
                entityId: resetUserId!,
                entityDescription: resetUserName,
            })
            toast.success(`Contraseña actualizada para ${resetUserName}.`)
            setResetUserId(null)
            setNewPassword("")
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Error al cambiar contraseña.")
        } finally {
            setResetting(false)
        }
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Usuarios staff</h1>
                        <p className="text-sm text-slate-500 mt-0.5">{users.filter(u => u.active).length} activos</p>
                    </div>
                    <Button onClick={openCreate} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4" /> Nuevo usuario
                    </Button>
                </div>

                {/* Filtros */}
                <div className="flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o email..."
                            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                    </div>
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                        <option value="todos">Todos los roles</option>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    {filtered.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No hay usuarios que coincidan</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[600px]">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rol</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filtered.map(u => (
                                        <tr key={u.id} className={cn("hover:bg-slate-50/50 transition-colors", !u.active && "opacity-50")}>
                                            <td className="px-5 py-3.5">
                                                <p className="font-medium text-slate-800">{u.name} {u.last_name ?? ""}</p>
                                                {u.phone && <p className="text-xs text-slate-400">{u.phone}</p>}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 hidden md:table-cell">{u.email}</td>
                                            <td className="px-4 py-3.5">
                                                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", ROLE_BADGE[u.role] ?? ROLE_BADGE.docente)}>
                                                    {ROLES.find(r => r.value === u.role)?.label ?? u.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={cn(
                                                    "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                                                    u.active
                                                        ? "bg-green-50 text-green-700 border-green-200"
                                                        : "bg-slate-50 text-slate-500 border-slate-200"
                                                )}>
                                                    {u.active ? "Activo" : "Inactivo"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-1 justify-end">
                                                    <button onClick={() => openEdit(u)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setResetUserId(u.id)
                                                            setResetUserName(`${u.name} ${u.last_name ?? ""}`)
                                                            setNewPassword("")
                                                            setShowPass(false)
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <KeyRound className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button onClick={() => setConfirmToggle(u)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                                        {u.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal formulario */}
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
                            <h2 className="text-base font-semibold text-slate-900">
                                {isEdit ? "Editar usuario" : "Nuevo usuario"}
                            </h2>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">Nombre *</label>
                                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Juan"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">Apellido</label>
                                    <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                                        placeholder="Pérez"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                </div>
                            </div>

                            {!isEdit && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">Email *</label>
                                    <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                        type="email" placeholder="juan@colegio.cl"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                </div>
                            )}

                            {!isEdit && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">Contraseña * (mín. 8 caracteres)</label>
                                    <input value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                        type="password" placeholder="••••••••"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">Rol *</label>
                                    <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">Teléfono</label>
                                    <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                                        placeholder="+56 9 1234 5678"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
                                <Button size="sm" onClick={handleSaveClick} disabled={loading}
                                    className="bg-indigo-600 hover:bg-indigo-700">
                                    {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear usuario"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal cambiar contraseña */}
                {resetUserId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">Cambiar contraseña</h2>
                                <p className="text-sm text-slate-500 mt-0.5">{resetUserName}</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700">
                                    Nueva contraseña <span className="text-slate-400">(mín. 8 caracteres)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPass ? "text" : "password"}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Nueva contraseña"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Indicador de fuerza */}
                            {newPassword.length > 0 && (
                                <div className="space-y-1">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${newPassword.length >= i * 3
                                                ? i <= 1 ? "bg-rose-400"
                                                    : i <= 2 ? "bg-amber-400"
                                                        : i <= 3 ? "bg-indigo-400"
                                                            : "bg-emerald-400"
                                                : "bg-slate-100"
                                                }`} />
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400">
                                        {newPassword.length < 8 ? "Muy corta"
                                            : newPassword.length < 10 ? "Aceptable"
                                                : newPassword.length < 13 ? "Buena"
                                                    : "Excelente"}
                                    </p>
                                </div>
                            )}

                            <p className="text-[11px] text-slate-400">
                                Comparte la nueva contraseña con el usuario directamente.
                            </p>

                            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                                <Button
                                    variant="ghost" size="sm"
                                    onClick={() => { setResetUserId(null); setNewPassword("") }}
                                    disabled={resetting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleReset}
                                    disabled={resetting || newPassword.length < 8}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {resetting ? "Cambiando..." : "Cambiar contraseña"}
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
                            <strong>{form.name} {form.last_name}</strong>?
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
                            {confirmToggle?.active ? "Desactivar usuario" : "Activar usuario"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas{" "}
                            {confirmToggle?.active ? "desactivar" : "activar"} a{" "}
                            <strong>{confirmToggle?.name} {confirmToggle?.last_name ?? ""}</strong>?
                            {confirmToggle?.active && " El usuario no podrá iniciar sesión."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmToggle && doToggleActive(confirmToggle)}
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
