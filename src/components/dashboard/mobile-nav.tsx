"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SidebarContent } from "@/components/dashboard/sidebar"
import { AdminSidebarContent } from "@/components/dashboard/admin-sidebar"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function MobileNav({ userId }: { userId: string }) {
    const [mounted, setMounted] = useState(false)
    const [open, setOpen] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const pathname = usePathname()
    const supabase = createClient()

    // Cerrar al cambiar de ruta
    useEffect(() => {
        setOpen(false)
    }, [pathname])

    useEffect(() => {
        setMounted(true)
    }, [])

    // Detectar si es admin
    useEffect(() => {
        const getRole = async () => {
            const { data: profile } = await supabase
                .from("users")
                .select("role")
                .eq("id", userId)
                .single()
            setIsAdmin(profile?.role === "admin")
        }
        getRole()
    }, [userId])

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="md:hidden" aria-hidden="true">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
            </Button>
        )
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="w-64 p-0 flex flex-col h-full overflow-hidden"
            >
                <SheetHeader className="sr-only">
                    <SheetTitle>Menú de navegación</SheetTitle>
                </SheetHeader>

                {/* Scroll interno — el padding va aquí adentro */}
                <div className="flex flex-col h-full overflow-y-auto p-6">
                    {isAdmin
                        ? <AdminSidebarContent userId={userId} showBell={false} />
                        : <SidebarContent userId={userId} showBell={false} />
                    }
                </div>
            </SheetContent>
        </Sheet>
    )
}
