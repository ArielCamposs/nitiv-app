"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
    Home, LogOut, ShoppingBag, ThermometerSun, Users, LifeBuoy,
    Shield, BarChart3, FileText, MessageSquare, Activity, UserCircle,
    Calendar, BookOpen, Library, Zap, ClipboardList
} from "lucide-react"
import { useChatUnread } from "@/context/chat-unread-context"
import { DecBadge } from "@/components/dashboard/dec-badge"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { NotificationBell } from "@/components/layout/notification-bell"

// ─── Tipos ────────────────────────────────────────────────────────────────────
type NavItem = {
    title: string
    href: string
    icon: React.ElementType
    badge?: boolean
    chatBadge?: boolean
}

type NavGroup = {
    label: string
    items: NavItem[]
}

// ─── Función principal de grupos ──────────────────────────────────────────────
function getSidebarGroups(currentRole: string | null): NavGroup[] {
    if (!currentRole) return []

    // Resuelve el href del dashboard según rol
    const homeHref: Record<string, string> = {
        docente: "/docente",
        estudiante: "/estudiante",
        centro_alumnos: "/estudiante",
        dupla: "/dupla",
        convivencia: "/convivencia",
        admin: "/admin",
        director: "/director",
        inspector: "/inspector",
        utp: "/utp",
    }
    const dashHref = homeHref[currentRole] ?? "/"

    const isStudent = currentRole === "estudiante" || currentRole === "centro_alumnos"
    const isDocente = currentRole === "docente"
    const isGestion = ["dupla", "convivencia", "director", "admin", "inspector", "utp"].includes(currentRole)
    const hasDeepAccess = ["dupla", "convivencia", "director", "admin"].includes(currentRole)

    // ── Bloque 1: Centro de Acción ─────────────────────────────────────────────
    const centroAccion: NavItem[] = [
        { title: "Inicio", href: dashHref, icon: Home },
    ]

    if (isStudent) {
        centroAccion.push({ title: "Mi perfil", href: "/estudiante/perfil", icon: UserCircle })
    }

    if (isDocente) {
        centroAccion.push({ title: "Clima de aula", href: "/docente/clima", icon: ThermometerSun })
    }

    // ── Bloque 2: Gestión de Casos ─────────────────────────────────────────────
    const gestionCasos: NavItem[] = []

    if (isDocente) {
        gestionCasos.push({ title: "Estudiantes", href: "/docente/estudiantes", icon: Users })
    }

    if (isGestion || isDocente) {
        // Resuelve la ruta de DEC según rol
        const decHref =
            currentRole === "dupla" || currentRole === "director"
                ? "/dupla/dec"
                : currentRole === "convivencia"
                    ? "/convivencia/dec"
                    : "/dec"

        gestionCasos.push({ title: "Registro DEC", href: decHref, icon: Shield, badge: true })
        gestionCasos.push({ title: "PAEC", href: "/paec", icon: LifeBuoy })
        gestionCasos.push({ title: "Reg. Convivencia", href: "/registros-convivencia", icon: ClipboardList })
    }

    if (hasDeepAccess) {
        gestionCasos.push({
            title: "Clima emocional",
            href: `/${currentRole}/heatmap`,
            icon: Activity,
        })
        gestionCasos.push({ title: "Estudiantes", href: `/${currentRole}/estudiantes`, icon: Users })
    }

    if (currentRole === "director" || currentRole === "dupla") {
        gestionCasos.push({
            title: "Modo Pulso",
            href: `/${currentRole}/pulso`,
            icon: Zap,
        })
    }

    // ── Bloque 3: Biblioteca y Comunidad ──────────────────────────────────────
    const biblioteca: NavItem[] = []

    biblioteca.push({ title: "Actividades", href: isStudent ? "/estudiante/actividades" : "/actividades", icon: Calendar })
    biblioteca.push({ title: "Recursos", href: isStudent ? "/estudiante/recursos" : "/recursos", icon: BookOpen })
    biblioteca.push({ title: "Biblioteca Nitiv", href: "/biblioteca", icon: Library })

    if (isStudent) {
        biblioteca.push({ title: "Tienda", href: "/estudiante/tienda", icon: ShoppingBag })
    }

    if (!isStudent) {
        biblioteca.push({ title: "Chat", href: "/chat", icon: MessageSquare, chatBadge: true })
    }

    // ── Bloque 4: Análisis ────────────────────────────────────────────────────
    const analisis: NavItem[] = []

    if (isStudent) {
        analisis.push({ title: "Mi historial", href: "/estudiante/historial", icon: BarChart3 })
    }

    if (hasDeepAccess || currentRole === "utp") {
        analisis.push({ title: "Estadísticas", href: "/estadisticas", icon: BarChart3 })
    }

    if (!isStudent) {
        analisis.push({ title: "Reportes", href: "/reportes", icon: FileText })
    }

    // ── Armar grupos (omitir si está vacío) ───────────────────────────────────
    const groups: NavGroup[] = [
        { label: "Centro de Acción", items: centroAccion },
        ...(gestionCasos.length > 0 ? [{ label: "Gestión de Casos", items: gestionCasos }] : []),
        { label: "Biblioteca y Comunidad", items: biblioteca },
        ...(analisis.length > 0 ? [{ label: "Análisis", items: analisis }] : []),
    ]

    return groups
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function SidebarContent({ userId, showBell = true }: { userId: string; showBell?: boolean }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [role, setRole] = useState<string | null>(null)
    const [fullName, setFullName] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const { totalUnread } = useChatUnread()

    useEffect(() => {
        const getRole = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const { data: profile } = await supabase
                    .from("users")
                    .select("role, name, last_name")
                    .eq("id", user.id)
                    .single()
                if (profile) {
                    setRole(profile.role)
                    setFullName([profile.name, profile.last_name].filter(Boolean).join(" "))
                }
            } catch (error) {
                console.error("Error fetching role:", error)
            } finally {
                setLoading(false)
            }
        }
        getRole()
    }, [])

    const sidebarGroups = getSidebarGroups(role)

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) { toast.error("Error al cerrar sesión"); return }
        router.push("/login")
        router.refresh()
    }

    if (loading && !role) {
        return (
            <div className="flex h-full flex-col p-6 border-r bg-slate-50/50">
                <div className="mb-8 flex items-center gap-2 px-2">
                    <span className="text-xl font-bold text-slate-300">Cargando...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col">
            {/* Logo + campana */}
            <div className="mb-6 flex items-center gap-2 px-2 justify-between">
                <span className="text-xl font-bold text-primary">Nitiv</span>
                {showBell && <NotificationBell userId={userId} />}
            </div>

            {/* Nav agrupado */}
            <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
                {sidebarGroups.map((group) => (
                    <div key={group.label}>
                        {/* Etiqueta del grupo */}
                        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                            {group.label}
                        </p>

                        {/* Items del grupo */}
                        <div className="space-y-0.5">
                            {group.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900",
                                        pathname === item.href ||
                                            (pathname.startsWith(item.href + "/") && item.href !== "/")
                                            ? "bg-slate-100 text-slate-900"
                                            : "text-slate-500"
                                    )}
                                >
                                    <item.icon className="h-4 w-4 shrink-0" />
                                    <span className="flex-1">{item.title}</span>
                                    {/* @ts-ignore */}
                                    {item.badge && <DecBadge />}
                                    {/* @ts-ignore */}
                                    {item.chatBadge && totalUnread > 0 && (
                                        <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                            {totalUnread > 9 ? "9+" : totalUnread}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Zona inferior: nombre + rol + emergencia + logout */}
            <div className="border-t pt-4 space-y-1">

                {/* Avatar con iniciales + nombre + rol */}
                {fullName && (
                    <div className="px-3 py-2 mb-2 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                                {fullName
                                    .split(" ")
                                    .slice(0, 2)
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                                {fullName}
                            </p>
                            <p className="text-xs text-slate-400">
                                {role === "docente" ? "Docente"
                                    : role === "dupla" ? "Dupla Psicosocial"
                                        : role === "convivencia" ? "Encargado de Convivencia"
                                            : role === "director" ? "Director"
                                                : role === "admin" ? "Administrador"
                                                    : role === "inspector" ? "Inspector"
                                                        : role === "utp" ? "UTP"
                                                            : role === "estudiante" ? "Estudiante"
                                                                : role === "centro_alumnos" ? "Centro de Alumnos"
                                                                    : role ?? ""}
                            </p>
                        </div>
                    </div>
                )}

                {(role === "estudiante" || role === "centro_alumnos") && (
                    <Link
                        href="/estudiante/ayuda"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                        <LifeBuoy className="h-4 w-4" />
                        <span>Necesito ayuda</span>
                    </Link>
                )}
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                </Button>
            </div>
        </div>
    )
}

export function Sidebar({ userId }: { userId: string }) {
    return (
        <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r bg-slate-50/50 p-6 md:flex md:flex-col">
            <SidebarContent userId={userId} />
        </aside>
    )
}
