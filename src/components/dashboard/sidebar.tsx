"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Home, LogOut, ShoppingBag, ThermometerSun, Users, LifeBuoy, Shield, BarChart3, FileText, MessageSquare } from "lucide-react"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import { DecBadge } from "@/components/dashboard/dec-badge"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import { NotificationBell } from "@/components/layout/notification-bell"

export function SidebarContent({ userId, showBell = true }: { userId: string, showBell?: boolean }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const { totalUnread } = useUnreadCount(userId)

    // Intenta deducir el rol inicial desde la URL para evitar parpadeos
    // Esto funciona solo si el usuario está en su dashboard principal (ej: /docente/...)
    // Si está en /dec, dependerá del fetch
    // const initialRole = pathname.split('/')[1]

    useEffect(() => {
        const getRole = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: profile } = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", user.id)
                    .single()

                if (profile) {
                    setRole(profile.role)
                }
            } catch (error) {
                console.error("Error fetching role:", error)
            } finally {
                setLoading(false)
            }
        }
        getRole()
    }, [])

    // Configuración de menús por rol
    const getSidebarItems = (currentRole: string | null) => {
        if (!currentRole) return []

        const items = []

        // 1. Dashboard Principal (Inicio)
        let homeHref = "/"
        switch (currentRole) {
            case "docente": homeHref = "/docente"; break;
            case "estudiante": homeHref = "/estudiante"; break;
            case "centro_alumnos": homeHref = "/estudiante"; break; // Asumimos mismo dash
            case "dupla": homeHref = "/dupla"; break;
            case "convivencia": homeHref = "/convivencia"; break;
            case "admin": homeHref = "/admin"; break;
            case "director": homeHref = "/director"; break;
            case "inspector": homeHref = "/inspector"; break;
            case "utp": homeHref = "/utp"; break;
            default: homeHref = "/"; break;
        }

        items.push({
            title: "Inicio",
            href: homeHref,
            icon: Home,
        })

        // 2. Items específicos por rol
        if (currentRole === "estudiante" || currentRole === "centro_alumnos") {
            items.push({
                title: "Tienda",
                href: "/estudiante/tienda",
                icon: ShoppingBag,
            })
        }

        if (currentRole === "docente") {
            items.push(
                {
                    title: "Clima de aula",
                    href: "/docente/clima",
                    icon: ThermometerSun,
                },
                {
                    title: "Estudiantes",
                    href: "/docente/estudiantes",
                    icon: Users,
                }
            )
        }

        /* 
           Nota: Para Dupla y Convivencia, "Inicio" apunta a su dashboard de alertas.
           No necesitamos duplicar el item de alertas si ya es su home, 
           pero si el usuario lo pidió explícitamente o para claridad, se puede dejar.
           Sin embargo, el usuario pidió FIX de duplicados en /dec.
           Mantendré la lógica simple: Inicio va al dashboard. 
           Si el dashboard ES la vista de alertas, está cubierto.
        */

        // 3. Módulos transversales (como DEC, para todos menos estudiantes)
        // DEC para Dupla y Director
        if (currentRole === "dupla" || currentRole === "director") {
            items.push({
                title: "Registro DEC",
                href: "/dupla/dec",
                icon: Shield,
                badge: true,
            })
        }
        // DEC para Convivencia
        else if (currentRole === "convivencia") {
            items.push({
                title: "Registro DEC",
                href: "/convivencia/dec",
                icon: Shield,
                badge: true,
            })
        }
        // DEC para otros roles (Docente, Inspector, UTP)
        else if (currentRole !== "estudiante" && currentRole !== "centro_alumnos") {
            items.push({
                title: "Registro DEC",
                href: "/dec",
                icon: Shield,
                badge: true,
            })
        }

        // 4. Módulo PAEC (para todos menos estudiantes)
        if (currentRole !== "estudiante" && currentRole !== "centro_alumnos") {
            items.push({
                title: "PAEC",
                href: "/paec",
                icon: LifeBuoy,
            })
        }

        // 5. Heatmap Institucional (Director, Dupla, Convivencia)
        if (["director", "dupla", "convivencia"].includes(currentRole)) {
            items.push({
                title: "Clima emocional",
                href: `/${currentRole}/heatmap`,
                icon: BarChart3,
            })
        }

        // 6. Chat interno (Todos menos estudiantes)
        if (currentRole !== "estudiante" && currentRole !== "centro_alumnos") {
            items.push({
                title: "Chat",
                href: "/chat",
                icon: MessageSquare,
                chatBadge: true,
            })
        }

        // 7. Reportes (Todos menos estudiantes)
        if (currentRole !== "estudiante" && currentRole !== "centro_alumnos") {
            items.push({
                title: "Reportes",
                href: "/reportes",
                icon: FileText,
            })
        }

        return items
    }

    const sidebarItems = getSidebarItems(role)

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            toast.error("Error al cerrar sesión")
            return
        }
        router.push("/login")
        router.refresh()
    }

    if (loading && !role) {
        // Renderizar un esqueleto o nada mientras carga para evitar saltos incorrectos
        // O renderizar un menú genérico seguro
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
            <div className="mb-8 flex items-center gap-2 px-2 justify-between">
                <span className="text-xl font-bold text-primary">Nitiv</span>
                {showBell && <NotificationBell userId={userId} />}
            </div>

            <nav className="flex-1 space-y-2">
                {sidebarItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900",
                            pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/')
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-500"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
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
            </nav>

            <div className="border-t pt-4">
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
