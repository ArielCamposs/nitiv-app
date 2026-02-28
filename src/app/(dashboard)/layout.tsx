import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { AdminSidebar } from "@/components/dashboard/admin-sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { NotificationBell } from "@/components/layout/notification-bell"
import { DecBadgeProvider } from "@/context/dec-badge-context"
import { ChatUnreadProvider } from "@/context/chat-unread-context"
import { FloatingChat } from "@/components/chat/floating-chat"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect("/login")

    // Detectar si es admin para usar su sidebar propio
    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    const isAdmin = profile?.role === "admin"
    const isStudent = profile?.role === "estudiante" || profile?.role === "centro_alumnos"

    return (
        <DecBadgeProvider>
            <ChatUnreadProvider userId={user.id}>
                <div className="min-h-screen bg-white">
                    {/* Sidebar condicional */}
                    {isAdmin
                        ? <AdminSidebar userId={user.id} />
                        : <Sidebar userId={user.id} />
                    }

                    {/* Navbar mobile */}
                    <div className="fixed left-0 top-0 z-10 flex w-full items-center border-b bg-white px-4 py-2 md:hidden justify-between">
                        <div className="flex items-center">
                            <MobileNav userId={user.id} />
                            <span className="ml-2 font-bold text-primary">Nitiv</span>
                        </div>
                        <NotificationBell userId={user.id} />
                    </div>

                    <main className="min-h-screen pt-14 md:ml-64 md:pt-0">
                        {children}
                    </main>

                    {/* Chat flotante — solo para roles no estudiante */}
                    {!isStudent && <FloatingChat userId={user.id} />}
                </div>
            </ChatUnreadProvider>
        </DecBadgeProvider>
    )
}
