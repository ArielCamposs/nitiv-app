import { Sidebar } from "@/components/dashboard/sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { NotificationBell } from "@/components/layout/notification-bell"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect("/login")

    return (
        <div className="min-h-screen bg-white">
            <Sidebar userId={user.id} />
            <div className="fixed left-0 top-0 z-10 flex w-full items-center border-b bg-white px-4 py-2 md:hidden justify-between">
                <div className="flex items-center">
                    <MobileNav userId={user.id} />
                    <span className="ml-2 font-bold text-primary">Nitiv</span>
                </div>
                <NotificationBell userId={user.id} />
            </div>

            {/* 
                Left margin matches sidebar width on desktop.
                On mobile, add top padding to account for fixed navbar.
            */}
            <main className="min-h-screen pt-14 md:ml-64 md:pt-0">
                {children}
            </main>
        </div>
    )
}
