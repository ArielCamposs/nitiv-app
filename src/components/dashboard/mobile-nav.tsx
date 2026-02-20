"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SidebarContent } from "@/components/dashboard/sidebar"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

export function MobileNav({ userId }: { userId: string }) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()

    // Close sheet on route change
    useEffect(() => {
        setOpen(false)
    }, [pathname])

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-6">
                <SheetHeader>
                    <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                </SheetHeader>
                <SidebarContent userId={userId} showBell={false} />
            </SheetContent>
        </Sheet>
    )
}
