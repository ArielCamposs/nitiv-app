"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const TYPE_ICON: Record<string, string> = {
    dec_created: "🚨",
    paec_review: "📋",
    paec_signed: "✍️",
    alert: "⚠️",
    climate: "🌡️",
    default: "🔔",
}

function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return "ahora"
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
}

interface Props {
    userId: string
}

export function NotificationBell({ userId }: Props) {
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const { notifications, unreadCount, markAsRead, markAllAsRead } =
        useNotifications(userId)

    const handleClick = async (notif: typeof notifications[0]) => {
        if (!notif.read) await markAsRead(notif.id)
        if (notif.related_url) {
            setOpen(false)
            router.push(notif.related_url)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <Bell className="w-5 h-5 text-slate-600" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="w-80 p-0 shadow-lg border border-slate-200"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 text-sm">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <span className="bg-red-100 text-red-600 text-xs font-medium px-1.5 py-0.5 rounded-full">
                                {unreadCount} nuevas
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-slate-500 h-auto py-1 px-2"
                            onClick={markAllAsRead}
                        >
                            Marcar todas
                        </Button>
                    )}
                </div>

                {/* Lista */}
                <ScrollArea className="max-h-80">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                            <Bell className="w-8 h-8 opacity-30" />
                            <p className="text-sm">Sin notificaciones</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {notifications.map(notif => (
                                <button
                                    key={notif.id}
                                    onClick={() => handleClick(notif)}
                                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 ${!notif.read ? "bg-blue-50/40" : ""
                                        }`}
                                >
                                    <span className="text-xl shrink-0 mt-0.5">
                                        {TYPE_ICON[notif.type] ?? TYPE_ICON.default}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm leading-tight ${!notif.read ? "font-semibold text-slate-800" : "font-medium text-slate-600"}`}>
                                                {notif.title}
                                            </p>
                                            <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                                                {timeAgo(notif.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                            {notif.message}
                                        </p>
                                    </div>
                                    {!notif.read && (
                                        <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
